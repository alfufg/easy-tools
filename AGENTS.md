# PROJECT KNOWLEDGE BASE

**Generated:** 2025-03-31
**Project:** Easy Tools - Chrome Extension

## OVERVIEW

多工具合一的 Chrome 浏览器扩展，集成小红书评论采集、抖音评论采集、视频下载/录屏、SEO 排位查询等功能。

## STRUCTURE

```
.
├── manifest.json           # 主扩展配置
├── pyproject.toml          # Python 项目配置
├── src/
│   ├── background.js       # 全局后台服务
│   ├── popup/
│   │   └── index.html      # 工具入口面板
│   ├── tools/              # 工具目录
│   │   ├── xhs_comment_crawler/    # 小红书评论采集
│   │   ├── douyin_comment_crawler/ # 抖音评论采集
│   │   ├── dy_video_recorder/      # 视频录屏
│   │   ├── dy_video_download/      # 视频下载
│   │   ├── dy_video_crawler/       # 星图视频采集
│   │   ├── seo_sort/               # SEO 排位查询
│   │   └── demo/                   # 示例代码
│   ├── libs/               # 第三方库
│   │   ├── jquery/         # jQuery 3.7.1
│   │   ├── layui/          # UI 框架
│   │   ├── sheetjs/        # Excel 处理
│   │   ├── handsontable/   # 表格组件
│   │   ├── moment/         # 日期处理
│   │   └── filesaver/      # 文件下载
│   └── assets/
│       └── icons/          # 扩展图标
└── absolute/               # (测试目录)
```

## WHERE TO LOOK

| 任务 | 位置 | 说明 |
|------|------|------|
| 添加新工具 | `src/tools/[tool-name]/` | 每个工具独立目录，包含 manifest.json |
| 修改入口面板 | `src/popup/index.html` | 工具导航面板 |
| 全局数据库操作 | `src/background.js` | IndexedDB 初始化和管理 |
| 第三方库 | `src/libs/` | 统一存放外部依赖 |
| 扩展配置 | `manifest.json` | 权限、入口点配置 |

## CONVENTIONS

### 工具目录结构
每个工具应遵循以下结构：
```
src/tools/[tool-name]/
├── manifest.json      # 工具级配置
├── service-worker.js  # 后台脚本
├── sidepanel.html     # 侧边栏 UI
└── sidepanel.js       # 侧边栏逻辑
```

### 代码规范
- **语言**: ES6+ JavaScript
- **注释**: 中文注释优先
- **模块**: 使用 ES6 import/export
- **异步**: 使用 async/await，避免回调

### IndexedDB 规范
- 数据库名: `toolsDB`
- 所有表通过 `src/background.js` 统一管理
- 使用 `DBHelper` 类封装数据库操作

## ANTI-PATTERNS

- ❌ 不要直接在工具目录外创建新的 manifest.json
- ❌ 不要在 sidepanel 中使用内联脚本（CSP 限制）
- ❌ 不要绕过 DBHelper 直接操作 IndexedDB
- ❌ 避免使用 var，使用 let/const
- ❌ 不要在代码中使用 `eval()` 或 `new Function()`

## TOOLS OVERVIEW

| 工具 | 功能 | 路径 |
|------|------|------|
| 小红书评论采集 | 按关键字/链接/ID采集评论 | `src/tools/xhs_comment_crawler/` |
| 抖音评论采集 | 按关键字/链接/ID采集评论 | `src/tools/douyin_comment_crawler/` |
| 抖音视频录屏 | 自动录屏取证 | `src/tools/dy_video_recorder/` |
| 抖音视频下载 | 无水印视频下载 | `src/tools/dy_video_download/` |
| 星图视频采集 | 达人视频数据采集 | `src/tools/dy_video_crawler/` |
| SEO 排位查询 | 搜索平台收录查询 | `src/tools/seo_sort/` |

## DEPENDENCIES

### 第三方库
- **jQuery 3.7.1**: DOM 操作
- **Layui**: UI 组件框架
- **SheetJS**: Excel 导入导出
- **Handsontable**: 电子表格组件
- **Moment.js**: 日期处理
- **FileSaver.js**: 文件下载

## NOTES

- 扩展使用 Chrome Manifest V3
- Side Panel 需要 Chrome 114+
- 所有工具共享 IndexedDB 数据库 `toolsDB`
- 数据库升级需修改 `src/background.js` 中的版本号
- 开发时需开启 Chrome 开发者模式加载扩展
