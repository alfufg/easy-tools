<script setup>
import { computed, onMounted, ref } from "vue";
import ToolCard from "./components/ToolCard.vue";
import { categories, tools } from "./data/tools";

const STORAGE_KEY = "easy_tools_recent_tool";
const PINNED_KEY = "easy_tools_pinned_tools";
const PINNED_FALLBACK_KEY = "easy_tools_pinned_tools_fallback";

const search = ref("");
const activeCategory = ref("全部");
const recentId = ref("");
const pinnedIds = ref([]);

const visibleTools = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return tools.filter((tool) => {
    const matchCategory = activeCategory.value === "全部" || tool.category === activeCategory.value;
    const content = [tool.name, tool.description, tool.platform, tool.category, ...tool.tags]
      .join(" ")
      .toLowerCase();
    const matchSearch = !keyword || content.includes(keyword);
    return matchCategory && matchSearch;
  });
});

const pinnedTools = computed(() => {
  const pinnedSet = new Set(pinnedIds.value);
  return tools.filter((tool) => pinnedSet.has(tool.id));
});
const groupedTools = computed(() => {
  const order = categories.filter((category) => category !== "全部");

  return order
    .map((category) => ({
      category,
      items: visibleTools.value.filter((tool) => tool.category === category)
    }))
    .filter((group) => group.items.length);
});
const resultSummary = computed(() => {
  const scope = activeCategory.value === "全部" ? "全部分类" : activeCategory.value;
  return `当前显示 ${visibleTools.value.length} / ${tools.length} 个工具 · ${scope}`;
});

onMounted(async () => {
  try {
    const cached = localStorage.getItem(PINNED_FALLBACK_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        pinnedIds.value = parsed;
      }
    }
  } catch {
    // Ignore fallback parse failures.
  }

  if (!chrome?.storage?.local) {
    return;
  }

  try {
    const data = await chrome.storage.local.get([STORAGE_KEY, PINNED_KEY]);
    recentId.value = data[STORAGE_KEY] || "";
    pinnedIds.value = Array.isArray(data[PINNED_KEY]) ? data[PINNED_KEY] : pinnedIds.value;
  } catch {
    // Keep fallback state if extension storage is temporarily unavailable.
  }
});

async function rememberTool(toolId) {
  recentId.value = toolId;

  if (!chrome?.storage?.local) {
    return;
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: toolId
  });
}

async function togglePinned(toolId) {
  const nextSet = new Set(pinnedIds.value);

  if (nextSet.has(toolId)) {
    nextSet.delete(toolId);
  } else {
    nextSet.add(toolId);
  }

  pinnedIds.value = [...nextSet];
  localStorage.setItem(PINNED_FALLBACK_KEY, JSON.stringify(pinnedIds.value));

  if (!chrome?.storage?.local) {
    return;
  }

  try {
    await chrome.storage.local.set({
      [PINNED_KEY]: pinnedIds.value
    });
  } catch {
    // Keep local fallback if extension storage write fails.
  }
}

function isPinned(toolId) {
  return pinnedIds.value.includes(toolId);
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

    <section id="workspace" class="section-block reveal reveal--workspace">
      <div class="section-head">
        <h2 class="workspace-title">EASY TOOLS</h2>
        <p class="section-head__hint">{{ resultSummary }}</p>
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
