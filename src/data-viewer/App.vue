<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ArrowLeft, Download, Delete, Search, Refresh, DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import DBHelper from '../tools/demo/indexeddb/dbhelper.js'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import moment from 'moment'

const loading = ref(false)
const activeTool = ref('')
const searchKeyword = ref('')
const data = ref([])
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const stats = reactive({
  total: 0,
  today: 0,
  platforms: {}
})

const tools = [
  { id: 'xhs_comments', name: '小红书评论', icon: '红', color: 'berry' },
  { id: 'dy_comments', name: '抖音评论', icon: '抖', color: 'sunset' },
  { id: 'dy_video_list', name: '抖音视频列表', icon: '视', color: 'teal' }
]

const tableColumns = computed(() => {
  if (activeTool.value === 'xhs_comments') {
    return [
      { prop: 'displayIndex', label: '序号', width: 80 },
      { prop: 'nickname', label: '用户昵称', width: 120 },
      { prop: 'comment', label: '评论内容', minWidth: 200 },
      { prop: 'like_count', label: '点赞数', width: 100 },
      { prop: 'city', label: '城市', width: 100 },
      { prop: 'date', label: '评论时间', width: 160 }
    ]
  } else if (activeTool.value === 'dy_comments') {
    return [
      { prop: 'displayIndex', label: '序号', width: 80 },
      { prop: 'nickname', label: '用户昵称', width: 120 },
      { prop: 'comment', label: '评论内容', minWidth: 200 },
      { prop: 'like_count', label: '点赞数', width: 100 },
      { prop: 'city', label: '城市', width: 100 },
      { prop: 'date', label: '评论时间', width: 160 }
    ]
  } else if (activeTool.value === 'dy_video_list') {
    return [
      { prop: 'displayIndex', label: '序号', width: 80 },
      { prop: 'videoTitle', label: '视频标题', minWidth: 240 },
      { prop: 'videoLink', label: '视频链接', minWidth: 260 },
      { prop: 'likeCount', label: '点赞数', width: 100 },
      { prop: 'commentCount', label: '评论数', width: 100 },
      { prop: 'shareCount', label: '分享数', width: 100 },
      { prop: 'collectCount', label: '收藏数', width: 100 },
      { prop: 'authorNickname', label: '达人昵称', width: 120 },
      { prop: 'authorAvatar', label: '达人头像', minWidth: 220 },
      { prop: 'authorLink', label: '达人主页', minWidth: 240 },
      { prop: 'followerCount', label: '粉丝数', width: 100 },
      { prop: 'totalFavorited', label: '获赞数', width: 100 },
      { prop: 'keyword', label: '关键词', width: 140 },
      { prop: 'crawled_at', label: '采集时间', minWidth: 180 }
    ]
  }
  return []
})

const filteredData = computed(() => {
  if (!searchKeyword.value) return data.value
  const keyword = searchKeyword.value.toLowerCase()
  return data.value.filter(item =>
    item.nickname?.toLowerCase().includes(keyword) ||
    item.comment?.toLowerCase().includes(keyword) ||
    item.city?.toLowerCase().includes(keyword) ||
    item.videoTitle?.toLowerCase().includes(keyword) ||
    item.authorNickname?.toLowerCase().includes(keyword)
  )
})

let dbHelper = null

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const toolId = urlParams.get('tool')
  if (toolId) {
    activeTool.value = toolId
  }

  try {
    dbHelper = new DBHelper('toolsDB', 4, [
      {
        name: 'xhs_comments',
        keyPath: 'comment_id',
        autoIncrement: true,
        indexes: [
          { name: 'comment_id', keyPath: 'comment_id', options: { unique: true } },
          { name: 'crawl_type', keyPath: 'crawl_type', options: { unique: false } },
          { name: 'note_id', keyPath: 'note_id', options: { unique: false } },
          { name: 'keyword', keyPath: 'keyword', options: { unique: false } }
        ]
      },
      {
        name: 'dy_comments',
        keyPath: 'comment_id',
        autoIncrement: false,
        indexes: [
          { name: 'comment_id', keyPath: 'comment_id', options: { unique: true } },
          { name: 'crawl_type', keyPath: 'crawl_type', options: { unique: false } },
          { name: 'video_id', keyPath: 'video_id', options: { unique: false } },
          { name: 'keyword', keyPath: 'keyword', options: { unique: false } }
        ]
      },
      {
        name: 'dy_video_list',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'id', keyPath: 'id', options: { unique: true } },
          { name: 'keyword', keyPath: 'keyword', options: { unique: false } },
          { name: 'videoLink', keyPath: 'videoLink', options: { unique: false } },
          { name: 'crawled_at', keyPath: 'crawled_at', options: { unique: false } }
        ]
      }
    ])
    await dbHelper.init()
    await loadData()
  } catch (error) {
    console.error('初始化数据库失败:', error)
    ElMessage.error('数据库初始化失败')
  }
})

async function loadData() {
  if (!activeTool.value || !dbHelper) return

  loading.value = true
  try {
    const allData = await dbHelper.getAll(activeTool.value)
    data.value = allData.map((item, index) => ({
      ...item,
      displayIndex: index + 1
    }))

    stats.total = data.value.length
    const today = new Date().toDateString()
    stats.today = data.value.filter(item => {
      if (!item.crawled_at) return false
      return new Date(item.crawled_at).toDateString() === today
    }).length

  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleToolChange() {
  selectedRows.value = []
  searchKeyword.value = ''
  currentPage.value = 1
  loadData()
}

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch(searchKeyword, () => {
  currentPage.value = 1
})

watch(activeTool, () => {
  currentPage.value = 1
})

async function exportSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的数据')
    return
  }

  try {
    const headers = tableColumns.value.map(col => col.label)
    const rows = selectedRows.value.map(item =>
      tableColumns.value.map(col => item[col.prop] || '')
    )

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '数据导出')

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const toolName = tools.find(t => t.id === activeTool.value)?.name || '数据'
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `${toolName}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
    )

    ElMessage.success(`成功导出 ${selectedRows.value.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

async function exportAll() {
  if (filteredData.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    const headers = tableColumns.value.map(col => col.label)
    const rows = filteredData.value.map(item =>
      tableColumns.value.map(col => item[col.prop] || '')
    )

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '数据导出')

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const toolName = tools.find(t => t.id === activeTool.value)?.name || '数据'
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `${toolName}_全部_${moment().format('YYYYMMDDHHmmss')}.xlsx`
    )

    ElMessage.success(`成功导出 ${filteredData.value.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

async function deleteSelected() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条数据吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    for (const row of selectedRows.value) {
      if (activeTool.value === 'dy_video_list' && row.id) {
        await dbHelper.delete(activeTool.value, 'id', row.id)
      } else if (row.comment_id) {
        await dbHelper.delete(activeTool.value, 'comment_id', row.comment_id)
      }
    }

    ElMessage.success(`成功删除 ${selectedRows.value.length} 条数据`)
    selectedRows.value = []
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.close()
  }
}
</script>

<template>
  <div class="data-viewer-shell">
    <header class="data-viewer-hero reveal">
      <div class="data-viewer-hero__title">
        <p class="data-viewer-hero__eyebrow">Data Management</p>
        <h1>数据管理中心</h1>
        <span class="data-viewer-hero__desc">查看、管理和导出采集的数据</span>
      </div>
      <div class="data-viewer-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </header>

    <main class="data-viewer-content reveal">
      <div class="data-stats">
        <div class="data-stat-card">
          <div class="data-stat-card__value">{{ stats.total }}</div>
          <div class="data-stat-card__label">总数据量</div>
        </div>
        <div class="data-stat-card">
          <div class="data-stat-card__value">{{ stats.today }}</div>
          <div class="data-stat-card__label">今日采集</div>
        </div>
        <div class="data-stat-card">
          <div class="data-stat-card__value">{{ selectedRows.length }}</div>
          <div class="data-stat-card__label">已选择</div>
        </div>
      </div>

      <div class="data-toolbar">
        <div class="data-toolbar__left">
          <el-select
            v-model="activeTool"
            placeholder="选择数据源"
            @change="handleToolChange"
            style="width: 200px"
          >
            <el-option
              v-for="tool in tools"
              :key="tool.id"
              :label="tool.name"
              :value="tool.id"
            />
          </el-select>

          <el-input
            v-model="searchKeyword"
            placeholder="搜索..."
            :prefix-icon="Search"
            clearable
            style="width: 300px"
          />
        </div>

        <div class="data-toolbar__right">
          <el-button
            :icon="Download"
            @click="exportSelected"
            :disabled="selectedRows.length === 0"
          >
            导出选中 ({{ selectedRows.length }})
          </el-button>
          <el-button
            :icon="DocumentCopy"
            @click="exportAll"
            :disabled="filteredData.length === 0"
          >
            导出全部
          </el-button>
          <el-button
            :icon="Delete"
            type="danger"
            @click="deleteSelected"
            :disabled="selectedRows.length === 0"
          >
            删除选中
          </el-button>
        </div>
      </div>

      <div class="data-table-wrapper">
        <div class="data-table-scroll">
        <el-table
          :data="paginatedData"
          v-loading="loading"
          @selection-change="selectedRows = $event"
          stripe
          style="width: 100%"
          max-height="600"
          class="data-table"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column
            v-for="column in tableColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.width"
            :min-width="column.minWidth"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="column.prop === 'comment'" class="comment-text">
                {{ row[column.prop] }}
              </span>
              <span v-else>{{ row[column.prop] }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="copyToClipboard(row.comment || row.videoTitle || row.nickname)"
              >
                复制
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        </div>

        <div class="data-footer">
          <el-pagination
            background
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredData.length"
            :page-sizes="[20, 50, 100, 200]"
            :page-size="pageSize"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.data-viewer-shell {
  width: min(100%, 1400px);
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

.data-viewer-hero {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  backdrop-filter: blur(14px);
  box-shadow: var(--el-box-shadow);
}

.data-viewer-hero__title {
  display: grid;
  gap: 4px;
}

.data-viewer-hero__eyebrow {
  margin: 0;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.data-viewer-hero h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.data-viewer-hero__desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.data-viewer-hero__actions {
  display: flex;
  gap: 10px;
}

.data-viewer-content {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  backdrop-filter: blur(14px);
  box-shadow: var(--el-box-shadow);
  padding: 20px;
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.data-stat-card {
  padding: 16px;
  border: 1px solid rgba(15, 118, 110, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.42);
  text-align: center;
}

.data-stat-card__value {
  font-size: 32px;
  font-weight: 800;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.data-stat-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.data-toolbar__left,
.data-toolbar__right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.data-table-wrapper {
  margin-top: 16px;
}

.data-table-scroll {
  overflow-x: auto;
}

.data-table {
  min-width: 100%;
}

.data-table :deep(.el-table__inner-wrapper) {
  min-width: 1280px;
}

.comment-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.data-footer {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 800px) {
  .data-viewer-shell {
    padding: 16px;
  }

  .data-viewer-hero {
    flex-direction: column;
    align-items: start;
    gap: 12px;
  }

  .data-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .data-toolbar__left,
  .data-toolbar__right {
    flex-direction: column;
    width: 100%;
  }

  .data-toolbar__left .el-select,
  .data-toolbar__left .el-input {
    width: 100% !important;
  }
}
</style>
