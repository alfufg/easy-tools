export const tools = [
  {
    id: "xhs_comment_crawler",
    name: "小红书评论采集",
    description: "按关键词、链接或达人 ID 抓取评论，适合内容舆情和投放复盘。",
    href: "../tools/xhs_comment_crawler/sidepanel.html",
    category: "评论采集",
    platform: "小红书",
    icon: "红",
    tags: ["关键词", "链接", "达人 ID"],
    accent: "berry",
    spotlight: "热点评论回收"
  },
  {
    id: "douyin_comment_crawler",
    name: "抖音评论采集",
    description: "针对抖音视频或达人评论做批量采集，便于沉淀互动数据。",
    href: "../tools/douyin_comment_crawler/sidepanel.html",
    category: "评论采集",
    platform: "抖音",
    icon: "抖",
    tags: ["关键词", "链接", "达人 ID"],
    accent: "sunset",
    spotlight: "互动反馈分析"
  },
  {
    id: "dy_video_list_crawler",
    name: "抖音关键词视频采集",
    description: "根据关键词抓取视频列表和达人信息，适合选题和对标账号分析。",
    href: "../tools/dy_video_list_crawler/sidepanel.html",
    category: "视频采集",
    platform: "抖音",
    icon: "搜",
    tags: ["关键词", "视频列表", "达人数据"],
    accent: "teal",
    spotlight: "选题和对标"
  },
  {
    id: "dy_video_recorder",
    name: "抖音视频录屏",
    description: "输入视频链接后自动录屏，适合取证、归档和案例留存。",
    href: "../tools/dy_video_recorder/index.html",
    category: "视频处理",
    platform: "抖音",
    icon: "录",
    tags: ["自动录屏", "取证", "归档"],
    accent: "ink",
    spotlight: "自动化留档"
  },
  {
    id: "dy_video_download",
    name: "抖音视频下载",
    description: "无水印下载抖音视频素材，方便二次整理和本地保存。",
    href: "../tools/dy_video_download/index.html",
    category: "视频处理",
    platform: "抖音",
    icon: "下",
    tags: ["无水印", "下载", "本地保存"],
    accent: "amber",
    spotlight: "素材归档"
  },
  {
    id: "dy_video_crawler",
    name: "星图视频数据采集",
    description: "通过星图达人详情链接或达人 ID 抓取视频数据，适合商务投放评估。",
    href: "../tools/dy_video_crawler/index.html",
    category: "达人分析",
    platform: "巨量星图",
    icon: "星",
    tags: ["达人详情", "视频数据", "投放分析"],
    accent: "violet",
    spotlight: "商务投放评估"
  },
  {
    id: "seo_sort",
    name: "网站收录排位查询",
    description: "按关键词和网址查询搜索平台收录表现，快速查看自然排名结果。",
    href: "../tools/seo_sort/index.html",
    category: "SEO",
    platform: "搜索平台",
    icon: "排",
    tags: ["关键词", "网址", "排名查询"],
    accent: "forest",
    spotlight: "自然流量追踪"
  }
];

export const categories = ["全部", ...new Set(tools.map((tool) => tool.category))];
