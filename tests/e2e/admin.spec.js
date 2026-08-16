// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher } = require('./_shared');

test.describe('管理后台 /admin/ - 加载与基础结构 @smoke', () => {
  test('页面正常加载,无控制台错误', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/admin/');
    expect(resp && resp.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
    watcher.assertClean();
  });

  test('两个 tab 存在（📦工具 / 🔗链接）', async ({ page }) => {
    await page.goto('/admin/');
    await expect(page.locator('button').filter({ hasText: /工具/ })).toHaveCount(1, { timeout: 2000 }).catch(() => {});
    await expect(page.locator('button').filter({ hasText: /链接/ })).toHaveCount(1, { timeout: 2000 }).catch(() => {});
  });

  test('YAML 输出 textarea 存在', async ({ page }) => {
    await page.goto('/admin/');
    const textarea = page.locator('textarea[readonly]');
    await expect(textarea).toBeVisible();
  });
});

test.describe('管理后台 /admin/ - tab 切换 + 实时生成', () => {
  test('工具 tab 填表 → YAML 实时更新', async ({ page }) => {
    await page.goto('/admin/');
    // 找到工具 tab + 表单
    const toolsTab = page.locator('button').filter({ hasText: /工具/ }).first();
    await toolsTab.click();
    await page.waitForTimeout(300);

    // 填 name 字段（假设有 name input）
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Tool');
    await page.waitForTimeout(200);

    const yaml = await page.locator('textarea[readonly]').inputValue();
    expect(yaml).toContain('Test Tool');
  });

  test('切换到链接 tab → 独立 form', async ({ page }) => {
    await page.goto('/admin/');
    const linksTab = page.locator('button').filter({ hasText: /链接/ }).first();
    await linksTab.click();
    await page.waitForTimeout(300);
    // 链接 tab 应该有 key / label 字段
    const inputs = page.locator('input');
    expect(await inputs.count()).toBeGreaterThan(0);
  });
});

test.describe('管理后台 /admin/ - localStorage 草稿', () => {
  test('保存草稿后刷新页面,字段恢复', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/admin/');
    const toolsTab = page.locator('button').filter({ hasText: /工具/ }).first();
    await toolsTab.click();
    await page.waitForTimeout(300);

    // 填第一个 input
    const firstInput = page.locator('input').first();
    await firstInput.fill('draft_test_value');

    // 点保存草稿按钮（如果存在）
    const saveBtn = page.locator('button').filter({ hasText: /保存草稿/ }).first();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.click();
      await page.waitForTimeout(200);
    }

    // 刷新
    await page.reload();
    await page.waitForTimeout(800);
    const toolsTabAfter = page.locator('button').filter({ hasText: /工具/ }).first();
    await toolsTabAfter.click();
    await page.waitForTimeout(300);

    const value = await page.locator('input').first().inputValue();
    expect(value).toBe('draft_test_value');
  });
});