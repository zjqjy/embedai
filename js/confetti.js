/* ============================================================
 * 简易 confetti 彩纸
 * 触发: window.dispatchEvent(new CustomEvent('confetti', { detail: { x, y } }))
 * 或:    window.confetti && window.confetti(x, y)
 * ============================================================ */
(function () {
  'use strict';
  // 站点调色板(不用系统外的紫粉)
  const colors = ['#6b9e83', '#d8e6dd', '#e8a87c', '#f4c6a8', '#a8c8e0', '#1a1a1f'];

  function burst(x, y, count) {
    count = count || 60;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div');
    layer.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(layer);

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      const size = 6 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 200 + Math.random() * 320;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 220;
      const rot = Math.random() * 540;
      const color = colors[Math.floor(Math.random() * colors.length)];

      piece.style.cssText =
        'position:absolute;left:' +
        x +
        'px;top:' +
        y +
        'px;width:' +
        size +
        'px;height:' +
        size * 0.4 +
        'px;background:' +
        color +
        ';border-radius:2px;transform:rotate(' +
        rot +
        'deg);opacity:1;transition:transform 1.4s cubic-bezier(0.2,0.8,0.2,1),opacity 1.4s ease;will-change:transform,opacity;';
      layer.appendChild(piece);

      // 强制 reflow,再启动动画
      void piece.offsetWidth;
      requestAnimationFrame(() => {
        piece.style.transform =
          'translate(' + vx + 'px,' + (vy + 600) + 'px) rotate(' + (rot + 720) + 'deg)';
        piece.style.opacity = '0';
      });
    }

    setTimeout(() => layer.remove(), 1600);
  }

  window.confetti = burst;
  window.addEventListener('confetti', (e) => {
    const d = (e && e.detail) || {};
    burst(d.x || window.innerWidth / 2, d.y || window.innerHeight / 2, d.count || 60);
  });

  // -------- Konami 彩蛋: ↑↑↓↓←→←→ B A --------
  const SEQ = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  let pos = 0;
  document.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === SEQ[pos] ? pos + 1 : k === SEQ[0] ? 1 : 0;
    if (pos === SEQ.length) {
      pos = 0;
      burst(window.innerWidth / 2, window.innerHeight / 3, 140);
    }
  });
})();
