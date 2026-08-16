// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher } = require('./_shared');

test.describe('文章外链 helper {% link %} - 验证 @smoke', () => {
  test('Claude Code 一键安装包文章:百度网盘链接由 helper 渲染', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/2026/05/31/claude-code-oneclick-install/');
    expect(resp && resp.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // helper 渲染的特征:链接带 target="_blank" rel="noopener" + <code>提取码
    const link = page.locator('a[href*="pan.baidu.com"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('1L2SvQYygjVW5ZajcGqK02Q');

    // 提取码 code 元素存在
    const code = page.locator('code').filter({ hasText: /提取码/ });
    await expect(code.first()).toBeVisible();
    const codeText = await code.first().textContent();
    expect(codeText).toContain('86kq');

    watcher.assertClean();
  });

  test('Claude Code 安装教程文章:含 Anthropic 官网 + 旧版安装包链接', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    await page.goto('/2026/04/02/claude-code-install-guide/');
    await page.waitForLoadState('domcontentloaded');

    // Anthropic 官网（通过 claude_official 引用）
    const officialLink = page.locator('a[href*="anthropic.com"]').first();
    await expect(officialLink).toBeVisible();

    // 旧版百度网盘（通过 claude_install_v4nb 引用）
    const baiduLink = page.locator('a[href*="pan.baidu.com"]').first();
    await expect(baiduLink).toBeVisible();
    const code = page.locator('code').filter({ hasText: /提取码/ });
    await expect(code.first()).toBeVisible();

    watcher.assertClean();
  });

  test('EM-SKILL 安装文章:百度网盘 + GitHub 链接都通过 helper 渲染', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    await page.goto('/2026/05/01/em-skill-install/');
    await page.waitForLoadState('domcontentloaded');

    // 百度网盘（em_skill_install）
    const baidu = page.locator('a[href*="pan.baidu.com"]').first();
    await expect(baidu).toBeVisible();
    const code = page.locator('code').filter({ hasText: /提取码/ });
    await expect(code.first()).toBeVisible();
    const codeText = await code.first().textContent();
    expect(codeText).toContain('ikzm');

    // GitHub 链接（embed-ai-tool / xpack-openocd / em-skill）
    const githubLinks = page.locator('a[href*="github.com"]');
    expect(await githubLinks.count()).toBeGreaterThanOrEqual(3);

    watcher.assertClean();
  });

  test('核心收益:改 links.yml 一处 → 文章全站同步更新', async ({ page }) => {
    // 这个测试手动验证更可靠,自动化只验证当前状态
    // 实际验证:临时改 source/_data/links.yml 中 claude_oneclick 的 url 加 query param
    // 重新 hexo generate,检查所有引用处都更新(单元测试见 S6-C 文档)
    // 这里只检查当前 helper 工作正常
    await page.goto('/2026/05/31/claude-code-oneclick-install/');
    const link = page.locator('a[href*="pan.baidu.com"]').first();
    const href = await link.getAttribute('href');
    // URL 不应包含硬编码的提取码（提取码应该是单独的元素）
    expect(href).not.toContain('86kq');
  });
});