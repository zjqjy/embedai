/* ============================================================
 * EmbedAI /tools/ 页面交互脚本
 * 数据源: 编译期嵌入的 source/_data/tools.yml + links.yml
 *   (Hexo 8 下 source 页 pug 拿不到 site.data,改用 pug include 把 yml
 *    当作 raw text 塞进 <script type="text/plain">,再在浏览器里解析)
 * 依赖: site.js (data-tilt / data-ripple / data-reveal 等)
 * 启用:
 *   - 分类 chip 单选筛选
 *   - 二级 tag 多选叠加(AND)
 *   - 卡片点击 → modal 展示链接详情 + 提取码复制
 *   - modal: ESC / 遮罩 / 关闭按钮 三种关闭方式
 *   - 基础 focus trap + 焦点回到触发卡片
 * ============================================================ */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------- DOM 引用 --------
  const grid = document.getElementById('tools-grid');
  const loadingEl = document.getElementById('tools-loading');
  const emptyState = document.getElementById('tools-empty');
  const chips = document.querySelectorAll('.filter-chip');
  const clearBtn = document.getElementById('filter-clear');
  const activeTagsBox = document.getElementById('filter-tags-active');
  const heroCount = document.getElementById('hero-count');
  const modal = document.getElementById('tool-modal');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalTagline = document.getElementById('modal-tagline');
  const modalReason = document.getElementById('modal-reason');
  const modalTags = document.getElementById('modal-tags');
  const modalLinks = document.getElementById('modal-links');
  const modalNoLinks = document.getElementById('modal-no-links');
  const chipCounts = {
    all: document.getElementById('chip-count-all'),
    dev: document.getElementById('chip-count-dev'),
    debug: document.getElementById('chip-count-debug'),
    ai: document.getElementById('chip-count-ai'),
    util: document.getElementById('chip-count-util')
  };

  if (!grid || !modal) return;

  // -------- 常量 --------
  const CAT_LABELS = { dev: '软件开发', debug: '调试烧录', ai: '学习辅助', util: '实用工具' };
  const CAT_COLORS = { dev: '#a8c8e0', debug: '#c8b8e0', ai: '#6b9e83', util: '#e8a87c' };

  // -------- 1. 极简 YAML 解析器(适配本仓库 _data/*.yml 格式) --------
  function parseScalar(v) {
    if (v == null) return null;
    v = String(v).trim();
    if (v === '') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    if (v.charAt(0) === '[' && v.charAt(v.length - 1) === ']') {
      const inner = v.slice(1, -1).trim();
      if (!inner) return [];
      return splitTopLevel(inner).map(parseScalar);
    }
    if (v.charAt(0) === '{' && v.charAt(v.length - 1) === '}') {
      const inner = v.slice(1, -1).trim();
      if (!inner) return {};
      const out = {};
      splitTopLevel(inner).forEach(function (p) {
        p = p.trim();
        if (p.indexOf(':') >= 0) {
          const ci = p.indexOf(':');
          const k = p.substring(0, ci).trim();
          const vv = p.substring(ci + 1).trim();
          out[k] = parseScalar(vv);
        }
      });
      return out;
    }
    const first = v.charAt(0);
    const last = v.charAt(v.length - 1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1);
    }
    return v;
  }

  function splitTopLevel(s) {
    const out = [];
    let depth = 0;
    let buf = '';
    let inSingle = false, inDouble = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      const prev = i > 0 ? s.charAt(i - 1) : '';
      if (ch === '"' && prev !== '\\') inDouble = !inDouble;
      else if (ch === "'" && prev !== '\\') inSingle = !inSingle;
      if (!inSingle && !inDouble) {
        if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') depth--;
        else if (ch === ',' && depth === 0) {
          out.push(buf.trim());
          buf = '';
          continue;
        }
      }
      buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function parseYAML(text) {
    const lines = text.split(/\r?\n/).filter(function (l) {
      return !/^\s*#/.test(l) && l.trim() !== '';
    });
    if (lines.length === 0) return null;
    const firstTrim = lines[0].trim();
    return firstTrim.indexOf('- ') === 0 ? parseAsArray(lines) : parseAsObject(lines);
  }

  function parseAsArray(lines) {
    // Top-level array of objects (tools)
    const result = [];
    let curItem = null;
    let pendingKey = null;
    let pendingArr = null;
    let pendingObj = null;
    let pendingIndent = -1;
    let nestedItem = null;
    let nestedItemIndent = -1;

    function flushPending() {
      if (!curItem || !pendingKey) return;
      if (pendingArr && nestedItem) {
        pendingArr.push(nestedItem);
        nestedItem = null;
      }
      if (pendingArr) curItem[pendingKey] = pendingArr;
      else if (pendingObj) curItem[pendingKey] = pendingObj;
      pendingKey = null;
      pendingArr = null;
      pendingObj = null;
      pendingIndent = -1;
      nestedItem = null;
      nestedItemIndent = -1;
    }

    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      const indent = raw.match(/^ */)[0].length;
      const line = raw.trim();

      if (indent === 0 && line.indexOf('- ') === 0) {
        // New top-level item
        flushPending();
        curItem = {};
        result.push(curItem);
        const rest = line.substring(2).trim();
        if (rest.indexOf(':') >= 0) {
          const ci = rest.indexOf(':');
          const k = rest.substring(0, ci).trim();
          const v = rest.substring(ci + 1).trim();
          curItem[k] = parseScalar(v);
        }
      } else if (pendingKey && indent > pendingIndent) {
        // Inside pending multi-line value
        if (line.indexOf('- ') === 0 && pendingArr) {
          // New nested array item
          if (nestedItem) pendingArr.push(nestedItem);
          nestedItem = {};
          nestedItemIndent = indent;
          const rest = line.substring(2).trim();
          if (rest.indexOf(':') >= 0) {
            const ci = rest.indexOf(':');
            const k = rest.substring(0, ci).trim();
            const v = rest.substring(ci + 1).trim();
            nestedItem[k] = parseScalar(v);
          }
        } else if (line.indexOf(':') >= 0) {
          const ci = line.indexOf(':');
          const k = line.substring(0, ci).trim();
          const v = line.substring(ci + 1).trim();
          if (pendingObj) {
            if (v === '') {
              pendingObj[k] = {};
            } else {
              pendingObj[k] = parseScalar(v);
            }
          } else if (nestedItem && indent > pendingIndent) {
            // Continue the current nested item
            nestedItem[k] = parseScalar(v);
          }
        }
      } else if (indent === 2 && line.indexOf(':') >= 0 && curItem) {
        const ci = line.indexOf(':');
        const k = line.substring(0, ci).trim();
        const v = line.substring(ci + 1).trim();
        if (v === '') {
          // Multi-line value
          pendingKey = k;
          pendingIndent = indent;
          nestedItem = null;
          nestedItemIndent = -1;
          let nextNonEmpty = null;
          for (let j = li + 1; j < lines.length; j++) {
            if (/^\s*#/.test(lines[j]) || !lines[j].trim()) continue;
            nextNonEmpty = lines[j].trim();
            break;
          }
          if (nextNonEmpty && nextNonEmpty.indexOf('- ') === 0) {
            pendingArr = [];
            pendingObj = null;
          } else {
            pendingArr = null;
            pendingObj = {};
          }
        } else {
          curItem[k] = parseScalar(v);
        }
      }
    }

    flushPending();
    return result;
  }

  function parseAsObject(lines) {
    // Top-level object (links)
    const result = {};
    const stack = [{ indent: -1, target: result }];

    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      const indent = raw.match(/^ */)[0].length;
      const line = raw.trim();
      if (line.indexOf(':') < 0) continue;
      const ci = line.indexOf(':');
      const k = line.substring(0, ci).trim();
      const v = line.substring(ci + 1).trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];

      if (v === '') {
        const child = {};
        parent.target[k] = child;
        stack.push({ indent: indent, target: child });
      } else {
        parent.target[k] = parseScalar(v);
      }
    }

    return result;
  }

  // -------- 2. 加载并解析数据 --------
  const toolsYamlEl = document.getElementById('tools-data-yaml');
  const linksYamlEl = document.getElementById('links-data-yaml');

  if (!toolsYamlEl || !linksYamlEl) {
    console.warn('[tools] 找不到数据 script 标签');
    if (loadingEl) loadingEl.textContent = '// 数据加载失败';
    return;
  }

  let tools, links;
  try {
    tools = parseYAML(toolsYamlEl.textContent || '');
    links = parseYAML(linksYamlEl.textContent || '');
  } catch (e) {
    console.error('[tools] YAML 解析失败', e);
    if (loadingEl) loadingEl.textContent = '// 数据解析失败';
    return;
  }

  if (!Array.isArray(tools)) tools = [];
  if (!links || typeof links !== 'object') links = {};

  // 合并 link 元数据到 tool.linksResolved
  tools.forEach(function (t) {
    t.linksResolved = (t.links || []).map(function (entry) {
      const meta = links[entry.key] || {};
      return Object.assign({}, entry, meta);
    });
  });

  if (loadingEl) loadingEl.style.display = 'none';

  // -------- 3. 渲染卡片 --------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function renderCards() {
    grid.innerHTML = '';
    tools.forEach(function (tool, idx) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cat tool-card';
      card.dataset.cat = tool.category || '';
      card.dataset.tags = (tool.tags || []).join(',');
      card.dataset.toolIdx = String(idx);
      const catColor = CAT_COLORS[tool.category] || 'var(--accent)';
      card.style.setProperty('--cat-color', catColor);
      card.setAttribute('aria-label', '查看 ' + (tool.name || '') + ' 详情');
      card.setAttribute('data-tilt', '');
      card.setAttribute('data-tilt-max', '6');
      card.setAttribute('data-tilt-scale', '1.02');
      card.setAttribute('data-ripple', '');

      const tagsHtml = (tool.tags || [])
        .map(function (t) { return '<span class="tool-tag" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>'; })
        .join('');
      const linkCount = tool.linksResolved.length;
      const catLabel = CAT_LABELS[tool.category] || tool.category || '';

      card.innerHTML =
        '<span class="cat-num">' + pad2(idx + 1) + '</span>' +
        '<span class="cat-arrow">→</span>' +
        '<div class="cat-icon">' + escapeHtml(tool.icon || '') + '</div>' +
        '<h3>' + escapeHtml(tool.name || '') + '</h3>' +
        '<div class="cat-desc">' + escapeHtml(tool.tagline || '') + '</div>' +
        '<div class="tool-tags">' +
          '<span class="tool-cat-pill">' + escapeHtml(catLabel) + '</span>' +
          tagsHtml +
        '</div>' +
        '<div class="cat-foot">' +
          '<span class="' + (linkCount > 0 ? 'links-count' : 'links-count empty') + '">' +
            (linkCount > 0 ? linkCount + ' 个链接' : '暂无链接') +
          '</span>' +
          '<span>' + escapeHtml(catLabel) + '</span>' +
        '</div>';

      grid.appendChild(card);
    });

    cards = Array.prototype.slice.call(grid.querySelectorAll('.tool-card'));
    bindCardEvents();
    attachTilt();
    updateChipCounts();
    applyFilter();
  }

  // -------- 4. 筛选状态 --------
  const state = {
    category: 'all',
    activeTags: new Set()
  };

  let cards = [];
  let lastFocused = null;

  function updateChipCounts() {
    const counts = { all: tools.length, dev: 0, debug: 0, ai: 0, util: 0 };
    tools.forEach(function (t) {
      const c = t.category;
      if (counts[c] !== undefined) counts[c]++;
    });
    Object.keys(chipCounts).forEach(function (k) {
      if (chipCounts[k]) chipCounts[k].textContent = counts[k];
    });
    if (heroCount) heroCount.textContent = tools.length + ' 个工具 · 4 个分类';
  }

  function applyFilter() {
    let visible = 0;
    cards.forEach(function (card) {
      const cat = card.dataset.cat;
      const tags = (card.dataset.tags || '').split(',').filter(Boolean);

      const matchCat = state.category === 'all' || cat === state.category;
      const matchTags = state.activeTags.size === 0 ||
        Array.from(state.activeTags).every(function (t) { return tags.indexOf(t) >= 0; });

      const ok = matchCat && matchTags;
      card.classList.toggle('is-hidden', !ok);
      if (ok) visible++;
    });
    if (emptyState) emptyState.hidden = visible > 0;

    chips.forEach(function (chip) {
      chip.classList.toggle('is-active', chip.dataset.cat === state.category);
    });
    if (clearBtn) clearBtn.hidden = state.activeTags.size === 0 && state.category === 'all';
    renderActiveTagsBox();
  }

  function renderActiveTagsBox() {
    if (!activeTagsBox) return;
    activeTagsBox.innerHTML = '';
    if (state.activeTags.size === 0) return;
    const label = document.createElement('span');
    label.textContent = '// 已选 tag(AND): ';
    label.style.marginRight = '0.3rem';
    activeTagsBox.appendChild(label);
    Array.from(state.activeTags).forEach(function (tag) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = escapeHtml(tag) + '<span class="x" data-remove-tag="' + escapeHtml(tag) + '">×</span>';
      activeTagsBox.appendChild(chip);
    });
  }

  // -------- 5. 事件绑定 --------
  function bindCardEvents() {
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        const tagEl = e.target.closest('.tool-tag');
        if (tagEl) {
          e.stopPropagation();
          const tag = tagEl.dataset.tag;
          if (!tag) return;
          if (state.activeTags.has(tag)) {
            state.activeTags.delete(tag);
          } else {
            state.activeTags.add(tag);
          }
          document.querySelectorAll('.tool-tag[data-tag="' + tag + '"]').forEach(function (el) {
            el.classList.toggle('is-active', state.activeTags.has(tag));
          });
          applyFilter();
          return;
        }
        openModal(card);
      });
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.category = chip.dataset.cat || 'all';
      applyFilter();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      state.category = 'all';
      state.activeTags.clear();
      document.querySelectorAll('.tool-tag.is-active').forEach(function (el) {
        el.classList.remove('is-active');
      });
      applyFilter();
    });
  }

  if (activeTagsBox) {
    activeTagsBox.addEventListener('click', function (e) {
      const rm = e.target.closest('[data-remove-tag]');
      if (!rm) return;
      const tag = rm.dataset.removeTag;
      state.activeTags.delete(tag);
      document.querySelectorAll('.tool-tag[data-tag="' + tag + '"]').forEach(function (el) {
        el.classList.remove('is-active');
      });
      applyFilter();
    });
  }

  // -------- 6. modal 控制 --------
  function openModal(card) {
    const idx = parseInt(card.dataset.toolIdx || '-1', 10);
    const tool = tools[idx];
    if (!tool) return;
    lastFocused = card;

    modalIcon.textContent = tool.icon || '';
    modalTitle.textContent = tool.name || '';
    modalTagline.textContent = tool.tagline || '';
    modalReason.textContent = tool.reason || '';

    modalTags.innerHTML = '';
    (tool.tags || []).forEach(function (t) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      modalTags.appendChild(span);
    });

    modalLinks.innerHTML = '';
    if (!tool.linksResolved.length) {
      modalNoLinks.hidden = false;
    } else {
      modalNoLinks.hidden = true;
      tool.linksResolved.forEach(function (link) {
        modalLinks.appendChild(buildLinkItem(link));
      });
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      const firstFocusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) firstFocusable.focus();
    });
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function buildLinkItem(link) {
    const wrap = document.createElement('div');
    wrap.className = 'tool-modal-link';

    const head = document.createElement('div');
    head.className = 'tool-modal-link-head';
    const typeEl = document.createElement('span');
    typeEl.className = 'tool-modal-link-type';
    typeEl.textContent = link.type || '链接';
    head.appendChild(typeEl);
    const labelEl = document.createElement('span');
    labelEl.className = 'tool-modal-link-label';
    labelEl.textContent = link.label || link.url || '链接';
    head.appendChild(labelEl);
    wrap.appendChild(head);

    if (link.url) {
      const urlEl = document.createElement('a');
      urlEl.className = 'tool-modal-link-url';
      urlEl.href = link.url;
      urlEl.target = '_blank';
      urlEl.rel = 'noopener noreferrer';
      urlEl.textContent = link.url;
      wrap.appendChild(urlEl);
    }

    if (link.extract_code) {
      const codeEl = document.createElement('div');
      codeEl.className = 'tool-modal-link-code';
      const codeLabel = document.createElement('span');
      codeLabel.className = 'code-label';
      codeLabel.textContent = '提取码';
      codeEl.appendChild(codeLabel);
      const codeVal = document.createElement('span');
      codeVal.className = 'code-value';
      codeVal.textContent = link.extract_code;
      codeEl.appendChild(codeVal);
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'tool-modal-link-copy';
      copyBtn.textContent = '📋 复制';
      copyBtn.addEventListener('click', function () {
        const text = link.extract_code
          ? `链接：${link.url}\n提取码：${link.extract_code}`
          : link.url;
        copyToClipboard(text, copyBtn);
      });
      codeEl.appendChild(copyBtn);
      wrap.appendChild(codeEl);
    }

    if (link.note) {
      const noteEl = document.createElement('div');
      noteEl.className = 'tool-modal-link-note';
      noteEl.textContent = '// ' + link.note;
      wrap.appendChild(noteEl);
    }

    return wrap;
  }

  function copyToClipboard(text, btn) {
    const done = function () {
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = '✓ 已复制';
      btn.classList.add('is-copied');
      setTimeout(function () {
        btn.textContent = orig;
        btn.classList.remove('is-copied');
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      cb && cb();
    } catch (e) {
      console.warn('[tools] 复制失败', e);
    }
    document.body.removeChild(ta);
  }

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-modal-close]')) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // -------- 7. 自定义 3D 倾斜(site.js 不会自动接管动态生成的元素) --------
  function attachTilt() {
    if (prefersReducedMotion) return;
    const els = grid.querySelectorAll('[data-tilt]');
    els.forEach(function (el) {
      const max = parseFloat(el.dataset.tiltMax || '8');
      const scale = parseFloat(el.dataset.tiltScale || '1.02');
      let rect = null;
      let rafId = null;
      let tx = 0, ty = 0, cx = 0, cy = 0;

      function refresh() { rect = el.getBoundingClientRect(); }
      function schedule() {
        if (rafId) return;
        rafId = requestAnimationFrame(tick);
      }
      function tick() {
        rafId = null;
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        const active = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05;
        const rest = tx === 0 && ty === 0;
        const s = rest ? 1 : scale;
        el.style.transform =
          'perspective(1000px) rotateX(' + cx.toFixed(2) + 'deg) rotateY(' +
          cy.toFixed(2) + 'deg) scale(' + s + ')';
        if (active) schedule();
        else if (rest) el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
      }

      el.addEventListener('mouseenter', refresh);
      el.addEventListener('mousemove', function (e) {
        if (!rect) refresh();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        tx = (py - 0.5) * -max * 2;
        ty = (px - 0.5) * max * 2;
        schedule();
      });
      el.addEventListener('mouseleave', function () {
        tx = 0; ty = 0; schedule(); rect = null;
      });
    });
  }

  // -------- 启动 --------
  renderCards();
})();