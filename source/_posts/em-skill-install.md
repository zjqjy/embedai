---
title: EM-SKILL 嵌入式项目开发管家安装教程
date: 2026-05-01
tags: [AI工具, Claude Code, 嵌入式]
categories: [AI工具]
---

## EM-SKILL 是什么

EM-SKILL（Embedded Project Manager Skill）是运行在 Claude Code 中的嵌入式项目管理技能，专注于固件开发场景的**人机协作验证流程**。

```
EM-SKILL = 流程控制（verify 命令）+ 工具执行（build/flash/serial）
```

### 核心功能

| 命令 | 功能 |
|------|------|
| `/em verify s<N>` | 执行验证流程：编译 → 烧录 → 串口 |
| `/em new [功能]` | 新功能开发流程 |
| `/em disc [话题]` | 需求讨论流程 |
| `/em initem` | 初始化工具环境 |
| `/em rec` | 恢复项目状态 |

---

## 安装方式

### 方式一：ccswitch + 百度网盘（推荐）

如果网络访问 GitHub 不便，推荐使用 ccswitch 工具通过百度网盘下载：

{% link "em_skill_install" %}

### 方式二：Git 克隆

在 Claude Code 对话中输入以下命令：

```
帮我安装 {% link "github_embedded-project-manage" %} 的 skill
```

> 注意：安装过程中需要一直同意请求，整个过程可能需要较长时间，并会进行文件扫描和下载。

这会克隆整个项目仓库，其中包含：
- EM-SKILL 流程框架
- 内置工具（build-keil、flash-openocd、serial-monitor）

---

## 环境初始化

安装完成后，运行初始化命令：

```bash
/em initem
```

这会自动：
1. 探测并注册工具路径（OpenOCD、Keil、J-Link）
2. 配置 Claude Code 权限

---

## 验证流程

EM-SKILL 的核心是**人机协作验证流程**，确保嵌入式代码的正确性：

```
┌─────────────────────────────────────────────────────────┐
│  编译 (build-keil)                                     │
│  ├── 自动查找 .uvprojx 文件                            │
│  └── 输出：编译状态、产物路径、错误信息                 │
└────────────────────────┬────────────────────────────────┘
                         │ 成功
┌────────────────────────▼────────────────────────────────┐
│  烧录 (flash-openocd)                                 │
│  ├── 自动探测调试器                                   │
│  └── 输出：烧录状态、校验结果                         │
└────────────────────────┬────────────────────────────────┘
                         │ 成功
┌────────────────────────▼────────────────────────────────┐
│  串口 (serial-monitor)                                │
│  ├── 自动保存日志到 .emv2/logs/                      │
│  └── 输出：启动日志、错误分析                         │
└─────────────────────────────────────────────────────────┘
```

执行验证：
```bash
/em verify s1   # 验证第1步
```

---

## 快速开始

### 1. 接入已有项目

```bash
/em si /path/to/project
```

### 2. 新功能开发

```bash
/em new [功能描述]   # 启动需求讨论
```

### 3. 记录验证结果

```bash
/em result 通过   # 或 /em result 失败
```

---

## 内置工具

EM-SKILL 整合了以下优秀开源工具：

| 工具 | 来源 | 说明 |
|------|------|------|
| **build-keil** | embed-ai-tool | Keil MDK 编译 |
| **flash-openocd** | embed-ai-tool | OpenOCD 烧录 |
| **serial-monitor** | embed-ai-tool | 串口监控 |
| **OpenOCD** | xPack OpenOCD | 开源调试工具 |

---

## 交流群

如果在使用过程中有任何疑问，欢迎扫码加入 QQ 交流群一起讨论：

<img src="/images/claude-code-install/qq交流群号.jpg" width="300" alt="QQ交流群">

> 💬 加入群聊，与志同道合的朋友一起交流学习！

---

## 支持一下

笔记和资料都是免费的。如果觉得有帮助,可以请我喝杯咖啡,这会是更新的最大动力。

<div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin:16px 0 4px">
  <div style="text-align:center">
    <img src="/images/reward/alipay.jpg" width="130" alt="支付宝">
    <div style="font-size:12px;color:#858585;margin-top:6px;font-family:'JetBrains Mono',monospace">// 支付宝</div>
  </div>
  <div style="text-align:center">
    <img src="/images/reward/wechat.jpg" width="130" alt="微信">
    <div style="font-size:12px;color:#858585;margin-top:6px;font-family:'JetBrains Mono',monospace">// 微信</div>
  </div>
</div>

---

## 参考资源

- {% link "embed_ai_tool" %}
- {% link "xpack_openocd" %}
- {% link "em_skill_repo" %}

---

## 总结

EM-SKILL 为嵌入式开发者提供了标准化的验证流程，通过 `/em verify` 命令实现编译→烧录→串口监控的一键验证，大幅提升开发效率。

