# 项目规格单：EmbedAI 博客

## Meta
- **创建日期**: 2026-03-31
- **项目类型**: Hexo 博客
- **框架版本**: Hexo 8.1.1
- **主题**: fluid 1.9.9
- **当前步骤**: 初始搭建
- **整体状态**: 刚初始化
- **项目路径**: C:\Users\zjq\Desktop\workspace\emedai\PersonalWebsite

## 博客配置

### 基本信息
- **网站名称**: EmbedAI - 嵌入式与AI技术分享
- **副标题**: 嵌入式技术 | AI人工智能 | 提示词工程
- **描述**: 分享嵌入式技术、AI应用与提示词工程，记录学习历程
- **关键词**: 嵌入式, STM32, Arduino, AI, ChatGPT, 提示词, 技术博客
- **作者**: EmbedAI
- **语言**: zh-CN
- **时区**: Asia/Shanghai

### 部署配置
- **部署类型**: Git
- **GitHub**: https://github.com/embedai/embedai.github.io.git
- **Gitee**: https://gitee.com/embedai/embedai.git
- **分支**: gh-pages
- **域名**: https://embedai.top

### 内容分类
| 分类 | 目录 |
|------|------|
| 嵌入式知识 | embedded |
| AI | ai |
| 提示词 | prompt |

## 技术栈

### 核心依赖
```json
{
  "hexo": "^8.0.0",
  "hexo-deployer-git": "^4.0.0",
  "hexo-generator-archive": "^2.0.0",
  "hexo-generator-category": "^2.0.0",
  "hexo-generator-index": "^4.0.0",
  "hexo-generator-tag": "^2.0.0",
  "hexo-renderer-ejs": "^2.0.0",
  "hexo-renderer-marked": "^7.0.0",
  "hexo-renderer-stylus": "^3.0.1",
  "hexo-server": "^3.0.0",
  "hexo-theme-fluid": "^1.9.9"
}
```

### 主题配置
- **主题**: fluid
- **语法高亮**: highlight.js
- **代码高亮**: line_number: true, auto_detect: false

## 开发步骤

### S1: 项目初始化
- **状态**: ✅ 已完成
- **开发内容**:
  1. 初始化 Hexo 项目
  2. 安装 fluid 主题
  3. 配置双平台部署 (GitHub/Gitee)
  4. 配置域名解析
- **验证方式**: 访问 https://embedai.top

### S2: 首页优化与内容规划
- **状态**: ✅ 已完成（v2.0 重构，2026-06-03）
- **讨论结论**: 见 `.emv2/discussion/20260331-homepage/`
- **HVR**: 见 `.emv2/checkpoints/HVR-S2-20260603.md`
- **开发内容**:
  1. S2-1: Hero 区域 ✅ 重写为渐变标题 + CTA + 实时日期
  2. S2-2: 分类导航卡片 ✅ 5 卡 + 状态标识（active/coming）+ 渐变光斑
  3. S2-3: 最新动态模块 ✅ 1 大 featured + 2 小卡 + 实时日期
  4. S2-4: 关于本站区域 ✅ 双卡（hello + stack） + 行动按钮
- **验证方式**: 本地 `hexo server` 预览 + 部署到 embedai.top 验证

#### 子任务详情

**S2-1: Hero 区域** ✅
- **开发内容**: "Embedded. Intelligent. 笔记." 标题 + sage→warm 渐变 + 终端光标
- **视觉**: 暖白底 + 柔和径向渐变光晕 + Plus Jakarta Sans 800
- **CTA**: 深色 pill 按钮，hover 上浮

**S2-2: 分类导航卡片** ✅
- **开发内容**: 5 张分类卡（AI 工具/提示词工程/嵌入式/开源项目/开源复刻）
- **状态**: 1 active（AI 工具）+ 4 coming
- **样式**: 渐变光斑右上角 + monospace 编号 + hover 上浮

**S2-3: 最新动态模块** ✅
- **开发内容**: 不对称布局，featured 大卡 + 2 张小卡
- **来源**: 硬编码指向 3 篇已发布文章
- **样式**: 圆角 20px + hover 上浮 + READ_FULL.md 引导

**S2-4: 关于本站** ✅
- **开发内容**: 双卡布局（hello + stack）
- **链接**: 关于本站 + B 站主页
- **栈信息**: 字体/部署/域名/硬件/AI（Claude Code daily pill）/主题

### S3: 主题定制
- **状态**: 待开始
- **讨论ID**: 待定
- **开发内容**:
  1. 自定义主题配色
  2. 配置评论系统 (Gitalk)
  3. 配置访问统计
  4. 添加自定义组件
- **验证方式**: 视觉效果符合预期

### S4: EM-SKILL 安装教程制作
- **状态**: ✅ 已完成
- **讨论ID**: 20260501-em-tutorial
- **需求**: 制作 EM-SKILL 安装与使用教程
- **文章文件**: `source/_posts/em-skill-install.md`
- **发布平台**: EmbedAI 博客
- **分类**: AI 工具使用 (ai-tools)
- **发布日期**: 2026-05-01
- **部署结果**: 成功

#### 子任务详情

| 步骤 | 状态 | 说明 |
|------|------|------|
| S4-1 | ✅ 完成 | 无截图（文章无图片） |
| S4-2 | ✅ 完成 | 文章已创建 |
| S4-3 | ✅ 完成 | 已部署到 embedai.top |

### S5: Claude Code 一键安装教程
- **状态**: 🔄 进行中
- **讨论ID**: 20260531-claude-oneclick
- **需求**: 制作 Claude Code 一键安装包教程
- **文章文件**: `source/_posts/claude-code-oneclick-install.md`
- **发布平台**: EmbedAI 博客
- **分类**: AI 工具使用 (ai-tools)
- **发布日期**: 2026-05-31
- **百度网盘**: https://pan.baidu.com/s/1L2SvQYygjVW5ZajcGqK02Q
- **提取码**: 86kq

#### 子任务详情

| 步骤 | 状态 | 说明 |
|------|------|------|
| S5-1 | ✅ 完成 | 文章已创建 |
| S5-2 | ✅ 完成 | QQ群二维码已复制 |
| S5-3 | ✅ 完成 | 文章二维码已生成 |
| S5-4 | ✅ 完成 | 成功部署到 embedai.top |

### S6: 嵌入式工具聚合 + 文章链接中央化（合并 S6+S7）
- **状态**: 🚧 开发中
- **讨论ID**: 20260816-embedded-tools
- **讨论目录**: `.emv2/discussion/20260816-embedded-tools/`
- **需求**: 工具聚合页（个人精选）+ 文章外链中央化管理（一键替换失效网盘）
- **关键决策**: 详见 `.emv2/decisions.md` D-S6-1 ~ D-S6-11
- **开发内容**:
  1. S6-A: 双数据层 + 现有文章迁移 — `links.yml` + `tools.yml` + `_posts/*.md` 外链迁移
  2. S6-B: 公开工具页 — `/tools/` + 卡片网格 + 筛选 + modal
  3. S6-C: 文章 helper + _posts/*.md 全面迁移 — `{% link "key" %}` + 改造所有外链文章
  4. S6-D: 统一 Admin `/admin/` — 双 tab（工具 / 链接）+ 实时 YAML + localStorage 草稿
  5. S6-E: 集成 + 测试 + 部署 — 首页入口 + e2e + 部署
- **验证方式**: 本地 `hexo server` + e2e 测试 + 部署到 embedai.top

#### 子任务详情

**S6-A: 双数据层 + 现有文章迁移** 🚧
- **开发内容**:
  - `source/_data/links.yml`：3-5 条链接（从现有文章 grep 出来）
  - `source/_data/tools.yml`：8 条工具（每类 2 条），links 引用 link keys
  - 迁移现有文章外链到 links.yml
- **schema**:
  - links: `{key, label, url, type, extract_code?, note?, added?}`
  - tools: `{name, category, tagline, reason, tags[], icon, links[{key, type}]}`
- **验证**: `hexo generate` 无报错 + 现有文章渲染**无视觉 regression**

**S6-B: 公开工具页 + 卡片渲染** [ ]
- **开发内容**: `source/tools/index.pug` + Hero + 卡片网格（复用 `.cat` 视觉）+ 导航 + 分类 chip + tag 过滤 + modal
- **验证**: `/tools/` 渲染 8 卡 + 3D/涟漪 + 筛选 + modal 显示多链接 + 提取码

**S6-C: 文章 helper + _posts/*.md 全面迁移** [ ]
- **开发内容**:
  - `themes/butterfly/scripts/link.js` 注册 `link(key, text)` helper
  - 改造所有 `_posts/*.md`：硬编码外链 → `{% link "key" %}`
- **验证**: helper 正确渲染 + 改 links.yml 一处 → rebuild → 全站同步

**S6-D: 统一 Admin `/admin/`** [ ]
- **开发内容**: 静态 HTML 编辑器（Tools + Links 双 tab + 实时 YAML + localStorage）
- **验证**: 双 tab 切换 + form 填表 + 实时生成 + 草稿持久化 + 粘贴闭环

**S6-E: 集成 + 测试 + 部署** [ ]
- **开发内容**: 首页分类卡接管 + `tests/e2e/{tools,admin,posts-links}.spec.js` + 部署
- **验证**: e2e 全绿 + embedai.top `/tools/` `/admin/` 在线 + **核心收益：改 links.yml 一个 url 全站同步**

## 人工验证记录（HVR）
- [HVR-S1-1] 2026-03-31: 初始部署验证 - 结果：成功

## 问题追踪
### 待解决问题
1. 暂无

### 已解决问题
1. 暂无

## 讨论记录索引
| 日期 | 讨论ID | 内容 |
|------|--------|------|
| 2026-03-31 | 20260331-homepage | 首页优化与导航门户设计 |
| 2026-05-31 | 20260531-claude-oneclick | Claude Code 一键安装教程 |
| 2026-08-16 | 20260816-embedded-tools | 嵌入式工具聚合页 + 管理界面 |

## 内容分类规划

### 嵌入式技术
- 📦 开源项目 (projects)
- 🔧 开源复刻 (replication)
- 📝 技术文章 (embedded)

### AI 应用
- 💡 AI 工具使用 (ai-tools)
- 📝 提示词工程 (prompt)

## 参考资料
- [Hexo 文档](https://hexo.io/docs/)
- [Fluid 主题文档](https://hexo.fluid-dev.com/docs/)
- [GitHub Pages 部署](https://hexo.io/docs/github-pages)
