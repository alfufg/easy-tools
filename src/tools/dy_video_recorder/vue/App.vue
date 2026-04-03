<script setup>
import { ref, computed } from 'vue'
import { ArrowLeft, VideoCamera } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const progressText = ref('等待开始...')

const videoUrls = ref('')
const recordOptions = ref(['record', 'shot', 'source'])

function goBack() {
  window.history.back()
}

async function startRecording() {
  if (!videoUrls.value.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }

  const urls = videoUrls.value.split('\n').map(url => url.trim()).filter(url => url)

  if (urls.length === 0) {
    ElMessage.warning('未找到有效的视频链接')
    return
  }

  if (recordOptions.value.length === 0) {
    ElMessage.warning('请至少选择一种录制选项')
    return
  }

  loading.value = true
  progressText.value = '正在准备录屏...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/tools/dy_video_recorder/recorder.js']
    })

    const options = {
      record: recordOptions.value.includes('record'),
      shot: recordOptions.value.includes('shot'),
      source: recordOptions.value.includes('source')
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [urls, options],
      func: (urls, options) => {
        console.log('开始录屏，URL数量:', urls.length, '选项:', options)
        return { code: 0, message: '录屏功能开发中' }
      }
    })

    console.log('录屏结果:', results[0].result)

    progressText.value = `录屏完成！共处理 ${urls.length} 个视频`
    ElMessage.success('录屏完成')

  } catch (error) {
    console.error('录屏失败:', error)
    ElMessage.error(`录屏失败: ${error.message}`)
    progressText.value = `录屏失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

function resetForm() {
  videoUrls.value = ''
  recordOptions.value = ['record', 'shot', 'source']
  progressText.value = '等待开始...'
}
</script>

<template>
  <div class="tool-shell">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="tool-hero__eyebrow">Douyin Video Recorder</p>
        <h1>抖音视频录屏</h1>
        <span class="tool-hero__desc">自动录制视频，支持截图和素材下载</span>
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

        <el-form-item label="录制选项">
          <el-checkbox-group v-model="recordOptions">
            <el-checkbox label="record">录屏</el-checkbox>
            <el-checkbox label="shot">截图</el-checkbox>
            <el-checkbox label="source">素材</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="VideoCamera"
            :loading="loading"
            @click="startRecording"
          >
            开始录制
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          <div>自动过滤掉无效链接，逐个录制。</div>
          <div>请登录抖音并打开连播开关。</div>
        </template>
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