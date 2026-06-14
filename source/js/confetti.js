/* ============================================================
 * 简易 confetti 彩纸
 * 触发: window.dispatchEvent(new CustomEvent('confetti', { detail: { x, y } }))
 * 或:    window.confetti && window.confetti(x, y)
 * ============================================================ */
(function () {
  'use strict';
  const colors = ['#667eea', '#a5b4fc', '#f093fb', '#f5576c', '#6b9e83', '#e8a87c', '#f4c6a8'];

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
})();
