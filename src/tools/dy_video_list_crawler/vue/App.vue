<script setup>
import { ref, reactive } from 'vue'
import { ArrowLeft, Search, Download, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import moment from 'moment'
import DBHelper from '../../demo/indexeddb/dbhelper.js'

const DEFAULT_VIDEO_CNT = 20
const SCROLL_CNT = 999

const loading = ref(false)
const progressText = ref('等待开始...')

let dbHelper = null

const form = reactive({
  keyword: '',
  sortType: '综合',
  videoType: '',
  videoCnt: DEFAULT_VIDEO_CNT
})

const sortOptions = [
  { value: '综合', label: '综合' },
  { value: '最多点赞', label: '最多点赞' },
  { value: '最新发布', label: '最新发布' }
]

const typeOptions = [
  { value: '', label: '全部' },
  { value: 'video', label: '视频' },
  { value: 'image', label: '图文' }
]

const dataFields = [
  { category: '视频信息', fields: ['视频标题', '视频链接', '点赞数', '评论数', '分享数', '收藏数'] },
  { category: '达人信息', fields: ['达人昵称', '达人头像', '达人主页', '粉丝数', '获赞数'] }
]

function goBack() {
  window.history.back()
}

function openDataPage() {
  const url = new URL('../../../data-viewer/index.html?tool=dy_video_list', window.location.href).toString()
  chrome.tabs.create({ url })
}

function updateProgress(message) {
  progressText.value = message
  console.log('[流程跟踪] ' + message)
}

function waitForTabComplete(tabId, timeout = 20000) {
  return new Promise((resolve, reject) => {
    let settled = false

    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('页面加载超时，请重试'))
    }, timeout)

    const cleanup = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
    }

    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId !== tabId) return
      if (changeInfo.status === 'complete') {
        cleanup()
        resolve(tab)
      }
    }

    chrome.tabs.onUpdated.addListener(listener)

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        cleanup()
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (tab?.status === 'complete') {
        cleanup()
        resolve(tab)
      }
    })
  })
}

async function startCrawler() {
  if (!form.keyword.trim()) {
    ElMessage.warning('请输入关键词')
    return
  }

  loading.value = true
  updateProgress('正在打开抖音搜索页面...')

  try {
    if (!dbHelper) {
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
    }

    console.log('[流程跟踪] 开始执行, 关键词:', form.keyword, '数量:', form.videoCnt)

    const searchTab = await new Promise((resolve, reject) => {
      chrome.tabs.create({
        url: `https://www.douyin.com/search/${encodeURIComponent(form.keyword)}?type=video`
      }, async (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!tab?.id) {
          reject(new Error('创建搜索页面失败'))
          return
        }

        try {
          const readyTab = await waitForTabComplete(tab.id)
          resolve(readyTab)
        } catch (error) {
          reject(error)
        }
      })
    })

    console.log('[流程跟踪] 搜索页标签已创建')
    updateProgress('等待页面加载...')

    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('[流程跟踪] 注入脚本')
    await chrome.scripting.executeScript({
      target: { tabId: searchTab.id },
      files: ['src/tools/dy_video_list_crawler/crawler.js'],
      world: 'MAIN'
    })

    if (form.videoType) {
      await chrome.scripting.executeScript({
        target: { tabId: searchTab.id },
        args: ['type', form.videoType],
        func: (filter, value) => filter_video_event(filter, value),
        world: 'MAIN'
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (form.sortType && form.sortType !== '综合') {
      await chrome.scripting.executeScript({
        target: { tabId: searchTab.id },
        args: ['sort', form.sortType],
        func: (filter, value) => filter_video_event(filter, value),
        world: 'MAIN'
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    updateProgress('正在获取视频链接列表...')

    const videoResults = await chrome.scripting.executeScript({
      target: { tabId: searchTab.id },
      args: [SCROLL_CNT, form.videoCnt],
      func: (scroll, cnt) => crawler_video_list(scroll, cnt),
      world: 'MAIN'
    })

    const videoLinks = videoResults[0]?.result?.data || []
    console.log('[流程跟踪] 视频链接数量:', videoLinks.length)

    if (videoLinks.length === 0) {
      ElMessage.warning('未找到任何视频')
      chrome.tabs.remove(searchTab.id)
      loading.value = false
      return
    }

    updateProgress(`获取到 ${videoLinks.length} 个视频链接，开始进入详情页...`)

    const detailTab = searchTab
    const allData = []

    for (const [index, videoLink] of videoLinks.entries()) {
      updateProgress(`正在处理第 ${index + 1}/${videoLinks.length} 个视频...`)

      await new Promise((resolve, reject) => {
        chrome.tabs.update(detailTab.id, { url: videoLink }, async (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }

          if (!tab?.id) {
            reject(new Error('更新视频页面失败'))
            return
          }

          try {
            await waitForTabComplete(tab.id)
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })

      await new Promise(resolve => setTimeout(resolve, 2000))

      await chrome.scripting.executeScript({
        target: { tabId: detailTab.id },
        files: ['src/tools/dy_video_list_crawler/crawler.js'],
        world: 'MAIN'
      })

      console.log('[流程跟踪] 第', index + 1, '个视频，正在提取数据，链接:', videoLink)

      const dataResult = await chrome.scripting.executeScript({
        target: { tabId: detailTab.id },
        func: () => extractDataFromVideoPage(),
        world: 'MAIN'
      })

      console.log('[流程跟踪] 第', index + 1, '个视频，dataResult:', JSON.stringify(dataResult, null, 2))

      const data = dataResult[0]?.result
      console.log('[流程跟踪] 第', index + 1, '个视频，提取到的原始数据:', JSON.stringify(data, null, 2))

      if (data) {
        const row = {
          videoTitle: data.videoTitle || '',
          videoLink: data.videoLink || '',
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          shareCount: data.shareCount || 0,
          collectCount: data.collectCount || 0,
          authorNickname: data.authorNickname || '',
          authorAvatar: data.authorAvatar || '',
          authorLink: data.authorLink || '',
          followerCount: data.followerCount || 0,
          totalFavorited: data.totalFavorited || 0,
          keyword: form.keyword,
          crawled_at: new Date().toISOString()
        }

        allData.push(row)
        console.log('[流程跟踪] 第', index + 1, '个视频，处理后数据:', JSON.stringify(row, null, 2))
      } else {
        console.error('[流程跟踪] 第', index + 1, '个视频，数据为空!')
      }
    }

    chrome.tabs.remove(detailTab.id)

    updateProgress(`正在保存 ${allData.length} 条数据到数据库...`)
    
    for (const row of allData) {
      await dbHelper.upsert('dy_video_list', row, 'videoLink')
    }

    exportToExcel(allData, form.keyword)

    updateProgress(`完成！共 ${allData.length} 条数据`)
    ElMessage.success(`采集完成！已保存 ${allData.length} 条数据并下载 Excel`)

  } catch (error) {
    console.error('[流程跟踪] 执行失败:', error)
    ElMessage.error(`执行失败: ${error.message}`)
    updateProgress(`执行失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

function exportToExcel(data, keyword) {
  const headers = ['ID', '视频标题', '视频链接', '点赞数', '评论数', '分享数', '收藏数', '达人昵称', '达人头像', '达人主页链接', '粉丝数', '获赞数']
  const keys = ['videoTitle', 'videoLink', 'likeCount', 'commentCount', 'shareCount', 'collectCount', 'authorNickname', 'authorAvatar', 'authorLink', 'followerCount', 'totalFavorited']

  const rows = data.map((item, index) => [index + 1, ...keys.map(key => item[key] || '')])

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '视频数据')

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    `抖音视频数据_${keyword}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
  )
}

function resetForm() {
  form.keyword = ''
  form.sortType = '综合'
  form.videoType = ''
  form.videoCnt = DEFAULT_VIDEO_CNT
  progressText.value = '等待开始...'
}
</script>

<template>
  <div class="tool-shell">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="tool-hero__eyebrow">Douyin Video List Crawler</p>
        <h1>抖音关键词视频采集</h1>
        <span class="tool-hero__desc">按关键词批量采集视频数据和达人数据</span>
      </div>
      <div class="tool-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
        <el-button :icon="Document" @click="openDataPage">数据</el-button>
      </div>
    </header>

    <main class="tool-content reveal">
      <el-form label-position="top" class="el-form--tool">
        <el-form-item label="搜索关键字">
          <el-input
            v-model="form.keyword"
            placeholder="输入搜索关键词..."
            clearable
          >
            <template #suffix>
              <el-icon :style="{ cursor: 'pointer' }">
                <Search />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="视频类型">
              <el-select v-model="form.videoType" placeholder="选择视频类型" style="width: 100%">
                <el-option
                  v-for="item in typeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="搜索规则">
              <el-select v-model="form.sortType" placeholder="选择排序规则" style="width: 100%">
                <el-option
                  v-for="item in sortOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="视频总数">
          <el-input-number
            v-model="form.videoCnt"
            :min="1"
            :step="10"
            placeholder="20"
            style="width: 100%"
          />
        </el-form-item>

        <el-alert
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #title>
            <strong>将采集以下数据字段：</strong>
          </template>
          <div v-for="group in dataFields" :key="group.category" style="margin-top: 8px">
            <div style="font-weight: 600; color: var(--el-color-primary)">{{ group.category }}</div>
            <div style="color: var(--el-text-color-regular); margin-top: 4px">
              {{ group.fields.join('、') }}
            </div>
          </div>
        </el-alert>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Download"
            :loading="loading"
            @click="startCrawler"
            size="large"
            style="width: 100%"
          >
            开始采集
          </el-button>
        </el-form-item>
      </el-form>

      <div class="tool-panel reveal">
        <div class="tool-panel__head">
          <div>
            <p class="tool-panel__eyebrow">Progress</p>
            <h2>执行进度</h2>
          </div>
        </div>
        <div class="tool-progress">
          <p class="tool-progress__text">{{ progressText }}</p>
        </div>
      </div>
    </main>
  </div>
</template>
