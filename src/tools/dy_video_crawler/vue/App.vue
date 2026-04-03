<script setup>
import { ref } from 'vue'
import { ArrowLeft, Download, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const progressText = ref('等待开始...')

const currentAccount = ref('')
const darenLinks = ref('')

function goBack() {
  window.history.back()
}

async function getAccountInfo() {
  try {
    progressText.value = '正在获取账号信息...'

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/tools/dy_video_crawler/index.js']
    })

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const cookies = document.cookie
        const match = cookies.match(/sessionid=([^;]+)/)
        return match ? match[1] : null
      }
    })

    if (results[0]?.result) {
      currentAccount.value = results[0].result
      ElMessage.success('账号信息获取成功')
      progressText.value = '账号信息已获取'
    } else {
      ElMessage.warning('未找到账号信息，请确保已登录星图平台')
      progressText.value = '未找到账号信息'
    }
  } catch (error) {
    console.error('获取账号信息失败:', error)
    ElMessage.error(`获取失败: ${error.message}`)
    progressText.value = `获取失败: ${error.message}`
  }
}

async function startCrawler() {
  if (!currentAccount.value.trim()) {
    ElMessage.warning('请先获取账号唯一标识')
    return
  }

  if (!darenLinks.value.trim()) {
    ElMessage.warning('请输入达人链接')
    return
  }

  loading.value = true
  progressText.value = '正在准备采集...'

  try {
    const links = darenLinks.value.split('\n').map(link => link.trim()).filter(link => link)

    if (links.length === 0) {
      ElMessage.warning('未找到有效的达人链接')
      loading.value = false
      return
    }

    progressText.value = `共 ${links.length} 个达人，开始采集...`

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/tools/dy_video_crawler/index.js']
    })

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [links, currentAccount.value],
      func: (links, account) => {
        console.log('开始采集，链接数量:', links.length)
        return { code: 0, message: '功能开发中', data: [] }
      }
    })

    console.log('采集结果:', results[0].result)

    progressText.value = `采集完成！共 ${results[0].result.data?.length || 0} 条数据`
    ElMessage.success('采集完成')

  } catch (error) {
    console.error('采集失败:', error)
    ElMessage.error(`采集失败: ${error.message}`)
    progressText.value = `采集失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

function resetForm() {
  currentAccount.value = ''
  darenLinks.value = ''
  progressText.value = '等待开始...'
}
</script>

<template>
  <div class="tool-shell">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="tool-hero__eyebrow">Xingtu Video Crawler</p>
        <h1>星图视频数据采集</h1>
        <span class="tool-hero__desc">批量采集星图达人视频数据</span>
      </div>
      <div class="tool-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
      </div>
    </header>

    <main class="tool-content reveal">
      <el-form label-position="top" class="el-form--tool">
        <el-form-item>
          <template #label>
            <span>当前账号</span>
            <el-button :icon="User" link @click="getAccountInfo">获取账号唯一标识</el-button>
          </template>
          <el-input
            v-model="currentAccount"
            type="textarea"
            :rows="6"
            placeholder="点击上方按钮，获取当前账号唯一标识"
          />
        </el-form-item>

        <el-form-item label="达人链接">
          <el-input
            v-model="darenLinks"
            type="textarea"
            :rows="12"
            placeholder="请输入星图达人链接或星图ID，每行一个&#10;示例：https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/7308388180431110181&#10;或：7308388180431110181"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Download"
            :loading="loading"
            @click="startCrawler"
          >
            开始采集
          </el-button>
          <el-button @click="resetForm">重置</el-button>
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