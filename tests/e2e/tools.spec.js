// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher } = require('./_shared');

test.describe('工具页 /tools/ - 加载与基础结构 @smoke', () => {
  test('页面正常加载,无控制台错误', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/tools/');
    expect(resp && resp.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
    watcher.assertClean();
  });

  test('渲染 7 张工具卡（从文章提取的 + Claude Code + VSCode）', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800); // 等客户端解析 + 渲染
    const cards = page.locator('.cat');
    await expect(cards).toHaveCount(7);
  });

  test('Hero + 4 分类 chip 存在', async ({ page }) => {
    await page.goto('/tools/');
    await expect(page.locator('h1')).toBeVisible();
    const chips = page.locator('.filter-chip');
    // 至少 5 个 chip（全部 + 4 分类）
    expect(await chips.count()).toBeGreaterThanOrEqual(5);
  });

  test('搜索框 + 实时过滤', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800);
    const search = page.locator('#filter-search');
    await expect(search).toBeVisible();

    // 输入 "Claude" 应该过滤到 Claude Code 卡片
    await search.fill('Claude');
    await page.waitForTimeout(200);
    const visibleAfterSearch = await page.locator('.cat:not(.is-hidden)').count();
    expect(visibleAfterSearch).toBe(1);

    // 清空搜索应该恢复全部
    await search.fill('');
    await page.waitForTimeout(200);
    const visibleAfterClear = await page.locator('.cat:not(.is-hidden)').count();
    expect(visibleAfterClear).toBeGreaterThanOrEqual(7);
  });

  test('点击工具 → modal 显示「🔗 打开主页」+ URL 清理 pwd', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800);
    // 点击第一张卡(Claude Code)
    await page.locator('.cat').first().click();
    await page.waitForTimeout(400);
    // modal 打开
    const visitBtn = page.locator('#modal-visit');
    await expect(visitBtn).toBeVisible();
    // href 应是 https://pan.baidu.com/s/...(没有 ?pwd=mtib)
    const href = await visitBtn.getAttribute('href');
    expect(href).not.toContain('pwd=');
  });
});

test.describe('工具页 /tools/ - 交互行为', () => {
  test('分类筛选:点 AI 分类 chip 只显示 AI 类工具', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800);
    // 点 AI chip（用文本定位）
    const aiChip = page.locator('button, .chip').filter({ hasText: /学习辅助|AI/ }).first();
    if ((await aiChip.count()) > 0) {
      await aiChip.click();
      await page.waitForTimeout(300);
      // 检查可见卡片中包含 Claude Code 或 Cursor
      const visibleCards = page.locator('.cat:visible');
      const text = await visibleCards.allTextContents();
      expect(text.some((t) => /Claude|Cursor/.test(t))).toBe(true);
    }
  });

  test('点击卡片打开 modal', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800);
    const firstCard = page.locator('.cat').first();
    await firstCard.click();
    await page.waitForTimeout(400);
    // modal 出现
    const modal = page.locator('[role="dialog"], .modal').first();
    await expect(modal).toBeVisible();
  });

  test('ESC 关闭 modal', async ({ page }) => {
    await page.goto('/tools/');
    await page.waitForTimeout(800);
    await page.locator('.cat').first().click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const modal = page.locator('[role="dialog"], .modal').first();
    // modal 应该不可见或已从 DOM 移除
    const visible = await modal.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });
});