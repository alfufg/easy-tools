import { computed, onMounted, ref } from "vue";
import { categories, tools } from "../popup/data/tools";

const STORAGE_KEY = "easy_tools_recent_tool";
const PINNED_KEY = "easy_tools_pinned_tools";
const PINNED_FALLBACK_KEY = "easy_tools_pinned_tools_fallback";

export function useWorkspaceState() {
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

  return {
    categories,
    tools,
    search,
    activeCategory,
    recentId,
    pinnedTools,
    groupedTools,
    resultSummary,
    visibleTools,
    rememberTool,
    togglePinned,
    isPinned
  };
}
