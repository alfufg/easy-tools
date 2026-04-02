<script setup>
import ToolGlyph from "./ToolGlyph.vue";

defineProps({
  tool: {
    type: Object,
    required: true
  },
  recent: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["open", "toggle-pin"]);

function openTool() {
  emit("open");
}

function togglePin() {
  emit("toggle-pin");
}
</script>

<template>
  <a
    :href="tool.href"
    class="tool-card"
    :class="[
      { 'tool-card--recent': recent, 'tool-card--compact': compact, 'tool-card--pinned': pinned },
      `tool-card--${tool.accent || 'teal'}`
    ]"
    :style="$attrs.style"
    @click="openTool"
  >
    <div class="tool-card__top">
      <span class="tool-card__icon" aria-hidden="true">
        <ToolGlyph :tool-id="tool.id" />
      </span>
      <div class="tool-card__meta">
        <span class="tool-card__category">{{ tool.category }}</span>
        <span class="tool-card__spotlight">{{ tool.spotlight }}</span>
      </div>
      <button
        type="button"
        class="tool-card__pin"
        :class="{ 'is-active': pinned }"
        :aria-pressed="String(pinned)"
        :title="pinned ? '取消收藏' : '加入收藏'"
        @click.prevent.stop="togglePin"
      >
        {{ pinned ? "★" : "☆" }}
      </button>
    </div>
    <div class="tool-card__body">
      <h3>{{ tool.name }}</h3>
      <p class="tool-card__desc">{{ tool.description }}</p>
    </div>
    <div class="tool-card__tags">
      <span v-for="tag in tool.tags" :key="tag">{{ tag }}</span>
    </div>
    <div class="tool-card__footer">
      <span class="tool-card__platform">{{ tool.platform }}</span>
      <span class="tool-card__action">打开工具</span>
    </div>
  </a>
</template>
