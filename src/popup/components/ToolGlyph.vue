<script setup>
import { computed } from "vue";

const props = defineProps({
  toolId: {
    type: String,
    required: true
  }
});

const glyph = computed(() => glyphMap[props.toolId] || glyphMap.default);

const glyphMap = {
  xhs_comment_crawler: {
    viewBox: "0 0 48 48",
    paths: [
      "M12 16.5C12 13.462 14.462 11 17.5 11h13C33.538 11 36 13.462 36 16.5v8C36 27.538 33.538 30 30.5 30H22l-6.5 5v-5h2.5C14.686 30 12 27.314 12 24z",
      "M18 18h12",
      "M18 23h8"
    ]
  },
  douyin_comment_crawler: {
    viewBox: "0 0 48 48",
    paths: [
      "M27 11v14.25a6.75 6.75 0 1 1-6.75-6.75",
      "M27 14.5c1.667 2.333 4 3.833 7 4.5",
      "M20.25 18.5a6.75 6.75 0 1 0 6.75 6.75"
    ]
  },
  dy_video_list_crawler: {
    viewBox: "0 0 48 48",
    paths: [
      "M11 15.5h17",
      "M11 23.5h12",
      "M11 31.5h10",
      "M31.5 29.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z",
      "m36.5 34.5-3.2-3.2"
    ]
  },
  dy_video_recorder: {
    viewBox: "0 0 48 48",
    paths: [
      "M14 16.5a2.5 2.5 0 0 1 2.5-2.5h12A2.5 2.5 0 0 1 31 16.5v15a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 14 31.5z",
      "M34 20.5 28.5 24 34 27.5z",
      "M22.5 23.5a3.5 3.5 0 1 0 0 .001Z"
    ]
  },
  dy_video_download: {
    viewBox: "0 0 48 48",
    paths: [
      "M24 12v15",
      "m18 24-18 0",
      "m0 0 0 0",
      "m-5.5-5.5L24 31l5.5-5.5",
      "M14 35h20"
    ]
  },
  dy_video_crawler: {
    viewBox: "0 0 48 48",
    paths: [
      "m24 11 3.708 7.514 8.292 1.205-6 5.85 1.416 8.255L24 29.925l-7.416 3.899L18 25.569l-6-5.85 8.292-1.205Z",
      "M34.5 31.5h2",
      "M11.5 31.5h2"
    ]
  },
  seo_sort: {
    viewBox: "0 0 48 48",
    paths: [
      "M13 33.5h7",
      "M13 24h12",
      "M13 14.5h17",
      "M30.5 30.5h4",
      "M28.5 24h6",
      "M24.5 17.5h10"
    ]
  },
  default: {
    viewBox: "0 0 48 48",
    paths: [
      "M14 15h20v18H14z",
      "M19 20h10",
      "M19 26h6"
    ]
  }
};
</script>

<template>
  <svg class="tool-glyph" :viewBox="glyph.viewBox" fill="none" aria-hidden="true">
    <path
      v-for="pathValue in glyph.paths"
      :key="pathValue"
      :d="pathValue"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
