# EmbedAI 个人博客(阿程的碎碎念)

Hexo 8 + Butterfly 主题的静态博客,部署在 GitHub Pages(embedai.top)。
内容三件套:**文章**(source/_posts)、**工具**(source/_data/tools.yml)、**链接**(source/_data/links.yml)。

## 常用命令

```bash
npm run build     # hexo generate → public/
npm run preview   # http://localhost:4321 预览 public/(改完必看)
npm test          # playwright e2e(chromium + 移动端),提交前必跑
npm run admin     # 管理后台 http://localhost:3000/admin/(改 admin-server.js 后必须重启)
npx hexo deploy   # 重新生成 + push 到 gh-pages(线上 1-2 分钟生效)
```

## 一、新建文章

**方式 A — 命令行**(推荐):

```bash
npx hexo new "文章标题"
# 生成 source/_posts/文章标题.md,然后编辑 frontmatter:
```

**方式 B — admin 后台**:`npm run admin` → 文章 tab → ＋新建文章 → 保存(自动备份 .bak)。

frontmatter 规范(照这个写,首页/统计全靠它):

```yaml
---
title: 嵌入式 AI 开发环境 · 四层工作流
date: 2026-08-16
tags: [嵌入式, AI工具, Claude Code, 教程]     # 行内列表,标签随便加
categories: [嵌入式]                            # 只选一个,新分类会自动出现在首页分类卡
description: 一句话摘要,显示在首页文章卡上。      # 不写则截正文前 90 字
---
```

注意:
- 文章 URL = `/年/月/日/文件名/`,**文件名即 slug,只用英文/数字/连字符**
- 发完 `npx hexo deploy` 即可——首页「最新文章」(最新 5 篇,第一篇 featured)、统计数、分类卡**全是数据驱动,不用改任何模板**
- 新分类想自定义首页卡片图标/文案:编辑 `themes/butterfly/layout/index.pug` 里的 `catMeta` 字典(key 是分类显示名)

## 二、工具(tools.yml)

`source/_data/tools.yml` 是数组,一个工具一条:

```yaml
- name: Keil MDK5
  category: dev            # 分类 key,新 key 会自动出现在工具页筛选 chip
  icon: ⚙️                # 单个 emoji 或短文本
  tagline: 一句话定位
  reason: 推荐理由(modal 里显示)
  tags: [嵌入式, ARM]       # 可点筛选的标签
  links:
    - key: keil           # ★ 引用 links.yml 里的 key,URL/提取码自动带过来
      type: 官网
```

category 中文名映射在 `source/tools/tools.js` 顶部 `CAT_LABELS`(`dev → 软件开发`),新分类想显示中文名就加一行,不加则兜底显示 key 本身。

**方式 B — admin 后台**:工具 tab,可视化编辑 + 「📦 从文章提取」可扫描文章里的网盘链接自动生成工具条目。

## 三、链接(links.yml)

`source/_data/links.yml` **按文章 slug 嵌套**,是全站链接的中央注册表:

```yaml
claude-code-install-guide:          # 文章 slug(= 文件名)
  - key: claude_oneclick            # 唯一 key,英文/数字/下划线/连字符
    label: Claude Code 一键安装包
    url: https://pan.baidu.com/s/1L2SvQYygjVW5ZajcGqK02Q
    extract_code: 86kq              # 网盘提取码(工具页跳转时自动拼 ?pwd=)
    type: baidu                     # official / baidu / github / signup…
    status: active                  # active / warning(有替代) / broken
    note: 备注,可选
```

**文章正文里引用链接,不要直接贴 URL**:

```markdown
下载地址:{% link "claude_oneclick" %}
```

渲染时由 `themes/butterfly/scripts/link.js` 替换成真实 URL。改链接只动 links.yml 一处,全站(文章 + 工具页 + admin)同步。

文章里已有的裸 URL(admin 链接 tab 会标「内联」):后台点「📝 注册」一键迁移——自动替换正文为 `{% link %}` 并写入 links.yml。

## 四、改完之后的流程

```bash
npm run build && npm test   # 63+ 个 e2e,全绿再往下
npm run preview             # 4321 端口肉眼检查
npx hexo deploy             # 上线
```

## 关键约定(别踩坑)

- **首页/工具页都是数据驱动**:文章卡、分类卡、统计数、筛选 chip 全部自动更新,不要手改模板加内容
- 自定义交互(`data-tilt/ripple/reveal/count-up/char-in/typewriter`、自定义光标)在 `source/js/site.js` + `source/css/site.css`,新页面引入即可;磁吸 `data-magnetic` **只用于 CTA 按钮,不许挂导航链接**
- 渐变文字 + `data-char-in` 冲突:渐变必须写在 `[data-char]` 子选择器上,否则文字透明
- admin 保存会自动生成 `.bak` 备份(已 gitignore);admin-server 是常驻进程,**改完 admin-server.js 必须重启**
- 文章页无封面时 prev/next + 推荐卡的浅色样式在 `source/css/post-override.css`;给文章 frontmatter 加 `cover: /img/xxx.jpg` 即恢复主题封面样式
