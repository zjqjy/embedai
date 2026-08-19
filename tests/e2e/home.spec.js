// @ts-check
const { test, expect } = require('@playwright/test');
const { attachConsoleWatcher, clickWithoutNav } = require('./_shared');

test.describe('首页 - 加载与基础结构 @smoke', () => {
  test('页面正常加载,无控制台错误', async ({ page }) => {
    const watcher = attachConsoleWatcher(page);
    const resp = await page.goto('/');
    expect(resp && resp.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/EmbedAI/);
    watcher.assertClean();
  });

  test('关键元素都存在', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await expect(page.locator('.chip-title').first()).toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.status-dot')).toBeVisible();
    await expect(page.locator('.hero-cta')).toBeVisible();
    await expect(page.locator('.section-head h2', { hasText: '最新文章' })).toBeVisible();
    await expect(page.locator('.section-head h2', { hasText: '内容分类' })).toBeVisible();
    await expect(page.locator('.section-head h2', { hasText: '关于' })).toBeVisible();
  });

  test('4 张文章卡 + 分类卡数据驱动(2 个分类 + 工具箱)', async ({ page }) => {
    await page.goto('/');
    const posts = page.locator('.post-card');
    await expect(posts).toHaveCount(4);
    // 分类卡 = site.categories(ai-tools + 嵌入式) + 固定工具箱卡
    const cats = page.locator('.cat');
    await expect(cats).toHaveCount(3);
  });

  test('4 张统计卡', async ({ page }) => {
    await page.goto('/');
    const stats = page.locator('.stats .stat');
    await expect(stats).toHaveCount(4);
  });
});

test.describe('首页 - 交互行为', () => {
  test('3D 倾斜:鼠标进入文章卡会改变 transform', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.post-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const before = await card.evaluate((el) => el.style.transform || '');
    const box = await card.boundingBox();
    if (!box) throw new Error('card not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(350);
    const after = await card.evaluate((el) => el.style.transform || '');
    expect(after).not.toEqual(before);
    expect(after).toMatch(/rotateX|rotateY|scale/);
  });

  test('3D 倾斜:鼠标进入分类卡会改变 transform', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.cat').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const before = await card.evaluate((el) => el.style.transform || '');
    const box = await card.boundingBox();
    if (!box) throw new Error('card not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(350);
    const after = await card.evaluate((el) => el.style.transform || '');
    expect(after).not.toEqual(before);
  });

  test('磁吸:Hero CTA hover 后 transform 变化', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('.hero-cta');
    const box = await cta.boundingBox();
    if (!box) throw new Error('cta not visible');
    const before = await cta.evaluate((el) => el.style.transform || '');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.waitForTimeout(300);
    const after = await cta.evaluate((el) => el.style.transform || '');
    expect(after).toMatch(/translate3d/);
    expect(after).not.toEqual(before);
  });

  test('滚动揭示:首屏元素立即可见,后续元素滚动后可见', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
    // 滚到统计
    await page.locator('.stats').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const statVisible = await page.locator('.stats').isVisible();
    expect(statVisible).toBe(true);
    // 滚到底部
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(500);
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
  });

  test('数字滚动:count-up 最终值正确', async ({ page }) => {
    await page.goto('/');
    const counts = page.locator('.stats .count-up');
    await counts.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1700);
    const values = await counts.allTextContents();
    // 数据驱动: articles / categories 均为 >=1 的整数
    expect(values.length).toBeGreaterThanOrEqual(2);
    for (const v of values) {
      expect(parseInt(v, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  test('点击涟漪:点击卡片后 .ripple 子元素存在', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.post-card').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const result = await clickWithoutNav(page, '.post-card');
    expect(result.found, 'card exists').toBe(true);
    expect(result.ripples).toBeGreaterThanOrEqual(1);
  });

  test('字符逐字入场:h1 包含 data-char 的 span', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const charCount = await page.locator('h1 [data-char]').count();
    expect(charCount).toBeGreaterThan(0);
  });

  test('阅读进度条:滚动后宽度变大', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('.reading-progress');
    await expect(bar).toBeAttached();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    const w0 = await bar.evaluate((el) => el.style.width);
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.waitForTimeout(250);
    const w1 = await bar.evaluate((el) => el.style.width);
    const parseW = (s) => parseFloat(s) || 0;
    expect(parseW(w1)).toBeGreaterThan(parseW(w0));
  });

  test('回到顶部:滚动后出现,点击后回到 0', async ({ page }) => {
    await page.goto('/');
    const toTop = page.locator('.to-top');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await expect(toTop).not.toHaveClass(/is-visible/);
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await expect(toTop).toHaveClass(/is-visible/);
    await toTop.click();
    await page.waitForFunction(() => window.scrollY < 5, { timeout: 3000 });
  });

  test('键盘可达:Tab 能聚焦到主链接', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  });

  test('site.css 与 site.js 加载', async ({ page }) => {
    await page.goto('/');
    const css = page.locator('link[href="/css/site.css"]');
    await expect(css).toHaveCount(1);
    // 间接验证 JS 加载:触发一个依赖 JS 的元素
    const toTop = page.locator('.to-top');
    await expect(toTop).toHaveCount(1);
  });
});
