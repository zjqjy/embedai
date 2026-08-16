---
title: 嵌入式 AI 开发环境 · 四层工作流
date: 2026-08-16
tags: [嵌入式, AI工具, Claude Code, 教程]
categories: [嵌入式]
description: VSCode + Claude Code + EM-SKILL + Git + STM32CubeMX + Keil + ccswitch,把现在用的工具重新摆一遍位置。
---

如果你是**用 Keil + CubeMX 入门**的嵌入式工程师,或者还在**百度 + CSDN 拼凑代码**的学生 —— 这篇文章把你现在用的工具重新摆一遍位置。**写代码、版本控制、基础框架、编译交付**,四层各司其职;四层之外,还有一个管 AI 订阅的后勤。

本期所有资料打包放在网盘,链接在主页简介自取。

* * *

## 先回忆一下 —— 你最早是怎么学的?

**CubeMX 配引脚 → Keil 写代码 → 编译下载。** 学生时代一个工程一个工程地练,学会了外设、看时序。这条路走得通,很多学校实验室还这么教。

做项目遇到问题 → **百度 / CSDN 搜一段,复制进去试。** 不行换一篇,再试。论坛博客拼拼凑凑也能解决。

这两种方式有问题吗?**没有。** 在 AI Agent 出现之前,这是嵌入式开发者最主流、最有效的路。

但今天 —— 工具的角色变了。同一把刀,从切菜变成了雕花。

* * *

## 这套环境的四层结构

按工作流拆成四层,外加一个后勤:

```
L1  写代码     VSCode  +  Claude Code  +  EM-SKILL
L2  版本控制   Git
L3  基础框架   STM32CubeMX
L4  编译交付   MDK5 Keil
后   勤        ccswitch (四层之外)
```

* * *

## 每一层 —— 工具的角色

### L1 · 写代码

- **VSCode** —— 创作中心。编辑体验 + 扩展生态 + AI 插件支持,更适合干写代码这件事。**只管写,编译不归它。**
- **Claude Code** —— Anthropic 官方。**不是补全,是 Agent。** 用自然语言让它写 HAL 驱动、解释函数、修 bug —— 身边坐了个 AI 结对工程师。
- **EM-SKILL** —— 嵌入式管理技能。**管项目上下文 + 编译下载 + 串口。** AI 每次接手不用重交代,验证闭环不离开编辑器。

### L2 · 版本控制

- **Git** —— **后悔药。** AI 生成的代码可能有坑。每写完一个模块 commit 一次,清晰记录也帮 AI 理解项目演进。

### L3 · 基础框架

- **STM32CubeMX** —— 角色没变。配时钟、配外设、生成 HAL。**血肉都长在骨骼上。**

### L4 · 编译交付

- **MDK5 Keil** —— 退居后台。**不写代码,只出工具链。** EM-SKILL 一键编译下载,底层调的就是它。疑难问题再打开它做断点、看寄存器 —— 最后一棒归它。

### 后勤 · 四层之外

- **ccswitch** —— 开源 / 免费 / 跨平台。统一管 **Claude Code / Codex / Gemini CLI** 的订阅与渠道切换。顺带管 MCP / Token 用量。

* * *

## 一句话

**VSCode + Claude Code + EM-SKILL** 写代码,Git 管版本,CubeMX 出骨骼,Keil 管编译交付,ccswitch 盯 AI 订阅。

**而你 —— 只负责架构设计和审查。**

* * *

## 本期资料

> ⚠ 预览稿提示:8 个占位符待替换,编辑时全局搜索 `TODO-DL`。

| # | 名称 | 链接 |
|---|------|------|
| 1 | VSCode | <https://code.visualstudio.com/> <!-- TODO-DL-02 --> |
| 2 | Claude Code | <https://pan.baidu.com/s/1lxHPVq5PomOaPuRURq5hUQ?pwd=4tff> <!-- TODO-DL-03 --> |
| 3 | Git | <https://pan.baidu.com/s/1Ry0XkUb9RszWcbHK4vIpxw?pwd=bmed> <!-- TODO-DL-04 --> |
| 4 | STM32CubeMX | <https://pan.baidu.com/s/1JDrIOHRH0Mi1qSwe-Uvh_A?pwd=u59n> <!-- TODO-DL-05 --> |
| 5 | Keil MDK5 | <https://pan.baidu.com/s/16PswbhiCwlleNBXZ--kwHA?pwd=mtib> <!-- TODO-DL-06 --> |
| 6 | ccswitch | <https://pan.baidu.com/s/1PP8jQxOts-0NV3s8Zootvw?pwd=ccfz> <!-- TODO-DL-07 --> |
| 7 | 嵌入式管理技能(EM-SKILL) | <https://pan.baidu.com/s/1F4Zn_TqWDBuC7eThJeZqew?pwd=hwr6> <!-- TODO-DL-08 --> |

* * *

## 加入交流

如果在搭环境或使用过程中遇到任何疑问,欢迎扫码加入 QQ 交流群一起讨论:

<img src="/images/claude-code-install/qq交流群号.jpg" width="280" alt="QQ交流群">

> 💬 与志同道合的朋友一起交流学习。

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

* * *

这里是 **阿晨的碎碎念**,我们下期再见。