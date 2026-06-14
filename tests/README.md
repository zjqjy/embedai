# 站点测试

## 结构

```
tests/
└── e2e/
    ├── _shared.js             # 共享工具(console 监听等)
    ├── home.spec.js           # 首页 (/)
    ├── about.spec.js          # 关于页 (/about/)
    ├── coming-soon.spec.js    # 敬请期待 (/coming-soon/)
    └── accessibility.spec.js  # 全站无障碍 / 视觉验收
```

## 验收覆盖

| 能力 | 涉及测试 |
| --- | --- |
| 页面加载无控制台错误 | `*@smoke` |
| 关键元素存在 | `*@smoke` |
| 滚动揭示 `data-reveal` | `home.spec.js` 滚动揭示 |
| 3D 倾斜 `data-tilt` | `home.spec.js` / `about.spec.js` |
| 磁吸按钮 `data-magnetic` | `home.spec.js` |
| 点击涟漪 `data-ripple` | `home.spec.js` / `about.spec.js` / `coming-soon.spec.js` |
| 数字计数 `data-count-up` | `home.spec.js` / `about.spec.js` |
| 打字机 `data-typewriter` | `home.spec.js` |
| 视差 `data-parallax` | `home.spec.js` |
| 阅读进度 / 回到顶部 | `home.spec.js` |
| 进度条入场 | `coming-soon.spec.js` |
| 加 buff 按钮 | `coming-soon.spec.js` |
| Konami 彩蛋 | `coming-soon.spec.js` |
| 键盘可达 / focus | `home.spec.js` |
| 桌面 / 移动端不溢出 | `accessibility.spec.js` |
| `prefers-reduced-motion` | `accessibility.spec.js` |
| 视觉截图归档 | `accessibility.spec.js` |

## 命令

```bash
# 构建 + 起 server + 跑全量测试
npm run build
npm test

# 只跑 smoke
npm run test:smoke

# UI 模式
npm run test:ui

# 报告
npm run test:report
```

Playwright 会在 `playwright-report/` 产出 HTML 报告,
单测失败时自动保存 trace / video 到 `test-results/`。
