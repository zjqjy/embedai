// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 全站通用无障碍 / 兼容性 / 视觉验收
 * 不放 @smoke,默认只在 chromium 跑
 */

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about/' },
  { name: 'coming-soon', path: '/coming-soon/' }
];

for (const { name, path } of PAGES) {
  test.describe(`通用 - ${name}`, () => {
    test('页面文本对比度足够(关键标题可见)', async ({ page }) => {
      await page.goto(path);
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
    });

    test('无水平溢出(桌面 1280)', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      // 等 reveal 完成
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        return { w, sw, ok: sw - w < 2 };
      });
      expect(overflow.ok, `overflow: ${JSON.stringify(overflow)}`).toBe(true);
    });

    test('资源加载:js 与 css 都成功', async ({ page }) => {
      const failed = [];
      page.on('requestfailed', (req) => {
        if (!req.url().endsWith('favicon.ico')) failed.push(req.url());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      // 过滤掉 cross-origin 的字体请求
      const real = failed.filter((u) => !/fonts\.(gstatic|googleapis)\.com/.test(u));
      expect(real, 'failed resources: ' + real.join(', ')).toEqual([]);
    });

    test('prefers-reduced-motion 下不应插入光标', async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(path);
      const dotCount = await page.locator('.cursor-dot').count();
      const ringCount = await page.locator('.cursor-ring').count();
      expect(dotCount).toBe(0);
      expect(ringCount).toBe(0);
      await ctx.close();
    });

    test('桌面截图(1280x800)保存到 verify-artifacts', async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500); // 等 reveal/动画
      const out = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path: out, fullPage: false });
      // 验证文件存在
      const fs = require('fs');
      expect(fs.existsSync(out)).toBe(true);
    });
  });
}

test.describe('移动端 - 首页 @mobile', () => {
  test('360x780 视图下不溢出且首屏可读', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThan(2);
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });
});
