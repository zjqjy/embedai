/* ============================================================
 * EmbedAI 站点共享交互脚本
 * 依赖: 无
 * 启用: 任何引入此脚本的页面都会获得下列能力(失败安全)
 *   - data-reveal        滚动揭示
 *   - data-tilt          3D 倾斜
 *   - data-magnetic      磁吸(仅限低频 CTA,勿用于导航)
 *   - data-ripple        涟漪点击
 *   - data-count-up      数字滚动
 *   - data-typewriter    打字机
 *   - data-char-in       逐字入场
 *   - data-parallax      视差
 *   - [data-to-top]      回到顶部
 *   - .reading-progress  阅读进度条
 * 通过 window.EmbedSite.initTilt(root) 可对动态插入的元素补绑倾斜。
 * ============================================================ */
(function () {
  'use strict';

  // -------- 减少动效偏好 --------
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------- 工具: rAF 节流 --------
  function rafThrottle(fn) {
    let ticking = false;
    return function (arg) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        fn(arg);
        ticking = false;
      });
    };
  }

  // -------- 1. 滚动揭示 --------
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => io.observe(el));
  }

  // -------- 2. 3D 倾斜(幂等,可重复调用覆盖动态元素) --------
  function initTilt(root) {
    if (prefersReducedMotion) return;
    const els = (root || document).querySelectorAll('[data-tilt]:not([data-tilt-bound])');

    els.forEach((el) => {
      el.dataset.tiltBound = '1';
      const max = parseFloat(el.dataset.tiltMax || '8');
      const scale = parseFloat(el.dataset.tiltScale || '1.02');
      let rect = null;
      let rafId = null;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;

      function refreshRect() {
        rect = el.getBoundingClientRect();
      }

      function onEnter() {
        refreshRect();
      }

      function onMove(e) {
        if (!rect) refreshRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        targetX = (py - 0.5) * -max * 2;
        targetY = (px - 0.5) * max * 2;
        schedule();
      }

      function onLeave() {
        targetX = 0;
        targetY = 0;
        schedule();
        rect = null;
      }

      function schedule() {
        if (rafId) return;
        rafId = requestAnimationFrame(tick);
      }

      function tick() {
        rafId = null;
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        const isActive = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
        const isRest = targetX === 0 && targetY === 0;
        const s = isRest ? 1 : scale;
        el.style.transform =
          'perspective(1000px) rotateX(' +
          currentX.toFixed(2) +
          'deg) rotateY(' +
          currentY.toFixed(2) +
          'deg) scale(' +
          s +
          ')';
        if (isActive) {
          schedule();
        } else if (isRest) {
          el.style.transform = '';
        }
      }

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      window.addEventListener('scroll', refreshRect, { passive: true });
      window.addEventListener('resize', refreshRect);
    });
  }

  // -------- 3. 磁吸 --------
  function initMagnetic() {
    const els = document.querySelectorAll('[data-magnetic]');
    if (!els.length || prefersReducedMotion) return;

    els.forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic || '0.35');
      let rect = null;
      let rafId = null;
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;

      function refresh() {
        rect = el.getBoundingClientRect();
      }

      function onEnter() {
        refresh();
      }

      function onMove(e) {
        if (!rect) refresh();
        const cxr = rect.left + rect.width / 2;
        const cyr = rect.top + rect.height / 2;
        tx = (e.clientX - cxr) * strength;
        ty = (e.clientY - cyr) * strength;
        schedule();
      }

      function onLeave() {
        tx = 0;
        ty = 0;
        schedule();
        rect = null;
      }

      function schedule() {
        if (rafId) return;
        rafId = requestAnimationFrame(tick);
      }

      function tick() {
        rafId = null;
        cx += (tx - cx) * 0.2;
        cy += (ty - cy) * 0.2;
        el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
          schedule();
        } else if (tx === 0 && ty === 0) {
          el.style.transform = '';
        }
      }

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  // -------- 4. 涟漪点击 --------
  function initRipple() {
    document.addEventListener(
      'click',
      (e) => {
        const host = e.target.closest('[data-ripple], .ripple-host');
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.2;
        const r = document.createElement('span');
        r.className = 'ripple';
        r.style.width = r.style.height = size + 'px';
        r.style.left = e.clientX - rect.left + 'px';
        r.style.top = e.clientY - rect.top + 'px';
        const color = host.dataset.rippleColor;
        if (color) {
          r.style.background = color;
          r.style.opacity = '0.25';
        }
        host.appendChild(r);
        r.addEventListener('animationend', () => r.remove());
      },
      { passive: true }
    );
  }

  // -------- 5. 数字滚动 --------
  function initCountUp() {
    const els = document.querySelectorAll('[data-count-up]');
    if (!els.length) return;

    function run(el) {
      if (el.dataset.countDone === '1') return;
      el.dataset.countDone = '1';
      const target = parseFloat(el.dataset.countUp);
      const duration = parseInt(el.dataset.countDuration || '1200', 10);
      const decimals = parseInt(el.dataset.countDecimals || '0', 10);
      const prefix = el.dataset.countPrefix || '';
      const suffix = el.dataset.countSuffix || '';
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const value = (target * eased).toFixed(decimals);
        el.textContent = prefix + value + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      if (prefersReducedMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
      } else {
        requestAnimationFrame(step);
      }
    }

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      els.forEach(run);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  // -------- 6. 打字机 --------
  function initTypewriter() {
    const els = document.querySelectorAll('[data-typewriter]');
    if (!els.length) return;

    els.forEach((el) => {
      const items = (el.dataset.typewriter || '').split('|').filter(Boolean);
      if (!items.length) return;

      // 显式持有文本节点,不依赖 firstChild(可能是元素节点)
      const textNode = document.createTextNode('');
      const cursor = document.createElement('span');
      cursor.className = 'typed-cursor';
      el.textContent = '';
      el.appendChild(textNode);
      el.appendChild(cursor);

      if (prefersReducedMotion) {
        textNode.nodeValue = items[0];
        cursor.remove();
        return;
      }

      let index = 0;
      let charIndex = 0;
      let deleting = false;
      const typeMs = parseInt(el.dataset.typeMs || '90', 10);
      const deleteMs = parseInt(el.dataset.typeDeleteMs || '40', 10);
      const holdMs = parseInt(el.dataset.typeHold || '1500', 10);

      function loop() {
        const word = items[index % items.length];
        if (!deleting) {
          charIndex++;
          textNode.nodeValue = word.slice(0, charIndex);
          if (charIndex === word.length) {
            deleting = true;
            setTimeout(loop, holdMs);
            return;
          }
          setTimeout(loop, typeMs);
        } else {
          charIndex--;
          textNode.nodeValue = word.slice(0, charIndex);
          if (charIndex === 0) {
            deleting = false;
            index++;
            setTimeout(loop, typeMs);
            return;
          }
          setTimeout(loop, deleteMs);
        }
      }

      setTimeout(loop, 400);
    });
  }

  // -------- 7. 自定义光标 --------
  function initCursor() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    // 首次移动前不显示,避免开场停在屏幕中央
    dot.style.opacity = '0';
    ring.style.opacity = '0';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let shown = false;

    function onMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!shown) {
        shown = true;
        dotX = ringX = mouseX;
        dotY = ringY = mouseY;
        dot.style.opacity = '';
        ring.style.opacity = '';
      }
    }

    function tick() {
      dotX += (mouseX - dotX) * 0.6;
      dotY += (mouseY - dotY) * 0.6;
      // 环跟随加快,减少拖尾错位感
      ringX += (mouseX - ringX) * 0.32;
      ringY += (mouseY - ringY) * 0.32;
      dot.style.transform = 'translate3d(' + dotX + 'px,' + dotY + 'px,0) translate(-50%,-50%)';
      ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));

    // 悬停时切换光标状态
    const hoverSelectors = 'a, button, [data-tilt], [data-magnetic], .card, summary, input, textarea, label';
    document.addEventListener(
      'mouseover',
      (e) => {
        if (e.target.closest && e.target.closest(hoverSelectors)) {
          dot.classList.add('is-hover');
          ring.classList.add('is-hover');
        }
      },
      { passive: true }
    );
    document.addEventListener(
      'mouseout',
      (e) => {
        if (e.target.closest && e.target.closest(hoverSelectors)) {
          dot.classList.remove('is-hover');
          ring.classList.remove('is-hover');
        }
      },
      { passive: true }
    );
  }

  // -------- 8. 进度条 + 回到顶部 --------
  function initProgressAndTop() {
    // 进度条(仅长页面有意义,短页滚动区间小也照常工作)
    let bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      document.body.appendChild(bar);
    }
    const updateProgress = rafThrottle(() => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    });

    // 回到顶部按钮
    let toTop = document.querySelector('[data-to-top]');
    if (!toTop) {
      toTop = document.createElement('button');
      toTop.className = 'to-top';
      toTop.setAttribute('data-to-top', '');
      toTop.setAttribute('aria-label', '回到顶部');
      toTop.setAttribute('type', 'button');
      toTop.textContent = '↑';
      document.body.appendChild(toTop);
    }
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    const onScroll = rafThrottle(() => {
      updateProgress();
      const y = window.scrollY || document.documentElement.scrollTop;
      toTop.classList.toggle('is-visible', y > 320);
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
    onScroll();
  }

  // -------- 9. 视差 --------
  function initParallax() {
    const els = document.querySelectorAll('[data-parallax]');
    if (!els.length || prefersReducedMotion) return;
    const update = rafThrottle(() => {
      const y = window.scrollY;
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0.2');
        el.style.transform = 'translate3d(0,' + (y * speed).toFixed(2) + 'px,0)';
      });
    });
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // -------- 10. 平滑滚动到锚点 --------
  function initSmoothAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      let target;
      try {
        target = document.querySelector(href);
      } catch (err) {
        return; // id 含特殊字符时选择器会抛错,交给浏览器默认行为
      }
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // -------- 11. 字符逐字入场 --------
  function initCharIn() {
    const els = document.querySelectorAll('[data-char-in]');
    if (!els.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-chars-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const text = el.textContent;
          el.textContent = '';
          [...text].forEach((ch, i) => {
            const span = document.createElement('span');
            span.setAttribute('data-char', '');
            span.textContent = ch === ' ' ? ' ' : ch;
            span.style.animationDelay = i * 0.035 + 's';
            el.appendChild(span);
          });
          el.classList.add('is-chars-in');
          io.unobserve(el);
        });
      },
      { threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
  }

  // -------- 启动 --------
  function init() {
    initReveal();
    initTilt(document);
    initMagnetic();
    initRipple();
    initCountUp();
    initTypewriter();
    initCursor();
    initProgressAndTop();
    initParallax();
    initSmoothAnchors();
    initCharIn();
  }

  // 暴露给动态渲染的页面(tools 页筛选重渲染后补绑倾斜)
  window.EmbedSite = { initTilt: initTilt };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
