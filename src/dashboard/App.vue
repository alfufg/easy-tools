<script setup>
import ToolCard from "../popup/components/ToolCard.vue";
import { useWorkspaceState } from "../shared/useWorkspaceState";

const {
  tools,
  search,
  pinnedTools,
  resultSummary,
  visibleTools,
  rememberTool,
  togglePinned,
  isPinned
} = useWorkspaceState();

const quickSearchTerms = ["评论采集", "抖音", "视频下载", "录屏", "SEO", "星图"];

function applyQuickSearch(term) {
  search.value = term;
}
</script>

<template>
  <div class="dashboard-shell">
    <section class="dashboard-hero reveal">
      <div class="dashboard-hero__content">
        <p class="dashboard-hero__eyebrow">Workspace</p>
        <h1>Easy Tools</h1>
        <p class="dashboard-hero__desc">在一个页面里快速进入所有工具。</p>
      </div>
      <div class="dashboard-hero__panel">
        <span class="dashboard-hero__metric-label">工具总数</span>
        <strong>{{ tools.length }}</strong>
        <span class="dashboard-hero__metric-note">{{ pinnedTools.length }} 个已收藏</span>
      </div>
    </section>

    <section class="dashboard-main dashboard-section">
      <section id="workspace-tools" class="section-block reveal reveal--workspace dashboard-main__content">
        <div class="section-head section-head--stack">
          <div>
            <h2 class="workspace-title">工具索引</h2>
            <p class="section-head__hint">{{ resultSummary }}</p>
          </div>
          <div class="dashboard-toolbar">
            <label class="search-box search-box--dashboard" for="dashboard-tool-search">
              <span class="search-box__icon" aria-hidden="true">⌕</span>
              <input
                id="dashboard-tool-search"
                v-model="search"
                type="search"
                placeholder="搜索工具、平台、场景或关键词"
              >
            </label>
            <div class="dashboard-search-tags" aria-label="快速搜索">
              <button
                v-for="term in quickSearchTerms"
                :key="term"
                type="button"
                class="dashboard-search-tag"
                @click="applyQuickSearch(term)"
              >
                {{ term }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="visibleTools.length" class="tool-grid tool-grid--dashboard" aria-live="polite">
          <ToolCard
            v-for="(tool, index) in visibleTools"
            :key="tool.id"
            :tool="tool"
            compact
            :pinned="isPinned(tool.id)"
            :style="{ '--card-delay': `${160 + index * 45}ms` }"
            @open="rememberTool(tool.id)"
            @toggle-pin="togglePinned(tool.id)"
          />
        </div>

        <div v-else class="empty-state">
          <p>没有找到匹配的工具，试试别的关键词或分类。</p>
        </div>
      </section>

      <aside
        v-if="pinnedTools.length"
        class="control-panel reveal reveal--controls dashboard-main__aside"
        aria-label="快捷入口"
      >
        <div class="quick-strip quick-strip--single">
          <div class="quick-strip__block quick-strip__block--wide">
            <div class="quick-strip__head">
              <p class="quick-strip__label">我的收藏</p>
            </div>
            <div class="quick-chip-list quick-chip-list--stack">
              <a
                v-for="tool in pinnedTools"
                :key="tool.id"
                class="quick-chip"
                :href="tool.href"
                @click="rememberTool(tool.id)"
              >
                <span class="quick-chip__icon">{{ tool.icon }}</span>
                <span class="quick-chip__text">{{ tool.name }}</span>
                <button
                  type="button"
                  class="quick-chip__pin"
                  title="取消收藏"
                  @click.prevent.stop="togglePinned(tool.id)"
                >
                  ★
                </button>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
