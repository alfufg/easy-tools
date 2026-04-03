<script setup>
import ToolCard from "./components/ToolCard.vue";
import { useWorkspaceState } from "../shared/useWorkspaceState";

const {
  categories,
  search,
  activeCategory,
  pinnedTools,
  groupedTools,
  resultSummary,
  visibleTools,
  rememberTool,
  togglePinned,
  isPinned
} = useWorkspaceState();

function openDashboard() {
  const url = chrome?.runtime?.getURL?.("src/dashboard/index.html");
  if (!url) {
    return;
  }

  chrome.tabs.create({ url });
  window.close();
}
</script>

<template>
  <div class="app-shell">
    <section
      v-if="pinnedTools.length"
      id="quick-access"
      class="control-panel reveal reveal--controls"
      aria-label="快捷入口"
    >
      <div class="quick-strip">
        <div class="quick-strip__block quick-strip__block--wide">
          <div class="quick-strip__head">
            <p class="quick-strip__label">我的收藏</p>
          </div>
          <div class="quick-chip-list">
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
    </section>

    <section id="workspace" class="section-block section-block--workspace reveal reveal--workspace">
      <button type="button" class="workspace-launch workspace-launch--corner" @click="openDashboard">
        工作台
      </button>

      <div class="section-head">
        <div>
          <h2 class="workspace-title">EASY TOOLS</h2>
          <p class="section-head__hint">{{ resultSummary }}</p>
        </div>
      </div>

      <div id="workspace-toolbar" class="workspace-toolbar">
        <label class="search-box search-box--workspace" for="tool-search">
          <span class="search-box__icon" aria-hidden="true">⌕</span>
          <input id="tool-search" v-model="search" type="search" placeholder="搜索工具、平台或功能">
        </label>

        <div class="filters" role="tablist" aria-label="分类筛选">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="filter-chip"
            :class="{ 'is-active': category === activeCategory }"
            :aria-selected="String(category === activeCategory)"
            role="tab"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <div v-if="visibleTools.length" class="group-list" aria-live="polite">
        <section
          v-for="(group, groupIndex) in groupedTools"
          :key="group.category"
          class="group-block"
          :style="{ '--group-delay': `${120 + groupIndex * 90}ms` }"
        >
          <div class="group-head">
            <div>
              <p class="group-head__eyebrow">{{ group.category }}</p>
              <h3>{{ group.items.length }} 个工具</h3>
            </div>
            <span class="group-head__hint">按场景整理，便于连续操作</span>
          </div>
          <div class="tool-grid">
            <ToolCard
              v-for="(tool, index) in group.items"
              :key="tool.id"
              :tool="tool"
              :pinned="isPinned(tool.id)"
              :style="{ '--card-delay': `${180 + groupIndex * 90 + index * 55}ms` }"
              @open="rememberTool(tool.id)"
              @toggle-pin="togglePinned(tool.id)"
            />
          </div>
        </section>
      </div>

      <div v-else class="empty-state">
        <p>没有找到匹配的工具，试试别的关键词或分类。</p>
      </div>
    </section>
  </div>
</template>
