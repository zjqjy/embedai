# 项目记忆日志 - EmbedAI 博客

## 会话指纹
- **项目ID**: embedai-blog-20260331
- **当前会话**: 2026-04-05

## 当前状态
- **步骤**: S2 完成大部分子步骤
- **状态**: 已完成
- **最后活跃**: 2026-06-03

## 项目概述
这是一个基于 Hexo + Butterfly 主题的技术博客项目，主要分享嵌入式技术和 AI 应用内容。v2.0 视觉重构完成（2026-06-03），从深色"AI 俗套"风格升级为暖白小清新风格。

## 已完成工作
- [2026-04-04] Claude Code 安装教程文章已完成（包含 20 张截图）
- [2026-04-04] 首页自定义样式已恢复（深色渐变背景 + 圆形头像 + 分类卡片）
- [2026-04-04] 成功部署到 GitHub Pages
- [2026-05-01] EM-SKILL 安装教程文章已完成并发布
- [2026-05-31] Claude Code 一键安装教程文章已创建并部署
- [2026-06-03] v2.0 整站视觉重构：小清新暖白风格 + Plus Jakarta Sans 字体 + sage/warm 双色板
- [2026-06-03] 三页（首页/about/coming-soon）视觉语言统一
- [2026-06-03] 全文 AI 工具文案 "ChatGPT/Claude/Gemini" → "Claude Code"
- [2026-06-03] 部署到 embedai.top，commit 1c3e819

## 进行中工作
暂无

## 关键决策
- [2026-03-31] 部署到 GitHub Pages
- [2026-03-31] 使用 embedai.top 作为主域名
- [2026-03-31] 首页定位为导航引导门户，不只是内容列表
- [2026-03-31] 分类结构：嵌入式(开源项目/开源复刻/技术文章) + AI(AI工具/提示词)
- [2026-04-04] Butterfly 主题的自定义首页需要直接修改 `themes/butterfly/layout/index.pug`
- [2026-06-03] 视觉风格：小清新暖白底 + sage green (#6b9e83) 主色 + warm amber (#e8a87c) 强调
- [2026-06-03] 字体系统：Plus Jakarta Sans（标题/数据） + DM Sans（正文） + JetBrains Mono（元数据）
- [2026-06-03] AI 工具定位：从多模型评测 → 专注 Claude Code 教程

## 人工验证历史
- [2026-03-31] S1-1: 初始部署验证 - 通过
- [2026-04-04] 首页样式验证 - 通过
- [2026-06-03] S2-20260603: v2.0 整站视觉重构 - 通过（HVR 见 .emv2/checkpoints/HVR-S2-20260603.md）

## 已知问题
暂无

## 项目结构
```
PersonalWebsite/
├── .emv2/                    # 项目管理目录
│   ├── checkpoints/          # HVR 验证记录
│   ├── discussion/           # 需求讨论
│   └── logs/                 # 串口/部署日志
├── .github/                  # GitHub 配置
├── node_modules/             # 依赖
├── public/                   # 生成的静态文件
├── scaffolds/                # 文章模板
├── scripts/                  # 自定义脚本
├── source/                   # 源文件
│   ├── _posts/              # 博客文章（3 篇）
│   ├── images/              # 文章图片
│   ├── about/index.html     # 关于页（v2.0 小清新）
│   └── coming-soon/index.html # 占位页（v2.0 小清新）
├── themes/
│   └── butterfly/            # Butterfly 主题
│       └── layout/index.pug  # 首页模板（v2.0 小清新）
├── .screenshots/             # 验证截图（v2.0 部署前后对比）
├── _config.yml              # Hexo 配置
└── package.json             # 项目依赖
```
