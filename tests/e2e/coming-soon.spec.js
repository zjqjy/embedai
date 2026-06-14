// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher, clickWithoutNav } = require('./_shared');

test.describe('Coming-Soon 页面 - 加载与基础结构 @smoke', () => {
  test('页面正常加载,无控制台错误', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/coming-soon/');
    expect(resp && resp.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toContainText('Coming');
    await expect(page.locator('h1 .accent')).toContainText('Soon');
    watcher.assertClean();
  });

  test('进度条 + 阶段标签 + 3 个按钮', async ({ page }) => {
    await page.goto('/coming-soon/');
    await expect(page.locator('.progress')).toBeVisible();
    await expect(page.locator('#progressBar')).toBeAttached();
    const milestones = page.locator('.milestone');
    expect(await milestones.count()).toBe(13);
    const actions = page.locator('.action');
    expect(await actions.count()).toBe(3);
  });
});

test.describe('Coming-Soon 页面 - 交互行为', () => {
  test('进度条入场后会从 0 增长到 ~23%', async ({ page }) => {
    await page.goto('/coming-soon/');
    // 刚加载时 width 可能是 0
    await page.locator('.progress').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // 等动画 1.6s
    const width = await page
      .locator('#progressBar')
      .evaluate((el) => parseFloat(getComputedStyle(el).width));
    // 容器宽度可能比 400 小(在窄屏),所以用 ratio 校验
    const trackW = await page
      .locator('.progress')
      .evaluate((el) => parseFloat(getComputedStyle(el).width));
    const ratio = trackW > 0 ? width / trackW : 0;
    expect(ratio).toBeGreaterThan(0.18);
    expect(ratio).toBeLessThan(0.3);
  });

  test('给我加 buff:点击后进度文案/宽度增加,且触发彩纸', async ({ page }) => {
    await page.goto('/coming-soon/');
    const btn = page.locator('#cheerBtn');
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const textBefore = (await page.locator('.progress-meta').textContent()) || '';
    const wBefore = await page
      .locator('#progressBar')
      .evaluate((el) => parseFloat(getComputedStyle(el).width));

    await btn.click();

    await page.waitForTimeout(2000); // 等彩纸 + 进度动画
    const textAfter = (await page.locator('.progress-meta').textContent()) || '';
    const wAfter = await page
      .locator('#progressBar')
      .evaluate((el) => parseFloat(getComputedStyle(el).width));

    expect(textAfter).not.toEqual(textBefore);
    expect(wAfter).toBeGreaterThan(wBefore);
  });

  test('Konami 彩蛋:输入正确序列显示提示', async ({ page }) => {
    await page.goto('/coming-soon/');
    const secret = page.locator('#secret');
    await expect(secret).toBeAttached();
    // 触发前应不显示
    await expect(secret).not.toHaveClass(/is-shown/);

    const sequence = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ];
    for (const k of sequence) {
      await page.keyboard.press(k);
      await page.waitForTimeout(80);
    }
    await expect(secret).toHaveClass(/is-shown/);
  });

  test('里程碑入场后应可见', async ({ page }) => {
    await page.goto('/coming-soon/');
    const wrap = page.locator('#milestones');
    await wrap.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const opacity = await wrap.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    expect(opacity).toBeGreaterThan(0.9);
  });

  test('返回首页按钮可点击', async ({ page }) => {
    await page.goto('/coming-soon/');
    const result = await clickWithoutNav(page, '.action');
    expect(result.found, 'action exists').toBe(true);
    expect(result.ripples).toBeGreaterThanOrEqual(1);
  });
});
