<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# CoeurVers — New Tab

**一款极简、高度可定制的浏览器新标签页扩展**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen?logo=google-chrome)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)

</div>

---

## ✨ 功能特性

### 🖼️ 壁纸系统
- **Unsplash 策展画廊** — 内置精选高质量壁纸，开箱即用
- **幻灯片模式** — 自动轮播，间隔时间可自由调节（15 秒 ~ 10 分钟）
- **收藏夹** — 从画廊中挑选喜欢的壁纸并锁定轮播范围
- **自定义上传** — 支持使用本地图片或远程 URL 作为背景
- **模糊 & 亮度** — 实时调节壁纸模糊程度，让快捷方式更易阅读

### 📌 快捷方式网格
- **完全自定义布局** — 自由设置行数、列数、图标大小及间距
- **文件夹 & 多级嵌套** — 支持文件夹结构，无限层级钻取导航
- **拖拽排序** — 在同一层级内自由拖拽调整顺序
- **拖拽合并** — 将书签拖到另一个书签上可自动创建文件夹
- **智能图标** — 自动抓取网站 Favicon，失败时生成彩色文字图标
- **自定义图标** — 支持手动指定图标 URL
- **新标签页** — 可选择在新标签页或当前标签页中打开链接

### 🕐 禅意时钟
- 全屏时钟模式，专注沉浸
- 点击即可在「时钟模式」与「快捷方式模式」之间切换
- 自定义问候语

### ⚙️ 设置 & 数据
- 可视化设置面板，实时预览效果
- 支持导出 / 导入配置（JSON），方便多设备同步
- 全部数据保存在本地 `localStorage`，无任何云端上传

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|---|---|---|
| React | 19 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6 | 构建工具 |
| Tailwind CSS | v4 | 样式系统 |
| Lucide React | 0.555 | 图标库 |

---

## 🚀 本地开发

**前置要求：** Node.js ≥ 18

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（http://localhost:3000）
npm run dev
```

> 开发模式下在浏览器中访问 `http://localhost:3000` 即可预览，无需加载扩展。

---

## 📦 打包为 Chrome 扩展

```bash
npm run pack
```

构建完成后会在项目根目录生成 `CoeurVers-extension.zip`，可直接上传至 Chrome 开发者控制台。

---

## 🔧 安装扩展（开发者模式）

1. 执行 `npm run build` 生成 `dist/` 目录
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `dist/` 目录
5. 打开新标签页即可看到效果 🎉

---

## 📁 项目结构

```
CoeurVers/
├── components/         # React UI 组件
│   ├── ShortcutGrid.tsx    # 快捷方式网格（拖拽、文件夹、编辑）
│   ├── SettingsModal.tsx   # 设置面板
│   └── ZenClockPanel.tsx   # 禅意时钟
├── hooks/              # 自定义 Hooks
├── lib/                # 工具函数（快捷树操作、存储、图标等）
├── services/           # 壁纸服务、缓存
├── public/             # 扩展静态资源（manifest、图标）
├── types.ts            # 全局 TypeScript 类型
└── App.tsx             # 根组件
```

---

## 📄 License

[MIT](LICENSE)
