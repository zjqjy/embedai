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
- **状态**: 进行中
- **讨论结论**: 见 `.emv2/discussion/20260331-homepage/`
- **开发内容**:
  1. S2-1: Hero 区域 - 修改 fluid 主题 banner 配置
  2. S2-2: 分类导航卡片 - 创建分类入口
  3. S2-3: 最新动态模块 - 配置文章列表
  4. S2-4: 关于本站区域 - 添加关于信息
- **验证方式**: 本地 `hexo server` 预览

#### 子任务详情

**S2-1: Hero 区域**
- **前置条件**: 无
- **开发内容**: 修改 banner 文案
- **验证方式**: 本地预览

**S2-2: 分类导航卡片**
- **前置条件**: S2-1
- **开发内容**: 创建分类页面，添加导航卡片
- **验证方式**: 点击分类卡片验证跳转

**S2-3: 最新动态模块**
- **前置条件**: S2-1
- **开发内容**: 配置文章列表数量和样式
- **验证方式**: 预览文章列表

**S2-4: 关于本站**
- **前置条件**: S2-1
- **开发内容**: 添加关于信息
- **验证方式**: 预览页面

### S3: 主题定制
- **状态**: 待开始
- **开发内容**:
  1. 自定义主题配色
  2. 配置评论系统 (Gitalk)
  3. 配置访问统计
  4. 添加自定义组件
- **验证方式**: 视觉效果符合预期

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
