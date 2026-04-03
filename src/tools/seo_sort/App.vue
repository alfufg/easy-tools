<script setup>
import { computed, reactive, ref } from "vue";
import {
  ArrowLeft,
  CircleCheckFilled,
  Clock,
  DataAnalysis,
  InfoFilled,
  Search
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { platformOptions, runSeoQuery } from "./search";

const drawerVisible = ref(false);
const loading = ref(false);
const progress = ref(0);
const activePlatform = ref("");
const results = ref([]);

const form = reactive({
  keyword: "头条易",
  url: "www.toutiaoeasy.cn",
  platforms: ["baidu", "bing", "sogou", "360"]
});

const summary = computed(() => {
  const matched = results.value.filter((item) => item.status === "matched").length;
  const missing = results.value.filter((item) => item.status === "missing").length;
  const errors = results.value.filter((item) => item.status === "error").length;
  return { matched, missing, errors };
});

const progressStatus = computed(() => {
  if (!results.value.length) {
    return "";
  }

  return summary.value.errors ? "exception" : "success";
});

async function submitQuery() {
  if (!form.keyword.trim() || !form.url.trim()) {
    ElMessage.warning("请先填写搜索关键词和匹配网址");
    return;
  }

  if (!form.platforms.length) {
    ElMessage.warning("请至少选择一个搜索平台");
    return;
  }

  loading.value = true;
  progress.value = 0;
  activePlatform.value = "";
  results.value = [];

  try {
    results.value = await runSeoQuery({
      keyword: form.keyword,
      url: form.url,
      platforms: form.platforms,
      onProgress(step) {
        progress.value = step.percent;
        activePlatform.value = step.label;
      }
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.keyword = "";
  form.url = "";
  form.platforms = ["baidu", "bing", "sogou", "360"];
  results.value = [];
  progress.value = 0;
  activePlatform.value = "";
}

function goBack() {
  window.history.back();
}

function formatRank(row) {
  if (row.status === "matched") {
    return `第 ${row.rank} 位`;
  }

  if (row.status === "missing") {
    return "未收录";
  }

  if (row.status === "coming_soon") {
    return "待接入";
  }

  return "-";
}

function tagType(status) {
  if (status === "matched") {
    return "success";
  }
  if (status === "missing") {
    return "warning";
  }
  if (status === "coming_soon") {
    return "info";
  }
  return "danger";
}

function tagLabel(status) {
  if (status === "matched") {
    return "已命中";
  }
  if (status === "missing") {
    return "未命中";
  }
  if (status === "coming_soon") {
    return "待接入";
  }
  return "异常";
}
</script>

<template>
  <div class="tool-shell seo-page">
    <header class="tool-hero reveal">
      <div class="tool-hero__title">
        <p class="seo-hero__eyebrow">SEO Sort</p>
        <h1>网站收录排位查询</h1>
        <span class="tool-hero__desc">多搜索源排位查询，快速验证目标网址的自然收录与排名表现</span>
      </div>
      <div class="tool-hero__actions">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回</el-button>
        <el-button :icon="InfoFilled" @click="drawerVisible = true">查询说明</el-button>
      </div>
    </header>

    <main class="tool-content reveal">
      <div class="seo-layout">
      <section class="tool-panel seo-panel seo-panel--form">
        <div class="tool-panel__head seo-panel__head">
          <div>
            <p class="tool-panel__eyebrow">Query Form</p>
            <h2>查询参数</h2>
          </div>
          <el-tag type="success" effect="light">实时抓取</el-tag>
        </div>

        <el-form label-position="top" class="seo-form el-form--tool">
          <el-form-item label="搜索关键词">
            <el-input v-model="form.keyword" placeholder="请输入搜索关键词" clearable />
          </el-form-item>

          <el-form-item label="匹配网址">
            <el-input v-model="form.url" placeholder="请输入域名或网址片段" clearable />
          </el-form-item>

          <el-form-item label="搜索平台">
            <el-checkbox-group v-model="form.platforms" class="seo-platforms">
              <el-checkbox-button
                v-for="platform in platformOptions"
                :key="platform.key"
                :label="platform.key"
              >
                {{ platform.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </el-form-item>

          <div class="seo-form__actions">
            <el-button type="primary" :icon="Search" :loading="loading" @click="submitQuery">
              开始查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </el-form>
      </section>

      <section class="tool-panel seo-panel seo-panel--status">
        <div class="tool-panel__head seo-panel__head">
          <div>
            <p class="tool-panel__eyebrow">Run Status</p>
            <h2>执行进度</h2>
          </div>
          <el-icon size="20"><DataAnalysis /></el-icon>
        </div>

        <el-progress
          :percentage="progress"
          :status="progressStatus"
          :stroke-width="10"
          :show-text="true"
        />

        <div class="seo-status-list">
          <div class="seo-status-item">
            <span>当前平台</span>
            <strong>{{ activePlatform || "等待开始" }}</strong>
          </div>
          <div class="seo-status-item">
            <span>命中结果</span>
            <strong>{{ summary.matched }}</strong>
          </div>
        </div>

        <el-alert
          v-if="loading"
          title="正在依次查询搜索平台，查询时间取决于网络和目标站点响应。"
          type="info"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else-if="results.length"
          :title="summary.errors ? '本次查询包含异常平台，请查看结果说明。' : '查询完成，可以对照排名结果继续分析。'"
          :type="summary.errors ? 'warning' : 'success'"
          :closable="false"
          show-icon
        />
      </section>
      </div>

      <section class="tool-panel seo-panel seo-panel--results">
      <div class="tool-panel__head seo-panel__head">
        <div>
          <p class="tool-panel__eyebrow">Results</p>
          <h2>查询结果</h2>
        </div>
        <el-tag v-if="results.length" effect="plain">{{ results.length }} 个平台</el-tag>
      </div>

      <el-empty v-if="!results.length" description="提交查询后，在这里查看各平台结果" />

      <el-table v-else :data="results" stripe>
        <el-table-column prop="label" label="平台" min-width="120" />
        <el-table-column label="结果" min-width="120">
          <template #default="{ row }">
            {{ formatRank(row) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)" effect="light">{{ tagLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" min-width="240" />
      </el-table>
    </section>
    </main>

    <el-drawer v-model="drawerVisible" title="查询说明" size="420px">
      <div class="seo-drawer">
        <div class="seo-drawer__item">
          <el-icon><CircleCheckFilled /></el-icon>
          <div>
            <strong>适合做什么</strong>
            <p>验证指定关键词下，目标网址在不同搜索源中的自然排名和收录情况。</p>
          </div>
        </div>
        <div class="seo-drawer__item">
          <el-icon><Clock /></el-icon>
          <div>
            <strong>怎么判断结果</strong>
            <p>`已命中` 表示找到了目标域名，`未命中` 表示当前结果页未找到，`待接入` 表示平台预留未实现。</p>
          </div>
        </div>
        <div class="seo-drawer__item">
          <el-icon><InfoFilled /></el-icon>
          <div>
            <strong>注意事项</strong>
            <p>搜索引擎页面结构可能变化，若出现异常，需要同步更新解析规则。</p>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>
