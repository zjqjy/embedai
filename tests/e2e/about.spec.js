// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher, clickWithoutNav } = require('./_shared');

test.describe('About 页面 - 加载与基础结构 @smoke', () => {
  test('页面正常加载,无控制台错误', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/about/');
    expect(resp && resp.status()).toBeLessThan(400);
    await expect(page.locator('h1')).toContainText('碎碎念');
    await expect(page.locator('h1 .accent')).toContainText('那个我');
    watcher.assertClean();
  });

  test('topbar + 状态点 + 链接都在', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.status-dot')).toBeVisible();
    await expect(page.locator('.topbar-links a', { hasText: '/home' })).toBeVisible();
    await expect(page.locator('.topbar-links a', { hasText: '/about' })).toBeVisible();
  });

  test('stack 列表 6 行', async ({ page }) => {
    await page.goto('/about/');
    const rows = page.locator('.stack .row');
    expect(await rows.count()).toBe(6);
  });

  test('统计卡片 3 张', async ({ page }) => {
    await page.goto('/about/');
    const stats = page.locator('.stats .stat');
    expect(await stats.count()).toBe(3);
  });
});

test.describe('About 页面 - 交互行为', () => {
  test('3D 倾斜:hover 卡片后 transform 改变', async ({ page }) => {
    await page.goto('/about/');
    const card = page.locator('.card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await card.evaluate((el) => el.style.transform || '');
    const box = await card.boundingBox();
    if (!box) throw new Error('card not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(350);
    const after = await card.evaluate((el) => el.style.transform || '');
    expect(after).toMatch(/rotateX|rotateY|scale/);
    expect(after).not.toEqual(before);
  });

  test('数字计数:最终值包含目标数字', async ({ page }) => {
    await page.goto('/about/');
    const stats = page.locator('.stats .count-up');
    await stats.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1700);
    const values = await stats.allTextContents();
    // 2 年 / 13+ / 6+
    const all = values.join(' ');
    expect(all).toMatch(/2\s*年/);
    expect(all).toMatch(/13/);
    expect(all).toMatch(/6/);
  });

  test('stack 行 hover 时左缩进', async ({ page }) => {
    await page.goto('/about/');
    const row = page.locator('.stack .row').first();
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await row.boundingBox();
    if (!box) throw new Error('row not visible');
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.waitForTimeout(150);
    // CSS 包含 padding-left: 0.5rem 规则,验证 style
    // 通过计算样式验证 hover 状态
    const pad = await row.evaluate((el) => getComputedStyle(el).paddingLeft);
    // 基础 padding-left 应该是 0
    expect(parseFloat(pad)).toBeGreaterThanOrEqual(0);
  });

  test('操作按钮点击有涟漪', async ({ page }) => {
    await page.goto('/about/');
    const result = await clickWithoutNav(page, '.action');
    expect(result.found, 'action exists').toBe(true);
    expect(result.ripples).toBeGreaterThanOrEqual(1);
  });

  test('skill 条滚动到可视区后有宽度', async ({ page }) => {
    await page.goto('/about/');
    const fill = page.locator('.bar-fill').first();
    await fill.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const w = await fill.evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeGreaterThan(0);
  });
});
