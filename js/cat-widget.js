/* ============================================================
 * cat-widget.js — 全站摸猫组件（S2 嵌入式猫 IP 交互层）
 * 自包含零依赖，所有页面可用（独立页 <script> + Butterfly inject bottom）。
 * 功能：
 *   1. 右下角常驻小猫：idle 浮动，点击摸头 → 挤压动画 + 爱心飘出
 *      + 全站摸猫计数（localStorage: embedai-cat-pets）
 *   2. 任意 [data-pet] 元素（hero 插画/404 猫等）：点击在该处迸发爱心，
 *      同样计入摸猫总数
 * 无障碍：prefers-reduced-motion 降级（无浮动/无迸发，仅计数）。
 * ============================================================ */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COUNT_KEY = 'embedai-cat-pets';
  var CAT_SRC = '/img/site/emoji-proud.png';

  function petCount() {
    return parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) || 0;
  }
  function addPet(n) {
    var v = petCount() + (n || 1);
    try { localStorage.setItem(COUNT_KEY, String(v)); } catch (e) { /* 隐私模式忽略 */ }
    return v;
  }

  // 爱心：从 (x, y) 视口坐标飘出 n 颗
  function spawnHearts(x, y, n) {
    var layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(layer);
    var glyphs = ['❤', '🧡', '💛'];
    for (var i = 0; i < n; i++) {
      var h = document.createElement('span');
      var drift = (Math.random() * 56 - 28);
      h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      h.style.cssText =
        'position:absolute;left:' + (x + (Math.random() * 36 - 18)) + 'px;top:' + (y - 8) + 'px;' +
        'font-size:' + (12 + Math.random() * 10) + 'px;opacity:1;' +
        'transition:transform 1.1s cubic-bezier(0.2,0.8,0.2,1),opacity 1.1s ease;will-change:transform,opacity;';
      layer.appendChild(h);
      void h.offsetWidth;
      (function (el, d) {
        requestAnimationFrame(function () {
          el.style.transform = 'translate(' + d + 'px,-72px) scale(' + (0.8 + Math.random() * 0.6) + ')';
          el.style.opacity = '0';
        });
      })(h, drift);
    }
    setTimeout(function () { layer.remove(); }, 1300);
  }

  // ---- 样式内嵌：组件走到哪样式跟到哪，不依赖页面加载哪套 css ----
  function injectStyles() {
    if (document.getElementById('cat-widget-style')) return;
    var st = document.createElement('style');
    st.id = 'cat-widget-style';
    st.textContent =
      '.cat-pet{position:fixed;left:18px;bottom:18px;z-index:9998;' +
      'background:rgba(255,253,249,.96);border:1px solid rgba(94,78,40,.1);' +
      'border-radius:18px;padding:.4rem .4rem .1rem;cursor:pointer;' +
      'box-shadow:0 1px 2px rgba(74,60,24,.04),0 10px 30px rgba(74,60,24,.08);' +
      'animation:cat-bob 3.2s ease-in-out infinite;transition:box-shadow .25s;}' +
      '.cat-pet:hover{box-shadow:0 2px 4px rgba(74,60,24,.05),0 18px 44px rgba(74,60,24,.12);}' +
      '.cat-pet-img{width:46px;height:auto;display:block;transform-origin:50% 90%;' +
      'user-select:none;-webkit-user-drag:none;}' +
      '.cat-pet-img.is-squash{animation:cat-squash .3s cubic-bezier(.2,.8,.3,1.4);}' +
      '@keyframes cat-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
      '@keyframes cat-squash{0%{transform:scale(1,1)}40%{transform:scale(1.15,.85)}100%{transform:scale(1,1)}}' +
      '.cat-pet-bubble{display:block;font-family:JetBrains Mono,ui-monospace,Menlo,Consolas,monospace;' +
      'font-size:.58rem;color:rgba(38,34,26,.42);text-align:center;padding:.15rem 0 .2rem;white-space:nowrap;}' +
      '@media (max-width:640px){.cat-pet{left:12px;bottom:12px}.cat-pet-img{width:38px}}';
    document.head.appendChild(st);
  }

  function updateBubble(bubble) {
    var n = petCount();
    bubble.textContent = n > 0 ? '已摸 ' + n + ' 次' : '摸摸我';
  }

  // ---- 右下角摸猫组件 ----
  function initWidget() {
    if (document.querySelector('.cat-pet')) return;
    var btn = document.createElement('button');
    btn.className = 'cat-pet';
    btn.type = 'button';
    btn.setAttribute('aria-label', '摸摸猫');
    btn.innerHTML =
      '<img class="cat-pet-img" src="' + CAT_SRC + '" alt="" draggable="false">' +
      '<span class="cat-pet-bubble">摸摸我</span>';

    var img = btn.querySelector('.cat-pet-img');
    var bubble = btn.querySelector('.cat-pet-bubble');
    updateBubble(bubble);

    btn.addEventListener('click', function (e) {
      var n = addPet(1);
      updateBubble(bubble);
      img.classList.remove('is-squash');
      void img.offsetWidth;
      img.classList.add('is-squash');
      spawnHearts(e.clientX || 40, e.clientY || window.innerHeight - 80, 4);
      btn.title = '已被摸 ' + n + ' 次';
    });

    document.body.appendChild(btn);
  }

  // ---- [data-pet] 元素：点击摸到点在谁身上都算数 ----
  function initDataPets() {
    document.querySelectorAll('[data-pet]').forEach(function (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (e) {
        addPet(1);
        spawnHearts(e.clientX, e.clientY, 6);
      });
    });
  }

  function init() {
    injectStyles();
    initWidget();
    initDataPets();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
