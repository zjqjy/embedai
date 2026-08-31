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
  const chipsBox = document.getElementById('filter-chips');
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
  const modalVisit = document.getElementById('modal-visit');

  // ★「打开主页 ↗」点击时,把首个 link 的 extract_code 复制到剪贴板兜底
  // (URL 里已带 ?pwd= 可自动填写,剪贴板是双保险)
  if (modalVisit) {
    modalVisit.addEventListener('click', function (e) {
      // 当前 modal 的第一个 link(从 data 属性读)
      const firstCode = modalVisit.dataset.extractCode;
      if (firstCode && firstCode.trim()) {
        // 复制提取码到剪贴板(异步,不等结果)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(firstCode).catch(() => {});
        } else {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = firstCode;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (er) {}
          document.body.removeChild(ta);
        }
        // 显示轻提示(toast 已在 modal 顶部 → 不需额外 toast)
        const originalText = modalVisit.textContent;
        modalVisit.textContent = '✅ 已打开 + 码已复制';
        setTimeout(function () { modalVisit.textContent = originalText; }, 2500);
      }
    });
  }

  // 清除 URL 中的 ?pwd=xxx(让 extract_code 单独显示)
  // 用 URL API 处理,pwd 不在末尾时也能得到合法 URL
  function cleanUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      u.searchParams.delete('pwd');
      return u.toString();
    } catch (err) {
      return url.replace(/[?&]pwd=[a-zA-Z0-9]+/i, '').replace(/[?&]$/, '');
    }
  }

  // 百度网盘链接 + 提取码 → 拼接 ?pwd= 实现打开自动填写
  // (links.yml 里提取码存在 extract_code 字段,URL 本身不一定带)
  function urlWithPwd(url, code) {
    if (!url || !code || !/pan\.baidu\.com/.test(url)) return url || '';
    try {
      const u = new URL(url);
      if (!u.searchParams.get('pwd')) u.searchParams.set('pwd', String(code).trim());
      return u.toString();
    } catch (err) {
      return url;
    }
  }
  const modalNoLinks = document.getElementById('modal-no-links');

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
    // 用 js-yaml 解析(支持嵌套结构)
    if (typeof jsyaml !== 'undefined') {
      tools = jsyaml.load(toolsYamlEl.textContent || '') || [];
      links = jsyaml.load(linksYamlEl.textContent || '') || {};
    } else {
      tools = parseYAML(toolsYamlEl.textContent || '');
      links = parseYAML(linksYamlEl.textContent || '');
    }
  } catch (e) {
    console.error('[tools] YAML 解析失败', e);
    if (loadingEl) loadingEl.textContent = '// 数据解析失败';
    return;
  }

  if (!Array.isArray(tools)) tools = [];
  if (!links || typeof links !== 'object') links = {};

  // 合并 link 元数据到 tool.linksResolved
  // links.yml 是按文章嵌套的(article_slug → [links]),所以需要跨文章查找
  function findLinkInNested(key) {
    for (const articleSlug in links) {
      const arr = links[articleSlug];
      if (Array.isArray(arr)) {
        const found = arr.find(function (l) { return l && l.key === key; });
        if (found) return found;
      }
    }
    return null;
  }
  tools.forEach(function (t) {
    t.linksResolved = (t.links || []).map(function (entry) {
      // 工具的 link 形如 { key: 'claude_oneclick', type: '一键安装包' }
      // 从 links.yml 跨文章查找完整 url / extract_code / status
      const meta = findLinkInNested(entry.key) || {};
      // 合并:meta 优先(完整数据),entry 兜底(只有 key/type)
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
      card.dataset.name = tool.name || '';
      card.dataset.tagline = tool.tagline || '';
      card.dataset.reason = tool.reason || '';
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
        // ★ 用 ↗ 表示「点击访问」更直白
        '<span class="cat-arrow" title="点击查看详情">↗</span>' +
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
    activeTags: new Set(),
    search: ''
  };

  let cards = [];
  let lastFocused = null;

  // -------- 分类 chip:由数据驱动,tools.yml 新增 category 会自动出现 --------
  function catList() {
    const seen = [];
    tools.forEach(function (t) {
      if (t.category && seen.indexOf(t.category) < 0) seen.push(t.category);
    });
    return seen;
  }

  function renderChips() {
    if (!chipsBox) return;
    chipsBox.innerHTML = '';
    const defs = [{ key: 'all', tag: '', label: '全部' }].concat(
      catList().map(function (c) {
        return { key: c, tag: c.toUpperCase(), label: CAT_LABELS[c] || c };
      })
    );
    defs.forEach(function (d) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip' + (d.key === state.category ? ' is-active' : '');
      btn.dataset.cat = d.key;
      if (d.tag) {
        const tag = document.createElement('span');
        tag.className = 'chip-tag';
        tag.textContent = d.tag;
        btn.appendChild(tag);
      }
      btn.appendChild(document.createTextNode(d.label));
      const count = document.createElement('span');
      count.className = 'chip-count';
      count.textContent = '0';
      btn.appendChild(count);
      chipsBox.appendChild(btn);
    });
  }

  function updateChipCounts() {
    const counts = { all: tools.length };
    tools.forEach(function (t) {
      const c = t.category;
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    if (chipsBox) {
      chipsBox.querySelectorAll('.filter-chip').forEach(function (chip) {
        const span = chip.querySelector('.chip-count');
        if (span) span.textContent = counts[chip.dataset.cat] || 0;
      });
    }
    if (heroCount) heroCount.textContent = tools.length + ' 个工具 · ' + catList().length + ' 个分类';
  }

  function applyFilter() {
    let visible = 0;
    const q = (state.search || '').toLowerCase().trim();
    cards.forEach(function (card) {
      const cat = card.dataset.cat;
      const tags = (card.dataset.tags || '').split(',').filter(Boolean);

      const matchCat = state.category === 'all' || cat === state.category;
      const matchTags = state.activeTags.size === 0 ||
        Array.from(state.activeTags).every(function (t) { return tags.indexOf(t) >= 0; });

      // ★ 搜索匹配:name + tagline + reason + 分类名 + 标签
      let matchSearch = true;
      if (q) {
        const searchable = (
          (card.dataset.name || '') + ' ' +
          (card.dataset.tagline || '') + ' ' +
          (card.dataset.reason || '') + ' ' +
          (card.dataset.cat || '') + ' ' +
          (card.dataset.tags || '')
        ).toLowerCase();
        matchSearch = searchable.indexOf(q) >= 0;
      }

      const ok = matchCat && matchTags && matchSearch;
      card.classList.toggle('is-hidden', !ok);
      if (ok) visible++;
    });
    if (emptyState) {
      emptyState.hidden = visible > 0;
      // 自定义无结果提示(区分搜索无果 vs 筛选无果)
      const hint = emptyState.querySelector('.empty-hint');
      if (hint) {
        hint.textContent = q
          ? `没有匹配「${q}」的工具,试试换个关键词`
          : '没有匹配的工具 · 试试清空筛选';
      }
    }

    if (chipsBox) {
      chipsBox.querySelectorAll('.filter-chip').forEach(function (chip) {
        chip.classList.toggle('is-active', chip.dataset.cat === state.category);
      });
    }
    if (clearBtn) clearBtn.hidden = state.activeTags.size === 0 && state.category === 'all' && !q;
    // 搜索框右侧:筛选生效时显示 可见/总数,否则提示 / 快捷键(与清空按钮互斥,按钮优先)
    if (searchHint) {
      const filtering = state.category !== 'all' || state.activeTags.size > 0 || q;
      if (searchClear && !searchClear.hidden) {
        searchHint.textContent = '';
      } else {
        searchHint.textContent = filtering ? visible + ' / ' + cards.length : '/';
      }
    }
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

  if (chipsBox) {
    chipsBox.addEventListener('click', function (e) {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      state.category = chip.dataset.cat || 'all';
      applyFilter();
    });
  }

  // ★ 搜索框:实时过滤(name + tagline + reason + tags + category)
  const searchInput = document.getElementById('filter-search');
  const searchClear = document.getElementById('filter-search-clear');
  const searchHint = document.getElementById('filter-search-hint');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = searchInput.value;
      if (searchClear) searchClear.hidden = !state.search;
      applyFilter();
    });
    // / 快捷键聚焦搜索框(且不在输入框中时)
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      // Esc 清空搜索
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        state.search = '';
        if (searchClear) searchClear.hidden = true;
        applyFilter();
      }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      state.search = '';
      searchClear.hidden = true;
      if (searchInput) searchInput.focus();
      applyFilter();
    });
  }

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
    if (tool.reason && tool.reason.indexOf('⚠️') === 0) {
      modalReason.classList.add('is-warning');
    } else {
      modalReason.classList.remove('is-warning');
    }

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
      modalVisit.hidden = true;
    } else {
      modalNoLinks.hidden = true;
      // ★ 顶部「跳转 ↗」按钮 = 第一个 link 的 URL,网盘链接自动拼 ?pwd=
      const firstLink = tool.linksResolved[0];
      const firstUrl = urlWithPwd(firstLink.url, firstLink.extract_code);
      if (firstUrl) {
        modalVisit.href = firstUrl;
        modalVisit.dataset.extractCode = firstLink.extract_code || '';
        modalVisit.hidden = false;
      } else {
        modalVisit.hidden = true;
      }
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
      urlEl.href = urlWithPwd(link.url, link.extract_code); // 跳转 URL:网盘自动拼 ?pwd=
      urlEl.target = '_blank';
      urlEl.rel = 'noopener noreferrer';
      // ★ 显示用 clean URL(去掉 ?pwd=xxx,提取码单独显示)
      urlEl.textContent = cleanUrl(link.url);
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

  // -------- 7. 3D 倾斜 --------
  // 统一委托给 site.js 的 initTilt(幂等,靠 data-tilt-bound 去重),
  // 不再自实现 —— 之前两套并存会对同一卡片双重绑定、双 rAF 写同一 transform。
  function attachTilt() {
    if (window.EmbedSite && window.EmbedSite.initTilt) {
      window.EmbedSite.initTilt(grid);
    }
  }

  // -------- 启动 --------
  renderChips();
  renderCards();
})();