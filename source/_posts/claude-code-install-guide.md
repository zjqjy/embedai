---
title: Claude Code 安装教程
date: 2026-04-02 21:10:00
categories:
  - AI工具
tags:
  - Claude
  - AI
  - 安装教程
toc: true
---

## Claude Code 安装教程

### 第一部分：概述

**Claude Code 是什么？**

Claude Code 是 {% link "claude_official" %} 推出的命令行工具，可以让你在终端中直接使用 Claude AI 进行编程辅助。它能帮你：

- 阅读和理解代码
- 自动编写和修改代码
- 调试和修复 bug
- 执行 Git 操作
- 解释技术概念

简单来说，它就像一个随时待命的 AI 编程助手，直接在你的终端里为你服务。

**为什么要用 Claude Code？**

相比网页版 Claude，Claude Code 可以直接访问你的项目文件，理解项目结构，帮你完成实际的编码工作。对于开发者来说，这是提升效率的强力工具。

---

### 第二部分：为什么选择这个教程

很多人在安装 Claude Code 时会遇到各种坑：下载慢、配置复杂、不知道用什么 API...

**这个教程的特点：**

1. **快速简单**：提供国内百度网盘下载，无需翻墙，配置步骤清晰明了
2. **实用**：搭配 MiniMax Coding Plan，不按 token 计费，5 小时刷新窗口，个人开发完全够用

> **百度网盘下载：**
{% link "claude_install_v4nb" %}
> 包名：install_cloud_code.zip
>
> 网盘包含：ccwsitch、Claude Code、Git 三个安装包

---

### 第三部分：实操

---

## 3.1 Claude Code 安装及配置

### 第一步：放置文件夹

1. 解压 Claude Code 压缩包
2. 将解压后的文件夹放到电脑合适的盘符，这里是 D 盘

![Claude Code 压缩包](/images/claude-code-install/claude_1.png)

![放到 D 盘](/images/claude-code-install/claude_2_放D盘.png)

---

### 第二步：配置环境变量

1. 按 `Win + R`，输入 `cmd`，回车

![WIN+R 打开 cmd](/images/claude-code-install/claude_3_cmd.png)

2. 在 cmd 窗口中输入以下命令打开环境变量设置：
   ```
   rundll32 sysdm.cpl,EditEnvironmentVariables
   ```

3. 在弹出的窗口中编辑 Path，新建一个变量添加路径：
   ```
   D:\ClaudeCode
   ```

![编辑环境变量](/images/claude-code-install/claude_4_环境变量.png)

4. 点击确定保存设置

---

### 第三步：验证安装

1. 重新打开终端（Win + R，输入 cmd）
2. 输入以下命令验证：
   ```
   claude --version
   ```

如果显示版本号，说明安装成功。

![安装验证](/images/claude-code-install/claude_4_安装验证.png)

---

## 3.2 ccswitch 安装及配置

ccswitch 是管理 Claude Code 工作环境的工具。

### 第一步：安装 ccswitch

运行 `CC-Switch-v3.12.3-Windows` 安装程序，按照提示完成安装。

![ccswitch 安装](/images/claude-code-install/1_安装包.png)

> ⚠️ **如果 Windows 无法识别 msi 安装文件**，需要进行重新注册安装服务

![无法识别msi](/images/claude-code-install/1_windows无法识别msi安装文件.jpg)

**第一步**：按 `Win + R`，输入 `services.msc`，找到安装服务程序路径

![打开服务](/images/claude-code-install/2_打开服务.png)
![查看安装服务路径](/images/claude-code-install/3_无法识别msi查看安装服务路径.png)

---

**第二步**：在 Windows 搜索栏搜索 `cmd`，并以**管理员身份**运行

![以管理员身份运行cmd](/images/claude-code-install/4_以管理员身份运行cmd.png)

---

**第三步**：在 cmd 中依次执行以下命令

```cmd
msiexec /unregister
msiexec /regserver
assoc .msi=MSI.Package
ftype MSI.Package="C:\Windows\System32\msiexec.exe" /i "%1" %*
```

![重新注册安装服务](/images/claude-code-install/5_重新注册安装服务.png)

---

**第四步**：重启计算机，就可以正常安装 msi 文件了

---

### 第二步：添加供应商

1. 打开 ccswitch
2. 点击右上角的加号 (+) 添加供应商

![添加供应商](/images/claude-code-install/4_添加供应商.png)

---

### 第三步：选择 minmax

在供应商列表中选择 minmax

![选择 minmax](/images/claude-code-install/2_选minmax.png)

---

### 第四步：获取 API Key

点击"获取 API Key"按钮

![获取 API Key](/images/claude-code-install/4_官网链接.png)

---

### 第五步：订阅 Token Plan

在 MiniMax 官网订阅合适的 Token Plan

👉 {% link "minimax_token_plan" %}

---

### 第六步：复制 API

复制获得的 API 密钥

![复制 API](/images/claude-code-install/6_复制api.png)

---

### 第七步：配置 ccswitch

将复制的 API 粘贴到 ccswitch 中，点击确认保存

![粘贴到 ccswitch](/images/claude-code-install/7_黏贴到ccswitch.png)

---

> ⚠️ **如果使用 ccswitch 时出现文字重叠**，可以按以下步骤解决

![文字重叠](/images/claude-code-install/6_文字重叠.png)

---

**第一步**：让 Claude Code 帮忙安装一个 **Windows Terminal**

![让Claude Code安装](/images/claude-code-install/7_让claude%20_code安装.png)

---

**第二步**：找到 ccswitch 的设置

![找到ccswitch设置](/images/claude-code-install/8_找到ccswitch的设置.png)

---

**第三步**：更改首选终端为 **Windows Terminal**

![更改首选终端](/images/claude-code-install/9_更改首选终端.png)

---

配置完成后，以后打开终端在 ccswitch 中就不会有叠字的问题。

---

## 3.3 Git 安装和环境变量配置

Git 是版本控制工具，Claude Code 部分命令依赖它。

### 第一步：安装 Git

1. 点击安装包 `Git-2.53.0.2-64-bit.exe`
2. 选择合适的安装路径（记住这个路径，后面环境变量配置需要用到）
3. 一路下一步完成安装

![Git 安装包](/images/claude-code-install/1_git安装包.png)

---

### 第二步：配置环境变量

1. 按 `Win + R`，输入 `cmd`，回车
2. 在 cmd 窗口中输入以下命令打开环境变量设置：
   ```
   rundll32 sysdm.cpl,EditEnvironmentVariables
   ```
3. 新建用户变量：
   - 变量名：`CLAUDE_CODE_GIT_BASH_PATH`
   - 变量值：`D:\Git\Git\bin\bash.exe`（替换为你自己的 Git 安装路径）
4. 点击确定保存

![Git 环境变量配置](/images/claude-code-install/2_环境变量.png)

---

### 第三步：验证 claude 命令

打开 cmd，输入 `claude` 查看是否有正常输出。

![Git 验证](/images/claude-code-install/3_验证.png)

---

### 第四步：ccswitch 终端配置

1. 打开 ccswitch
2. 点击打开终端按钮（垃圾桶旁边的按钮）

![打开 ccswitch 终端](/images/claude-code-install/4_ccswitch验证.png)

---

### 第五步：修复环境变量错误

如果提示找不到 Git 环境变量错误，需要在当前终端执行以下命令设置临时环境变量：
```
set CLAUDE_CODE_GIT_BASH_PATH=D:\Git\Git\bin\bash.exe
```

![修复环境变量错误](/images/claude-code-install/6_修复.png)

---

### 第六步：重启 ccswitch

1. 退出 ccswitch

![退出 ccswitch](/images/claude-code-install/7_推出ccswitch.png)

2. 重新打开 ccswitch，再次打开终端验证

![重新打开验证](/images/claude-code-install/8_重新打开修复.png)

如果终端能正常显示 claude 响应，说明配置成功！

---

## 3.4 配置联网搜索 MCP

MCP (Model Context Protocol) 是 MiniMax 提供的联网搜索功能，可以让你的 Claude Code 具备联网搜索能力。

---

### 第一步：安装 uvx

打开 PowerShell（管理员），运行以下命令：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

![以管理员身份运行](/images/claude-code-install/1_以管理员身份运行.png)

![执行安装命令](/images/claude-code-install/2_执行安装命令.png)

---

### 第二步：验证安装

```powershell
(Get-Command uvx).source
```

如果显示路径，说明安装成功。

![验证安装](/images/claude-code-install/3_验证安装.png)

---

### 第三步：配置 MCP

按 `Win + R`，输入 `cmd`，以管理员身份运行。

在 cmd 中运行以下命令（将 `api_key` 替换为你的实际 API 密钥）：

```cmd
claude mcp add -s user MiniMax --env MINIMAX_API_KEY=api_key --env MINIMAX_API_HOST=https://api.minimaxi.com -- uvx minimax-coding-plan-mcp -y
```

![配置mcp](/images/claude-code-install/4_配置mcp.png)

---

### 第四步：验证配置

在 Claude Code 中输入 `/mcp`，确认能看到 `web_search` 和 `understand_image` 工具。

![验证配置](/images/claude-code-install/5_验证配置.png)

---

### 第四部分：总结

**我们今天安装了：**

- Claude Code - AI 编程辅助工具
- ccswitch - 环境管理工具（配置了 MiniMax）
- Git - 版本控制工具

**下一步：**

安装完成后，你就可以在终端输入 `claude` 开始使用了。

---

## 交流群

如果在使用过程中有任何疑问，欢迎扫码加入 QQ 交流群一起讨论：

<img src="/images/claude-code-install/qq交流群号.jpg" width="300" alt="QQ交流群">

> 💬 加入群聊，与志同道合的朋友一起交流学习！

---

如果教程对你有帮助，欢迎去 B站 **一键三连** 支持一下！

你们的支持是我更新下去的最大动力！

> 有问题欢迎在评论区留言交流！
