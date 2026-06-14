// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 通用工具:在每个页面顶部收集 console / pageerror
 * 用法: 在 test.beforeEach 里 const watcher = attachConsoleWatcher(page);
 * 之后用 watcher.assertClean() 断言。
 */
function attachConsoleWatcher(page) {
  const errors = [];
  const warnings = [];
  const consoleMsgs = [];

  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    // 忽略 favicon 之类
    if (!req.url().endsWith('favicon.ico')) {
      errors.push('requestfailed: ' + req.url() + ' ' + (req.failure() && req.failure().errorText));
    }
  });

  return {
    errors,
    warnings,
    consoleMsgs,
    assertClean() {
      // 过滤掉常见的字体 CORS 警告
      const realErrors = errors.filter(
        (e) => !/preconnect|googleapis|gstatic|fonts\./i.test(e)
      );
      expect(realErrors, 'page errors: ' + JSON.stringify(realErrors, null, 2)).toEqual([]);
    }
  };
}

/**
 * 滚动到指定元素,等揭示动画结束
 */
async function scrollIntoViewAndReveal(page, selector) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  // 等待 reveal transition
  await page.waitForTimeout(900);
}

/**
 * 在元素上模拟一次"非导航"点击 —— 用 dispatchEvent 派发 click 事件,
 * 与 page.mouse.click 不同,这一步不会触发 <a> 默认的页面跳转。
 * 用于验证 ripple 等"点击瞬间产生的元素"。
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector  - 目标元素选择器(可以是 :scope 子代)
 * @param {{ x?: number, y?: number, offsetX?: number, offsetY?: number }} opts
 *   偏移量:默认相对元素左上角 (30, 30)
 * @returns {Promise<{ ripples: number, html: string }>}
 */
async function clickWithoutNav(page, selector, opts) {
  opts = opts || {};
  const offsetX = opts.x != null ? opts.x : (opts.offsetX != null ? opts.offsetX : 30);
  const offsetY = opts.y != null ? opts.y : (opts.offsetY != null ? opts.offsetY : 30);
  return await page.evaluate(
    ({ sel, ox, oy }) => {
      const el = document.querySelector(sel);
      if (!el) return { ripples: 0, html: '', found: false };
      const rect = el.getBoundingClientRect();
      const cx = rect.left + ox;
      const cy = rect.top + oy;
      const ev = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: cx,
        clientY: cy
      });
      el.dispatchEvent(ev);
      return {
        ripples: el.querySelectorAll('.ripple').length,
        html: el.innerHTML.slice(0, 200),
        found: true
      };
    },
    { sel: selector, ox: offsetX, oy: offsetY }
  );
}

module.exports = { attachConsoleWatcher, scrollIntoViewAndReveal, clickWithoutNav };
