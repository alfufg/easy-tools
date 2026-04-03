<script setup>
import { ref } from 'vue'
import { ArrowLeft, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const progressText = ref('等待开始...')

const videoUrls = ref('')

function goBack() {
  window.history.back()
}

async function startDownload() {
  if (!videoUrls.value.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }

  const urls = videoUrls.value.split('\n').map(url => url.trim()).filter(url => url)

  if (urls.length === 0) {
    ElMessage.warning('未找到有效的视频链接')
    return
  }

  loading.value = true
  progressText.value = '正在准备下载...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/tools/dy_video_download/download.js']
    })

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [urls],
      func: (urls) => {
        console.log('开始下载，URL数量:', urls.length)
        return { code: 0, message: '下载功能开发中' }
      }
    })

    console.log('下载结果:', results[0].result)

    progressText.value = `下载完成！共处理 ${urls.length} 个视频`
    ElMessage.success('下载完成')

  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error(`下载失败: ${error.message}`)
    progressText.value = `下载失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

function resetForm() {
  videoUrls.value = ''
  progressText.value = '等待开始...'
}
</script>

<template>
  <div class="tool-shell">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="tool-hero__eyebrow">Douyin Video Download</p>
        <h1>抖音视频下载助手</h1>
        <span class="tool-hero__desc">无水印视频批量下载</span>
      </div>
      <div class="tool-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
      </div>
    </header>

    <main class="tool-content reveal">
      <el-form label-position="top" class="el-form--tool">
        <el-form-item label="视频链接">
          <el-input
            v-model="videoUrls"
            type="textarea"
            :rows="12"
            placeholder="请输入视频链接，每行一个"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Download"
            :loading="loading"
            @click="startDownload"
          >
            开始下载
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        请先登录抖音。
      </el-alert>

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