<script setup>
import { ref, reactive } from 'vue'
import { ArrowLeft, Search, Document, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import moment from 'moment'
import DBHelper from '../../demo/indexeddb/dbhelper.js'

const XHS_NOTE_CRAWL_CNT = 20
const XHS_COMMENT_CRAWL_TOTAL_CNT = 500
const XHS_NOTE_COMMENT_CRAWL_CNT = 100
const SCROLL_CNT = 999

const activeTab = ref('keyword')
const loading = ref(false)
const progressText = ref('等待开始...')
let dbHelper = null

const dbStores = [
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
]

const keywordForm = reactive({
  keyword: '',
  sortType: '综合',
  noteType: 'all',
  showMore: true,
  noteCnt: XHS_NOTE_CRAWL_CNT,
  noteCommentCnt: XHS_NOTE_COMMENT_CRAWL_CNT,
  commentCnt: XHS_COMMENT_CRAWL_TOTAL_CNT
})

const linksForm = reactive({
  links: '',
  showMore: true,
  noteCommentCnt: XHS_NOTE_COMMENT_CRAWL_CNT,
  commentCnt: XHS_COMMENT_CRAWL_TOTAL_CNT
})

const userForm = reactive({
  userId: '',
  showMore: true,
  noteCnt: XHS_NOTE_CRAWL_CNT,
  noteCommentCnt: XHS_NOTE_COMMENT_CRAWL_CNT,
  commentCnt: XHS_COMMENT_CRAWL_TOTAL_CNT
})

const sortOptions = [
  { value: '综合', label: '综合' },
  { value: '最热', label: '最热' },
  { value: '最新', label: '最新' }
]

const typeOptions = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图文' },
  { value: 'video', label: '视频' }
]

function goBack() {
  window.history.back()
}

function openXhsHome() {
  chrome.tabs.create({ url: 'https://www.xiaohongshu.com' })
}

function openDataPage() {
  const url = new URL('../../../data-viewer/index.html?tool=xhs_comments', window.location.href).toString()
  chrome.tabs.create({ url })
}

async function getDbHelper() {
  if (!dbHelper) {
    dbHelper = new DBHelper('toolsDB', 4, dbStores)
    await dbHelper.init()
  }
  return dbHelper
}

function normalizeUrl(value) {
  return (value || '').trim().replace(/\?.*$/, '').replace(/\/$/, '')
}

function createHash(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function buildXhsCommentPayloads(comments, meta) {
  const crawledAt = new Date().toISOString()
  return comments.map((item, index) => ({
    nickname: item.nickname || '',
    avatar: item.avatar || '',
    comment: item.comment || '',
    like_count: item.like_count ?? 0,
    city: item.city || '',
    comment_level: item.comment_level || '',
    sub_comment_count: item.sub_comment_count ?? 0,
    date: item.date || '',
    crawl_type: meta.crawlType,
    note_id: meta.noteId,
    keyword: meta.keyword || '',
    source_url: meta.sourceUrl,
    crawled_at: crawledAt,
    fingerprint: createHash([
      meta.crawlType,
      meta.noteId,
      item.nickname || '',
      item.comment || '',
      item.date || '',
      index
    ].join('::'))
  }))
}

async function persistXhsComments(payloads) {
  if (!payloads.length) {
    return 0
  }

  const helper = await getDbHelper()
  await Promise.all(payloads.map(payload => helper.add('xhs_comments', payload)))
  return payloads.length
}

async function startKeywordCrawler() {
  if (!keywordForm.keyword.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  loading.value = true
  progressText.value = '正在创建搜索页面...'

  try {
    const retryCnt = 3
    const info = {
      keyword: keywordForm.keyword,
      sortType: keywordForm.sortType,
      noteType: keywordForm.noteType,
      showMore: keywordForm.showMore,
      noteCnt: keywordForm.noteCnt,
      noteCommentCnt: keywordForm.noteCommentCnt,
      commentCnt: keywordForm.commentCnt,
      retryCnt
    }
    console.log('[流程跟踪] 相关参数信息:', info)

    progressText.value = '正在打开小红书搜索页面...'
    const newTab = await new Promise((resolve) => {
      chrome.tabs.create({
        url: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keywordForm.keyword)}&source=web_explore_feed`
      }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener)
            resolve(tab)
          }
        })
      })
    })

    progressText.value = '正在注入基础脚本...'
    await chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      files: ['src/tools/xhs_comment_crawler/demo.js']
    })

    await new Promise(resolve => setTimeout(resolve, 3000))

    const executeQueue = [
      {
        action: 'sort',
        value: keywordForm.sortType,
        func: (val) => filter_note_event('sort', val)
      },
      {
        action: 'type',
        value: keywordForm.noteType,
        func: (val) => filter_note_event('type', val)
      }
    ]

    for (const task of executeQueue) {
      if (task.value === 'all' || task.value === '综合') {
        console.log(`[流程跟踪] 跳过${task.action}变更，采用默认规则`)
        continue
      }
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        args: [task.value],
        func: task.func
      })
      console.log(`[流程跟踪] 更新${task.action}规则:`, task.value)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    progressText.value = '正在爬取笔记列表...'
    const noteResults = await chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      args: [SCROLL_CNT, keywordForm.noteCnt],
      func: (scroll, cnt) => crawler_notes(scroll, cnt)
    })
    console.log('[流程跟踪] 爬取笔记执行结果:', noteResults[0].result)

    await new Promise(resolve => setTimeout(resolve, 3000))

    progressText.value = '正在顺序爬取评论...'
    const allComments = await (async () => {
      const comments = []
      const noteLinks = noteResults[0].result.data.map(link => `https://www.xiaohongshu.com${link}`)

      for (const [index, link] of noteLinks.slice(0, keywordForm.noteCnt).entries()) {
        if (comments.length >= keywordForm.commentCnt) {
          console.log('[流程控制] 达到评论数量上限，终止爬取')
          break
        }

        progressText.value = `正在处理第 ${index + 1}/${noteLinks.length} 条笔记...`

        await new Promise(resolve => {
          chrome.tabs.update(newTab.id, { url: link }, async (updatedTab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === updatedTab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener)
                resolve()
              }
            })
          })
        })

        await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          files: ['src/tools/xhs_comment_crawler/demo.js']
        })

        const commentResults = await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          args: [SCROLL_CNT, keywordForm.noteCommentCnt, keywordForm.showMore, retryCnt],
          func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
        })

        if (commentResults[0]?.result?.data?.length > 0) {
          comments.push(...commentResults[0].result.data)
        }

        console.log(`[流程跟踪] 第${index + 1}/${noteLinks.length}条笔记处理完成, 进度：${comments.length}/${keywordForm.commentCnt}`)
      }
      return comments.slice(0, keywordForm.commentCnt)
    })()

    const result = {
      code: 0,
      message: '爬取完成',
      data: allComments.slice(0, keywordForm.commentCnt),
      count: Math.min(allComments.length, keywordForm.commentCnt)
    }
    console.log('[流程跟踪] 爬取结果:', result)

    progressText.value = '正在写入数据库...'
    await persistXhsComments(
      buildXhsCommentPayloads(result.data, {
        crawlType: 'keyword',
        noteId: keywordForm.keyword,
        keyword: keywordForm.keyword,
        sourceUrl: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keywordForm.keyword)}&source=web_explore_feed`
      })
    )

    progressText.value = '正在保存到 Excel...'
    await new Promise(resolve => {
      saveContentToExcel(result.data, `小红书评论数据_${keywordForm.keyword}`)
      setTimeout(resolve, 1000)
      console.log('[流程跟踪] 保存文件完成')
    })

    progressText.value = `爬取完成！共 ${result.count} 条评论`
    ElMessage.success(`爬取完成，共 ${result.count} 条评论已入库并保存到 Excel`)

  } catch (error) {
    console.error('全流程失败:', error)
    ElMessage.error(`执行失败: ${error.message}`)
    progressText.value = `执行失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function startLinksCrawler() {
  const noteLinks = linksForm.links.split('\n').map(link => link.trim())
    .filter(link => link)
    .filter(link => link.startsWith('https://www.xiaohongshu.com/') || link.startsWith('http://xhslink.com/'))

  if (noteLinks.length === 0) {
    ElMessage.warning('请输入有效的笔记链接')
    return
  }

  loading.value = true
  progressText.value = '正在准备爬取评论...'

  try {
    const retryCnt = 3
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const allComments = []

    for (const [index, link] of noteLinks.entries()) {
      if (allComments.length >= linksForm.commentCnt) {
        console.log('[流程跟踪] 已达到评论需求数量，停止爬取')
        break
      }

      progressText.value = `正在处理第 ${index + 1}/${noteLinks.length} 条笔记...`

      await new Promise((resolve) => {
        chrome.tabs.update(tab.id, { url: link }, (tab) => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener)
              resolve(tab)
            }
          })
        })
      })

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/xhs_comment_crawler/demo.js']
      })

      const commentResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [SCROLL_CNT, linksForm.noteCommentCnt, linksForm.showMore, retryCnt],
        func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
      })

      commentResults[0]?.result?.data?.length > 0 && allComments.push(...commentResults[0].result.data)
      console.log(`[流程跟踪] 第 ${index + 1} 条笔记的评论爬取完成: ${commentResults[0].result.count} 条，进度：`, allComments.length, '/', linksForm.commentCnt)
    }

    const result = {
      code: 0,
      message: '爬取完成',
      data: allComments.slice(0, linksForm.commentCnt),
      count: Math.min(allComments.length, linksForm.commentCnt)
    }
    console.log('[流程跟踪] 爬取结果:', result)

    progressText.value = '正在写入数据库...'
    const normalizedLinks = noteLinks.map(link => normalizeUrl(link))
    await persistXhsComments(
      buildXhsCommentPayloads(result.data, {
        crawlType: 'links',
        noteId: normalizedLinks.join('|'),
        keyword: '',
        sourceUrl: normalizedLinks.join('\n')
      })
    )

    progressText.value = '正在保存到 Excel...'
    saveContentToExcel(result.data, '小红书评论数据')

    progressText.value = `爬取完成！共 ${result.count} 条评论`
    ElMessage.success(`爬取完成，共 ${result.count} 条评论已入库并保存到 Excel`)

  } catch (error) {
    console.error('[流程跟踪] 全流程失败:', error)
    ElMessage.error(`执行失败: ${error.message}`)
    progressText.value = `执行失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function startUserCrawler() {
  if (!userForm.userId.trim()) {
    ElMessage.warning('请输入用户ID')
    return
  }

  ElMessage.info('用户ID采集功能开发中，敬请期待')
}

function saveContentToExcel(objData, filename) {
  const timestamp = new Date().toISOString()
  const rawJson = objData.map((item, index) => {
    item.id = index + 1
    item.crawled_at = timestamp
    return item
  })

  const header = ['ID', '用户昵称', '用户头像', '评论内容', '点赞数', '城市', '评论级别', '回复数量', '评论时间']
  const data = rawJson.map(item => [
    item.id,
    item.nickname,
    item.avatar,
    item.comment,
    item.like_count,
    item.city,
    item.comment_level,
    item.sub_comment_count,
    item.date
  ])
  const formattedData = [header, ...data]

  const worksheet = XLSX.utils.aoa_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '小红书评论数据')

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
  )
}

function resetKeywordForm() {
  keywordForm.keyword = ''
  keywordForm.sortType = '综合'
  keywordForm.noteType = 'all'
  keywordForm.showMore = true
  keywordForm.noteCnt = XHS_NOTE_CRAWL_CNT
  keywordForm.noteCommentCnt = XHS_NOTE_COMMENT_CRAWL_CNT
  keywordForm.commentCnt = XHS_COMMENT_CRAWL_TOTAL_CNT
  progressText.value = '等待开始...'
}

function resetLinksForm() {
  linksForm.links = ''
  linksForm.showMore = true
  linksForm.noteCommentCnt = XHS_NOTE_COMMENT_CRAWL_CNT
  linksForm.commentCnt = XHS_COMMENT_CRAWL_TOTAL_CNT
  progressText.value = '等待开始...'
}

function resetUserForm() {
  userForm.userId = ''
  userForm.showMore = true
  userForm.noteCnt = XHS_NOTE_CRAWL_CNT
  userForm.noteCommentCnt = XHS_NOTE_COMMENT_CRAWL_CNT
  userForm.commentCnt = XHS_COMMENT_CRAWL_TOTAL_CNT
  progressText.value = '等待开始...'
}
</script>

<template>
  <div class="tool-shell">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="tool-hero__eyebrow">XHS Comment Crawler</p>
        <h1>小红书评论采集</h1>
        <span class="tool-hero__desc">支持关键词、链接、用户ID三种采集模式</span>
      </div>
      <div class="tool-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
        <el-button :icon="Document" @click="openDataPage">数据</el-button>
      </div>
    </header>

    <main class="tool-content reveal">
      <el-tabs v-model="activeTab" class="el-tabs--tool">
        <el-tab-pane label="关键词" name="keyword">
          <el-form label-position="top" class="el-form--tool">
            <el-form-item label="搜索关键字">
              <el-input
                v-model="keywordForm.keyword"
                placeholder="输入搜索关键词..."
                clearable
              >
                <template #suffix>
                  <el-icon :style="{ cursor: 'pointer' }" @click="openXhsHome">
                    <Search />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="笔记类型">
              <el-select v-model="keywordForm.noteType" placeholder="选择笔记类型">
                <el-option
                  v-for="item in typeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="搜索规则">
              <el-select v-model="keywordForm.sortType" placeholder="选择排序规则">
                <el-option
                  v-for="item in sortOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="子评论采集">
              <el-switch v-model="keywordForm.showMore" />
            </el-form-item>

            <el-form-item label="帖子总数">
              <el-input-number
                v-model="keywordForm.noteCnt"
                :min="0"
                :step="20"
                placeholder="20"
              />
            </el-form-item>

            <el-form-item label="评论总数">
              <el-input-number
                v-model="keywordForm.commentCnt"
                :min="0"
                :step="20"
                placeholder="500"
              />
            </el-form-item>

            <el-form-item label="单帖评论数">
              <el-input-number
                v-model="keywordForm.noteCommentCnt"
                :min="0"
                :step="20"
                placeholder="100"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :icon="Download"
                :loading="loading"
                @click="startKeywordCrawler"
              >
                开始采集
              </el-button>
              <el-button @click="resetKeywordForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="链接" name="links">
          <el-form label-position="top" class="el-form--tool">
            <el-form-item label="笔记链接">
              <el-input
                v-model="linksForm.links"
                type="textarea"
                :rows="8"
                placeholder="请输入笔记链接，每行一个"
              />
            </el-form-item>

            <el-form-item label="子评论采集">
              <el-switch v-model="linksForm.showMore" />
            </el-form-item>

            <el-form-item label="评论总数">
              <el-input-number
                v-model="linksForm.commentCnt"
                :min="0"
                :step="20"
                placeholder="500"
              />
            </el-form-item>

            <el-form-item label="单帖评论数">
              <el-input-number
                v-model="linksForm.noteCommentCnt"
                :min="0"
                :step="20"
                placeholder="100"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :icon="Download"
                :loading="loading"
                @click="startLinksCrawler"
              >
                开始采集
              </el-button>
              <el-button @click="resetLinksForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="用户" name="user">
          <el-form label-position="top" class="el-form--tool">
            <el-form-item label="用户ID">
              <el-input
                v-model="userForm.userId"
                placeholder="输入用户ID..."
                clearable
              >
                <template #suffix>
                  <el-icon :style="{ cursor: 'pointer' }">
                    <Search />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="帖子总数">
              <el-input-number
                v-model="userForm.noteCnt"
                :min="0"
                :step="20"
                placeholder="20"
              />
            </el-form-item>

            <el-form-item label="子评论采集">
              <el-switch v-model="userForm.showMore" />
            </el-form-item>

            <el-form-item label="评论总数">
              <el-input-number
                v-model="userForm.commentCnt"
                :min="0"
                :step="20"
                placeholder="500"
              />
            </el-form-item>

            <el-form-item label="单帖评论数">
              <el-input-number
                v-model="userForm.noteCommentCnt"
                :min="0"
                :step="20"
                placeholder="60"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :icon="Download"
                :loading="loading"
                @click="startUserCrawler"
              >
                开始采集
              </el-button>
              <el-button @click="resetUserForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

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
