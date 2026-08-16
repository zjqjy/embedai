/* ============================================================
 * Admin Panel — Tools / Links 双 tab 编辑器
 * 零后端 · 纯静态 · 自托管 YAML 生成 + localStorage 草稿
 * ============================================================ */
(function () {
  'use strict';

  // -----------------------------------------------------------
  // 常量
  // -----------------------------------------------------------
  const STORAGE_KEY_TOOLS = 'admin_draft_tools';
  const STORAGE_KEY_LINKS = 'admin_draft_links';

  // 从 source/_data/links.yml 静态拉一份默认列表（用于 link key 联想）
  // 实际生产：可以从公开 JSON 端点拉，但 admin 隐藏入口、本地草稿足够
  const DEFAULT_LINKS = {
    claude_official: { label: 'Claude 官网', type: 'official' },
    claude_oneclick: { label: 'Claude Code 一键安装包', type: 'baidu' },
    claude_install_v4nb: { label: 'Claude Code 安装包（旧版）', type: 'baidu' },
    minimax_token_plan: { label: 'MiniMax Token Plan 订阅', type: 'signup' },
    uv_install: { label: 'uv 安装脚本（Windows）', type: 'script' },
    em_skill_install: { label: 'EM-SKILL 安装包（百度网盘）', type: 'baidu' },
    em_skill_repo: { label: 'EM-SKILL GitHub 项目页', type: 'github' },
    em_skill_clone: { label: 'EM-SKILL Git 克隆地址', type: 'github' },
    embed_ai_tool: { label: 'embed-ai-tool (LeoKemp223)', type: 'github' },
    xpack_openocd: { label: 'xPack OpenOCD 发布页', type: 'github' }
  };

  // 默认状态
  const emptyToolsForm = {
    name: '',
    category: 'dev',
    icon: '',
    tagline: '',
    reason: '',
    tags: '',
    links: []
  };

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const emptyLinksForm = {
    article_slug: '',
    key: '',
    label: '',
    url: '',
    type: 'baidu',
    extract_code: '',
    note: '',
    status: 'active',
    added: todayISO()
  };

  // -----------------------------------------------------------
  // 状态
  // -----------------------------------------------------------
  let activeTab = 'tools';

  // 表单状态（运行时镜像）
  const state = {
    tools: clone(emptyToolsForm),
    links: clone(emptyLinksForm),
    articles: { slug: '', title: '', date: '', tags: '', categories: '', description: '', content: '' }
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -----------------------------------------------------------
  // DOM 引用
  // -----------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const yamlOutput = $('#yaml-output');
  const outputName = $('#output-name');
  const toastEl = $('#toast');

  // -----------------------------------------------------------
  // Toast
  // -----------------------------------------------------------
  let toastTimer = null;
  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (type === 'error' ? ' error' : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2200);
  }

  // -----------------------------------------------------------
  // Tabs
  // -----------------------------------------------------------
  function bindTabs() {
    $$('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        if (target === activeTab) return;
        activeTab = target;
        $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === target));
        $$('.tab-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === target));
        renderOutput();
        updateOutputName();
        // 切 tab 时刷新顶部列表 + 新增按钮文案
        if (target === 'articles') loadArticlesList();
        renderLiveList();
      });
    });
  }

  // 顶部 panel-live 的「＋ 新增」按钮:按 tab 分发
  function newItem() {
    if (activeTab === 'tools') {
      state.tools = clone(emptyToolsForm);
      editingKey = null;
      syncFormToDOM();
      renderOutput();
      toast('＋ 新增工具模式（保存会写入新条目）');
    } else if (activeTab === 'links') {
      state.links = clone(emptyLinksForm);
      editingKey = null;
      syncFormToDOM();
      renderOutput();
      toast('＋ 新增链接模式（保存会写入新条目）');
    } else if (activeTab === 'articles') {
      newArticle();
    }
  }

  function updateOutputName() {
    outputName.textContent = activeTab === 'tools' ? 'tools.yml' : 'links.yml';
  }

  // -----------------------------------------------------------
  // Tools Tab — 链接动态行
  // -----------------------------------------------------------
  function renderToolLinks() {
    const list = $('#t-links-list');
    list.innerHTML = '';
    if (!state.tools.links || state.tools.links.length === 0) {
      // 留空让用户点 + 添加
      return;
    }
    state.tools.links.forEach((link, idx) => {
      list.appendChild(buildToolLinkRow(link, idx));
    });
  }

  function buildToolLinkRow(link, idx) {
    // 简化:5 个字段,每个字段单独一行,不再挤 2 列
    const wrap = document.createElement('div');
    wrap.className = 'link-row link-row-stacked';

    const resolved = lookupLink(link.key);

    // row 1: key + type (主标识)
    const row1 = document.createElement('div');
    row1.className = 'link-row-stack-line';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'input';
    keyInput.placeholder = 'key (claude_oneclick)';
    keyInput.value = link.key || '';
    keyInput.setAttribute('list', 'link-keys-datalist');
    keyInput.addEventListener('input', () => {
      state.tools.links[idx].key = keyInput.value;
      // key 改变时自动从 links.yml 拉数据填充
      const r = lookupLink(keyInput.value);
      if (r) {
        state.tools.links[idx].url = r.url || '';
        state.tools.links[idx].extract_code = r.extract_code || '';
        state.tools.links[idx].status = r.status || 'active';
        state.tools.links[idx].type = state.tools.links[idx].type || r.type || '官网';
        // 重新渲染让 url/code/status 显示新值
        renderToolLinks();
      }
      renderOutput();
      renderLiveList();
    });

    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'input';
    typeInput.placeholder = 'type (官网/网盘/GitHub)';
    typeInput.value = link.type || '';
    typeInput.addEventListener('input', () => {
      state.tools.links[idx].type = typeInput.value;
      renderOutput();
      renderLiveList();
    });

    row1.appendChild(keyInput);
    row1.appendChild(typeInput);
    wrap.appendChild(row1);

    // row 2: url (独占一行,大宽度)
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'input';
    urlInput.placeholder = 'url (https://...)';
    urlInput.value = link.url || resolved?.url || '';
    urlInput.addEventListener('input', () => {
      state.tools.links[idx].url = urlInput.value;
      renderOutput();
      renderLiveList();
    });
    wrap.appendChild(urlInput);

    // row 3: 提取码 + 状态 + 删除 (操作行)
    const row3 = document.createElement('div');
    row3.className = 'link-row-stack-line';

    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.className = 'input input-small';
    codeInput.placeholder = '提取码';
    codeInput.value = link.extract_code || resolved?.extract_code || '';
    codeInput.addEventListener('input', () => {
      state.tools.links[idx].extract_code = codeInput.value;
      renderOutput();
      renderLiveList();
    });

    const statusSelect = document.createElement('select');
    statusSelect.className = 'select';
    statusSelect.innerHTML = `
      <option value="active">✓ active</option>
      <option value="warning">⚠ warning</option>
      <option value="broken">❌ broken</option>
    `;
    statusSelect.value = link.status || resolved?.status || 'active';
    statusSelect.addEventListener('change', () => {
      state.tools.links[idx].status = statusSelect.value;
      renderOutput();
      renderLiveList();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'row-remove';
    removeBtn.textContent = '×';
    removeBtn.title = '删除此行';
    removeBtn.addEventListener('click', () => {
      state.tools.links.splice(idx, 1);
      renderToolLinks();
      renderOutput();
    });

    row3.appendChild(codeInput);
    row3.appendChild(statusSelect);
    row3.appendChild(removeBtn);
    wrap.appendChild(row3);

    return wrap;
  }

  // 跨文章查找 link (跟 helper 一样的逻辑)
  function lookupLink(key) {
    if (!key) return null;
    for (const slug of Object.keys(liveData.links || {})) {
      const arr = liveData.links[slug];
      if (Array.isArray(arr)) {
        const found = arr.find(l => l && l.key === key);
        if (found) return found;
      }
    }
    return null;
  }

  function bindAddToolLink() {
    $('#t-add-link').addEventListener('click', () => {
      state.tools.links.push({ key: '', type: '', status: 'active' });
      renderToolLinks();
      renderOutput();
    });
  }

  // -----------------------------------------------------------
  // 把 <datalist> 注入（link key 联想）
  // -----------------------------------------------------------
  function injectDatalist() {
    const datalist = document.createElement('datalist');
    datalist.id = 'link-keys-datalist';
    Object.keys(DEFAULT_LINKS).forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k;
      const info = DEFAULT_LINKS[k];
      opt.label = `${k} — ${info.label}${info.type ? ' (' + info.type + ')' : ''}`;
      datalist.appendChild(opt);
    });
    document.body.appendChild(datalist);
  }

  // -----------------------------------------------------------
  // Tools 表单字段绑定
  // -----------------------------------------------------------
  function bindToolsFields() {
    const fields = ['name', 'category', 'icon', 'tagline', 'reason', 'tags'];
    fields.forEach((f) => {
      const el = document.querySelector(`[data-pane="tools"] [data-field="${f}"]`);
      if (!el) return;
      el.addEventListener('input', () => {
        state.tools[f] = el.value;
        renderOutput();
        renderLiveList(); // ★ 同步顶部卡片
      });
      el.addEventListener('change', () => {
        state.tools[f] = el.value;
        renderOutput();
        renderLiveList();
      });
    });
  }

  // -----------------------------------------------------------
  // Links 表单字段绑定
  // -----------------------------------------------------------
  function bindLinksFields() {
    const fields = ['article_slug', 'key', 'label', 'url', 'type', 'extract_code', 'note', 'status', 'added'];
    fields.forEach((f) => {
      const el = document.querySelector(`[data-pane="links"] [data-field="${f}"]`);
      if (!el) return;
      el.addEventListener('input', () => {
        state.links[f] = el.value;
        renderOutput();
        toggleExtractVisibility();
      });
      el.addEventListener('change', () => {
        state.links[f] = el.value;
        renderOutput();
        toggleExtractVisibility();
      });
    });
  }

  function toggleExtractVisibility() {
    const wrap = $('#l-extract-wrap');
    if (!wrap) return;
    const isBaidu = state.links.type === 'baidu';
    wrap.style.display = isBaidu ? '' : 'none';
  }

  // -----------------------------------------------------------
  // YAML 生成
  // -----------------------------------------------------------
  function yamlEscape(str) {
    if (str == null) return '';
    return String(str);
  }

  // 简单的引号判定：含冒号 / 井号 / 列表字符 / 起始特殊，则加引号
  function yamlQuote(str) {
    const s = String(str);
    if (s === '') return '""';
    if (
      /[:#\n\r\t[\]{}|>&*!%@`,]/.test(s) ||
      /^\s|\s$/.test(s) ||
      /^(true|false|null|~)$/i.test(s) ||
      /^-?\d/.test(s)
    ) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function renderTags(tagsStr) {
    if (!tagsStr) return '[]';
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return '[]';
    return '[' + tags.map(yamlQuote).join(', ') + ']';
  }

  function buildToolsYAML() {
    const t = state.tools;
    const lines = [];
    lines.push('# ============================================');
    lines.push('# 工具条目（单条，可粘贴到 source/_data/tools.yml）');
    lines.push('# 由 admin 生成;链接完整数据会同步到 source/_data/links.yml');
    lines.push('# ============================================ ');
    lines.push('- name: ' + yamlQuote(yamlEscape(t.name)));
    lines.push('  category: ' + yamlQuote(yamlEscape(t.category || 'dev')));
    if (t.icon) {
      lines.push('  icon: ' + yamlQuote(yamlEscape(t.icon)));
    }
    lines.push('  tagline: ' + yamlQuote(yamlEscape(t.tagline)));
    lines.push('  reason: ' + yamlQuote(yamlEscape(t.reason)));
    lines.push('  tags: ' + renderTags(t.tags));
    if (t.links && t.links.length > 0) {
      lines.push('  links:');
      t.links.forEach((l) => {
        if (!l.key && !l.type && !l.url) return;
        lines.push('    - key: ' + yamlQuote(yamlEscape(l.key)));
        if (l.type) lines.push('      type: ' + yamlQuote(yamlEscape(l.type)));
        if (l.label) lines.push('      label: ' + yamlQuote(yamlEscape(l.label)));
        if (l.url) lines.push('      url: ' + yamlQuote(yamlEscape(l.url)));
        if (l.extract_code) lines.push('      extract_code: ' + yamlQuote(yamlEscape(l.extract_code)));
        if (l.status) lines.push('      status: ' + yamlQuote(yamlEscape(l.status)));
      });
    } else {
      lines.push('  links: []');
    }
    return lines.join('\n');
  }

  function buildLinksYAML() {
    const l = state.links;
    const lines = [];
    lines.push('# ============================================');
    lines.push('# 链接条目（按文章嵌套）');
    lines.push('# 由 admin 自动生成,可粘贴到 source/_data/links.yml');
    lines.push('# ============================================ ');
    const articleSlug = l.article_slug || 'my-article-slug';
    const key = l.key || 'my_link_key';
    lines.push(yamlQuote(articleSlug) + ':');
    lines.push('  - key: ' + yamlQuote(key));
    lines.push('    label: ' + yamlQuote(yamlEscape(l.label)));
    lines.push('    url: ' + yamlQuote(yamlEscape(l.url)));
    lines.push('    type: ' + yamlQuote(yamlEscape(l.type || 'official')));
    if (l.type === 'baidu' && l.extract_code) {
      lines.push('    extract_code: ' + yamlQuote(yamlEscape(l.extract_code)));
    }
    lines.push('    status: ' + yamlQuote(l.status || 'active'));
    if (l.note) {
      lines.push('    note: ' + yamlQuote(yamlEscape(l.note)));
    }
    lines.push('    added: ' + yamlQuote(yamlEscape(l.added || todayISO())));
    return lines.join('\n');
  }

  function renderOutput() {
    const text = activeTab === 'tools' ? buildToolsYAML() : buildLinksYAML();
    yamlOutput.value = text;
  }

  // -----------------------------------------------------------
  // localStorage 草稿
  // -----------------------------------------------------------
  function saveDraft() {
    const payload = {
      form: clone(state[activeTab]),
      tab: activeTab,
      savedAt: new Date().toISOString()
    };
    const key = activeTab === 'tools' ? STORAGE_KEY_TOOLS : STORAGE_KEY_LINKS;
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      toast('📝 草稿已暂存到 localStorage (不会写入文件,下次打开自动恢复)');
    } catch (e) {
      toast('保存失败：' + e.message, 'error');
    }
  }

  function loadDraft() {
    ['tools', 'links'].forEach((tab) => {
      const key = tab === 'tools' ? STORAGE_KEY_TOOLS : STORAGE_KEY_LINKS;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && data.form) {
          state[tab] = Object.assign(clone(tab === 'tools' ? emptyToolsForm : emptyLinksForm), data.form);
        }
      } catch (e) {
        console.warn('Failed to load draft for', tab, e);
      }
    });
  }

  function clearDraft() {
    const key = activeTab === 'tools' ? STORAGE_KEY_TOOLS : STORAGE_KEY_LINKS;
    try {
      localStorage.removeItem(key);
      // 重置当前 tab
      state[activeTab] = clone(activeTab === 'tools' ? emptyToolsForm : emptyLinksForm);
      syncFormToDOM();
      renderOutput();
      toast('🗑 草稿已清空');
    } catch (e) {
      toast('清空失败：' + e.message, 'error');
    }
  }

  // -----------------------------------------------------------
  // DOM ↔ State 同步
  // -----------------------------------------------------------
  function syncFormToDOM() {
    // tools
    const toolsFields = ['name', 'category', 'icon', 'tagline', 'reason', 'tags'];
    toolsFields.forEach((f) => {
      const el = document.querySelector(`[data-pane="tools"] [data-field="${f}"]`);
      if (el) el.value = state.tools[f] || '';
    });
    renderToolLinks();

    // links
    const linksFields = ['article_slug', 'key', 'label', 'url', 'type', 'extract_code', 'note', 'status', 'added'];
    linksFields.forEach((f) => {
      const el = document.querySelector(`[data-pane="links"] [data-field="${f}"]`);
      if (el) el.value = state.links[f] || '';
    });
    toggleExtractVisibility();
  }

  // -----------------------------------------------------------
  // 复制 / 下载
  // -----------------------------------------------------------
  async function copyYAML() {
    const text = yamlOutput.value;
    if (!text) {
      toast('无可复制内容', 'error');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback
        yamlOutput.removeAttribute('readonly');
        yamlOutput.select();
        document.execCommand('copy');
        yamlOutput.setAttribute('readonly', 'readonly');
        yamlOutput.blur();
      }
      toast('📋 已复制到剪贴板');
    } catch (e) {
      toast('复制失败：' + e.message, 'error');
    }
  }

  function downloadYAML() {
    const text = yamlOutput.value;
    if (!text) {
      toast('无可下载内容', 'error');
      return;
    }
    const filename = activeTab === 'tools' ? 'tools.yml' : 'links.yml';
    const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('💾 已下载 ' + filename);
  }

  // -----------------------------------------------------------
  // 保存到文件 (本地 admin-server 后端)
  // -----------------------------------------------------------
  async function saveToServer() {
    const yamlText = $('#yaml-output').value.trim();
    if (!yamlText) {
      toast('无内容可保存', 'error');
      return;
    }
    const tab = activeTab;
    const file = tab === 'tools' ? 'tools.yml' : 'links.yml';
    const endpoint = tab === 'tools' ? '/api/tools' : '/api/links';

    const btn = $('#btn-save-server');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ 写入中...';

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/yaml' },
        body: yamlText
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      // 文件已成功写入
      const savedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      toast(`✅ ${file} 已写入 (${data.bytes} 字节 @ ${savedAt})`, 'success', 5000);
      markFileSaved(file, savedAt, data.message);
      // 重新拉取 live data 刷新列表
      loadLiveData();
      editingKey = null;
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        toast('❌ 后端未启动。请先运行 `npm run admin`', 'error');
      } else {
        toast('❌ 保存失败：' + e.message, 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  // 文件保存状态指示
  function markFileSaved(file, time, detail) {
    const indicator = $('#file-saved-indicator');
    if (!indicator) return;
    indicator.classList.add('saved');
    indicator.innerHTML = `✅ <code>${file}</code> 已保存 @ ${time}`;
    if (detail) {
      indicator.title = detail;
    }
    setTimeout(() => {
      indicator.classList.remove('saved');
    }, 8000);
  }

  // -----------------------------------------------------------
  // 实时数据 (从 admin-server 拉取)
  // -----------------------------------------------------------
  let liveData = { tools: [], links: {} };
  let editingKey = null; // 当前编辑的工具名/链接 key,null 表示新增

  async function loadLiveData() {
    const empty = $('#live-empty');
    const list = $('#live-list');
    if (list) list.innerHTML = '<div class="live-empty"><p>加载中...</p></div>';

    try {
      const [toolsResp, linksResp, postsResp] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/links'),
        fetch('/api/posts')
      ]);
      const toolsData = await toolsResp.json();
      const linksData = await linksResp.json();
      const postsData = await postsResp.json();
      if (!toolsData.ok || !linksData.ok) {
        throw new Error(toolsData.error || linksData.error || '加载失败');
      }
      liveData.tools = toolsData.data || [];
      liveData.links = linksData.data || {};
      // ★ 同步拉取文章列表 → links tab 能看到所有文章(含没链接的)
      if (postsData.ok) {
        articlesList = postsData.data || [];
        updateArticleSlugDatalist();
        // ★ 异步加载所有文章的内联 URL(正文里硬编码的 http://)
        loadAllInlineLinks().then(() => renderLiveList());
      }
      if (empty) empty.hidden = true;
      renderLiveList();
      const articleCount = articlesList.length || Object.keys(liveData.links).length;
      const linkCount = Object.values(liveData.links).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      const src = $('#live-source');
      if (src) src.textContent = `${liveData.tools.length} 工具 / ${linkCount} 链接 / ${articleCount} 文章`;
      toast(`✅ 已加载 ${liveData.tools.length} 工具 + ${linkCount} 链接 (跨 ${articleCount} 文章)`);
    } catch (e) {
      if (empty) empty.hidden = false;
      if (list) list.innerHTML = '';
      const src = $('#live-source');
      if (src) src.textContent = '未连接';
      if (!e.message.includes('Failed to fetch')) {
        toast('加载失败：' + e.message, 'error');
      }
    }
  }

  // 把 articlesList 同步到 link form 的 article-slugs datalist(动态填充)
  function updateArticleSlugDatalist() {
    const datalist = $('#article-slugs-list');
    if (!datalist) return;
    datalist.innerHTML = articlesList.map(p =>
      `<option value="${escapeHtml(p.slug)}">`
    ).join('');
  }

  // 缓存文章内联 URL 解析结果(从文章正文扫描的硬编码 URL)
  let inlineLinksMap = {};

  // 渲染单个 link card (links tab panel-live 用)
  function renderLinkCard(link, articleSlug, isInline) {
    isInline = isInline || link.inline || link.status === 'inline';
    const status = link.status || 'active';
    const statusIcon = isInline ? '📝' : (status === 'broken' ? '❌' : status === 'warning' ? '⚠️' : '✓');
    const card = document.createElement('div');
    card.className = 'live-item live-item-link status-' + status + (isInline ? ' status-inline' : '');
    card.dataset.article = articleSlug;
    card.dataset.key = link.key;
    const encodedUrl = encodeURIComponent(link.url || '');
    card.innerHTML = `
      <div class="live-item-row1">
        <span class="status-dot-inline status-${status}${isInline ? ' status-dot-inline-mark' : ''}" title="${isInline ? '内联(未注册到 links.yml)' : status}">${statusIcon}</span>
        <span class="live-item-name">${escapeHtml(link.label || link.key)}</span>
        ${isInline ? '<span class="badge-inline">内联</span>' : ''}
      </div>
      <div class="live-item-url" title="${escapeHtml(link.url || '')}">${escapeHtml(link.url || '(无 url)')}</div>
      <div class="live-item-hover">
        <span class="chip-mini">${escapeHtml(link.type || '?')}</span>
        ${link.extract_code ? `<span class="chip-mini chip-code">码: ${escapeHtml(link.extract_code)}</span>` : ''}
        ${!isInline
          ? `<button class="btn-icon btn-edit-link" data-article="${escapeHtml(articleSlug)}" data-key="${escapeHtml(link.key)}" type="button" title="编辑">✏️</button>`
          : `<button class="btn-icon btn-migrate-inline" data-article="${escapeHtml(articleSlug)}" data-url="${encodedUrl}" type="button" title="注册到 links.yml + 替换正文为 {% link %}">📝 注册</button>`}
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit-link') || e.target.classList.contains('btn-icon')) return;
      if (!isInline) editLink(articleSlug, link.key);
    });
    return card;
  }

  // ★ 把 inline URL 注册到 links.yml + 替换正文为 {% link key %}
  async function migrateInlineLink(articleSlug, inlineUrl) {
    // 自动建议 key:从 URL 提取有意义的部分
    const suggestedKey = suggestKeyFromUrl(inlineUrl, articleSlug);
    const userKey = prompt(
      `注册 inline 链接\n\n文章: ${articleSlug}\nURL: ${inlineUrl.substring(0, 60)}...\n\n请输入 key（英文/数字/下划线）:`,
      suggestedKey
    );
    if (!userKey) return;
    if (!/^[a-zA-Z0-9_-]+$/.test(userKey)) {
      toast('key 格式无效,只能英文/数字/下划线/连字符', 'error');
      return;
    }
    const label = prompt('显示名(label):', suggestedKey.replace(/_/g, ' ')) || userKey;
    const type = inlineUrl.includes('pan.baidu') ? 'baidu' :
                 inlineUrl.includes('github') ? 'github' : 'official';
    let extract_code = '';
    const m = inlineUrl.match(/[?&]pwd=([a-zA-Z0-9]+)/);
    if (m) extract_code = m[1];
    try {
      const resp = await fetch(`/api/posts/${encodeURIComponent(articleSlug)}/migrate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inlineUrl, key: userKey, label, type, extract_code
        })
      });
      // ★ 检查响应类型,避免 HTML 错误页被当成 JSON 解析
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        // 非 JSON 响应(404/500 HTML 错误页)
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status} (非 JSON 响应,可能 admin-server 没重启或端点不存在)`);
      }
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      toast(`✅ ${data.message}`, 'success', 5000);
      // 重新加载数据
      await loadLiveData();
    } catch (e) {
      toast('迁移失败:' + e.message, 'error');
    }
  }

  function suggestKeyFromUrl(url, slug) {
    // 从 URL 提取有意义部分
    // 例: https://pan.baidu.com/s/1lxHV...?pwd=4tff → claude-code-install-guide_4tff
    try {
      const u = new URL(url);
      const domain = u.hostname.replace(/^www\./, '').replace(/\.\w+$/, '');
      const pathPart = u.pathname.split('/').filter(Boolean).pop() || '';
      const clean = (domain + '_' + pathPart).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().substring(0, 30);
      return clean || (slug + '_link');
    } catch (e) {
      return slug + '_link';
    }
  }

  // 扫描文章正文,提取硬编码 URL(未走 {% link %} 的内联链接)
  async function loadInlineLinks(articleSlug) {
    try {
      const resp = await fetch(`/api/posts/${encodeURIComponent(articleSlug)}`);
      const data = await resp.json();
      if (!data.ok || !data.body) return [];
      // 匹配 http(s):// 开头直到空白或 < > 结束
      const urlRe = /https?:\/\/\S+?(?=[\s<>")\]]|$)/g;
      const urls = [...new Set((data.body.match(urlRe) || []))];
      return urls.map((url, idx) => ({
        key: `inline_${idx + 1}`,
        label: url.replace(/^https?:\/\//, '').substring(0, 30) + (url.length > 38 ? '…' : ''),
        url: url,
        type: url.includes('baidu') || url.includes('pan.baidu') ? 'baidu' :
              url.includes('github') ? 'github' : 'official',
        extract_code: extractBaiduCode(url) || '',
        status: 'inline',
        inline: true
      }));
    } catch (e) {
      return [];
    }
  }

  // 批量加载所有文章的内联 URL,缓存到 inlineLinksMap
  async function loadAllInlineLinks() {
    inlineLinksMap = {};
    await Promise.all(articlesList.map(async (p) => {
      inlineLinksMap[p.slug] = await loadInlineLinks(p.slug);
    }));
  }

  // 从百度网盘 URL 提取码 (pwd=xxxx 或 ?pwd=xxxx 或末尾路径)
  function extractBaiduCode(url) {
    const m = url.match(/[?&]pwd=([a-zA-Z0-9]+)/);
    if (m) return m[1];
    return '';
  }

  function renderLiveList() {
    const list = $('#live-list');
    if (!list) return;
    list.innerHTML = '';
    const tab = activeTab;

    // 更新 panel-live 标题 + 新增按钮文案
    const tabName = $('#live-tab-name');
    if (tabName) {
      tabName.textContent = tab === 'tools' ? '工具列表' : tab === 'links' ? '链接列表（按文章）' : '文章列表';
    }
    const btnNew = $('#btn-new');
    if (btnNew) {
      btnNew.textContent = tab === 'tools' ? '＋ 新增工具' : tab === 'links' ? '＋ 新增链接' : '＋ 新建文章';
    }

    if (tab === 'tools') {
      // 工具列表
      if (liveData.tools.length === 0) {
        list.innerHTML = '<div class="live-empty"><p>暂无工具,点「＋ 新增工具」添加</p></div>';
        return;
      }
      liveData.tools.forEach((tool) => {
        const card = document.createElement('div');
        card.className = 'live-item';
        card.dataset.name = tool.name;
        const tags = (tool.tags || []).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('');
        const cat = tool.category || '?';
        const icon = tool.icon || '📦';
        const tagline = tool.tagline || '';
        card.innerHTML = `
          <div class="live-item-head">
            <span class="live-item-icon">${escapeHtml(icon)}</span>
            <span class="live-item-name">${escapeHtml(tool.name)}</span>
          </div>
          <div class="live-item-tagline">${escapeHtml(tagline)}</div>
          <div class="live-item-meta">
            <span class="chip">${cat}</span>
            ${tags}
          </div>
          <div class="live-item-actions">
            <button class="btn btn-small btn-edit-item" data-name="${escapeHtml(tool.name)}" type="button">✏️ 编辑</button>
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-edit-item')) return;
          editTool(tool.name);
        });
        list.appendChild(card);
      });
      list.querySelectorAll('.btn-edit-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editTool(btn.dataset.name);
        });
      });
    } else if (tab === 'links') {
      // 链接列表 - 按文章分组(包括空文章,合并显示内联 URL)
      const articles = liveData.links || {};
      const allArticleSlugs = [...new Set([
        ...Object.keys(articles),
        ...articlesList.map(p => p.slug)
      ])];

      if (allArticleSlugs.length === 0) {
        list.innerHTML = '<div class="live-empty"><p>暂无文章 + 链接,先到「📄 文章」tab 创建文章</p></div>';
        return;
      }

      allArticleSlugs.forEach((articleSlug) => {
        const articleLinks = articles[articleSlug] || [];
        const inlineLinks = inlineLinksMap[articleSlug] || [];
        const totalCount = articleLinks.length + inlineLinks.length;
        const section = document.createElement('div');
        section.className = 'live-article-section';
        section.innerHTML = `
          <div class="live-article-head">
            <span class="article-icon">📄</span>
            <span class="article-slug">${escapeHtml(articleSlug)}</span>
            <span class="article-count">${totalCount} 链接${inlineLinks.length ? ` (含 ${inlineLinks.length} 内联)` : ''}</span>
          </div>
        `;
        const grid = document.createElement('div');
        grid.className = 'live-list live-list-nested';

        // 渲染已注册的链接(links.yml 里的)
        articleLinks.forEach((link) => {
          if (!link || !link.key) return;
          const card = renderLinkCard(link, articleSlug);
          grid.appendChild(card);
        });

        // 渲染内联 URL(文章正文里硬编码的)
        inlineLinks.forEach((link) => {
          if (!link || !link.url) return;
          const card = renderLinkCard(link, articleSlug, true);
          grid.appendChild(card);
        });

        if (articleLinks.length === 0 && inlineLinks.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'live-empty live-empty-inline';
          empty.innerHTML = `<p>暂无链接,点顶部「＋ 新增链接」添加 (article_slug 已预填为 <code>${escapeHtml(articleSlug)}</code>)</p>`;
          grid.appendChild(empty);
        }

        section.appendChild(grid);
        list.appendChild(section);
      });
      list.querySelectorAll('.btn-edit-link').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editLink(btn.dataset.article, btn.dataset.key);
        });
      });
      // ★ 内联 URL 注册按钮
      list.querySelectorAll('.btn-migrate-inline').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = decodeURIComponent(btn.dataset.url);
          migrateInlineLink(btn.dataset.article, url);
        });
      });
    } else if (tab === 'articles') {
      // 文章列表
      if (articlesList.length === 0) {
        list.innerHTML = '<div class="live-empty"><p>暂无文章,点「＋ 新建文章」开始</p></div>';
        return;
      }
      articlesList.forEach((post) => {
        const card = document.createElement('div');
        card.className = 'article-item';
        const tagsHtml = (post.tags || []).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join('');
        card.innerHTML = `
          <div class="article-item-head">
            <span class="article-item-title">${escapeHtml(post.title || post.slug)}</span>
          </div>
          <div class="article-item-meta">${escapeHtml(post.slug)} · ${escapeHtml(post.date || '')}</div>
          <div class="article-item-excerpt">${escapeHtml(post.excerpt || '')}</div>
          <div class="article-item-tags">${tagsHtml}</div>
        `;
        card.addEventListener('click', () => loadArticleForEdit(post.slug));
        list.appendChild(card);
      });
    }
  }

  function editTool(name) {
    const tool = liveData.tools.find(t => t.name === name);
    if (!tool) return;
    state.tools = {
      name: tool.name || '',
      category: tool.category || 'dev',
      icon: tool.icon || '',
      tagline: tool.tagline || '',
      reason: tool.reason || '',
      tags: (tool.tags || []).join(', '),
      links: (tool.links || []).map(l => ({ key: l.key || '', type: l.type || '' }))
    };
    editingKey = name;
    syncFormToDOM();
    renderOutput();
    updateOutputName();
    toast(`✏️ 编辑: ${name}（保存后会更新现有条目）`);
    document.querySelector('.panels')?.scrollIntoView({ behavior: 'smooth' });
  }

  function editLink(articleSlug, key) {
    const articleLinks = liveData.links[articleSlug];
    if (!articleLinks) return;
    const link = articleLinks.find(l => l && l.key === key);
    if (!link) return;
    state.links = {
      article_slug: articleSlug,
      key: key,
      label: link.label || '',
      url: link.url || '',
      type: link.type || 'official',
      extract_code: link.extract_code || '',
      note: link.note || '',
      status: link.status || 'active',
      added: (link.added || '').slice(0, 10)
    };
    editingKey = `${articleSlug}:${key}`;
    syncFormToDOM();
    renderOutput();
    updateOutputName();
    toast(`✏️ 编辑: ${articleSlug} / ${key}`);
    document.querySelector('.panels')?.scrollIntoView({ behavior: 'smooth' });
  }

  function newItem() {
    editingKey = null;
    state[activeTab] = clone(activeTab === 'tools' ? emptyToolsForm : emptyLinksForm);
    syncFormToDOM();
    renderOutput();
    updateOutputName();
    toast('＋ 新增模式（保存会追加新条目）');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // -----------------------------------------------------------
  // 启动
  // -----------------------------------------------------------
  // -----------------------------------------------------------
  // Articles Tab — 文件管理（列表 / 编辑 / 新建 / 删除）
  // -----------------------------------------------------------
  let articlesList = [];
  let editingArticleSlug = null;
  const emptyArticle = { slug: '', title: '', date: todayISO(), tags: '', categories: '', description: '', content: '' };

  async function loadArticlesList() {
    try {
      const resp = await fetch('/api/posts');
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);
      articlesList = data.data || [];
      renderLiveList(); // 刷新顶部 panel-live 区
    } catch (e) {
      const empty = $('#live-empty');
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = `<p>⚠️ 加载文章失败：${escapeHtml(e.message)}<br>需要 <code>npm run admin</code> 启动后端</p>`;
      }
      if (!e.message.includes('Failed to fetch')) toast('加载失败：' + e.message, 'error');
    }
  }

  function renderArticlesList() {
    // 文章列表已搬到顶部 panel-live 的 live-list 区(通过 renderLiveList 处理)
    // 这个函数现在是个 stub,留作兼容
    renderLiveList();
  }

  async function loadArticleForEdit(slug) {
    try {
      const resp = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);
      editingArticleSlug = slug;
      // 用表单字段填文章数据
      const aForm = {
        slug: data.slug,
        title: data.data.title || '',
        date: (data.data.date || '').slice(0, 10),
        tags: Array.isArray(data.data.tags) ? data.data.tags.join(', ') : (data.data.tags || ''),
        categories: Array.isArray(data.data.categories) ? data.data.categories.join(', ') : (data.data.categories || ''),
        description: data.data.description || '',
        content: data.body || ''
      };
      // 把数据塞进通用 form state 用 tools/links 同样的方式渲染 — 借用 tools 表单做文章编辑
      // 简化做法:复用 .data-field 选择器 + state.articles
      windowStateForArticles(aForm);
      toast(`✏️ 编辑文章：${slug}`);
      document.querySelector('.panels')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      toast('加载失败：' + e.message, 'error');
    }
  }

  // 复用通用 state + form 渲染机制
  function windowStateForArticles(data) {
    state.articles = { ...data };
    syncArticleFormToDOM();
  }

  function syncArticleFormToDOM() {
    const fields = ['slug', 'title', 'date', 'tags', 'categories', 'description', 'content'];
    fields.forEach((f) => {
      const el = document.querySelector(`[data-pane="articles"] [data-field="${f}"]`);
      if (el) el.value = state.articles[f] || '';
    });
  }

  function bindArticlesFields() {
    const fields = ['slug', 'title', 'date', 'tags', 'categories', 'description', 'content'];
    fields.forEach((f) => {
      const el = document.querySelector(`[data-pane="articles"] [data-field="${f}"]`);
      if (!el) return;
      el.addEventListener('input', () => {
        state.articles[f] = el.value;
      });
    });
  }

  function newArticle() {
    editingArticleSlug = null;
    state.articles = { ...emptyArticle };
    syncArticleFormToDOM();
    toast('＋ 新建文章模式（保存会写入新 .md 文件）');
  }

  function cancelArticleEdit() {
    editingArticleSlug = null;
    state.articles = { ...emptyArticle };
    syncArticleFormToDOM();
  }

  async function saveArticle() {
    const a = state.articles;
    if (!a.slug) { toast('slug 不能为空', 'error'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(a.slug)) {
      toast('slug 只能包含英文、数字、下划线、连字符', 'error');
      return;
    }
    const targetSlug = a.slug;
    const btn = $('#btn-article-save');
    btn.disabled = true;
    btn.textContent = '⏳ 保存中...';
    try {
      const resp = await fetch(`/api/posts/${encodeURIComponent(targetSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            title: a.title || targetSlug,
            date: a.date || todayISO(),
            tags: a.tags ? a.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
            categories: a.categories ? a.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
            description: a.description || ''
          },
          content: a.content || ''
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      toast(`✅ ${data.filename} 已保存 (${data.message.split('(')[1] || ''}`, 'success', 4000);
      editingArticleSlug = targetSlug;
      loadArticlesList();
    } catch (e) {
      if (e.message.includes('Failed to fetch')) {
        toast('❌ 后端未启动。请先运行 `npm run admin`', 'error');
      } else {
        toast('❌ 保存失败：' + e.message, 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 保存到文件';
    }
  }

  async function deleteArticle() {
    if (!editingArticleSlug) {
      toast('当前没有正在编辑的文章', 'error');
      return;
    }
    if (!confirm(`确认删除 ${editingArticleSlug}.md?\n(会自动备份为 .bak-deleted)`)) return;
    try {
      const resp = await fetch(`/api/posts/${encodeURIComponent(editingArticleSlug)}`, { method: 'DELETE' });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error);
      toast(`🗑 ${data.message}`, 'success');
      editingArticleSlug = null;
      state.articles = { ...emptyArticle };
      syncArticleFormToDOM();
      loadArticlesList();
    } catch (e) {
      toast('❌ 删除失败：' + e.message, 'error');
    }
  }

  function init() {
    loadDraft();
    injectDatalist();
    bindTabs();
    bindToolsFields();
    bindLinksFields();
    bindAddToolLink();
    bindArticlesFields();
    syncFormToDOM();
    syncArticleFormToDOM();
    renderOutput();
    updateOutputName();
    loadLiveData();
    loadArticlesList();
    // 默认给文章 tab 一个空表单
    state.articles = { ...emptyArticle };
    syncArticleFormToDOM();

    $('#btn-copy').addEventListener('click', copyYAML);
    $('#btn-download').addEventListener('click', downloadYAML);
    $('#btn-save').addEventListener('click', saveDraft);
    $('#btn-save-server').addEventListener('click', saveToServer);
    $('#btn-clear').addEventListener('click', clearDraft);
    $('#btn-reload-live')?.addEventListener('click', loadLiveData);
    $('#btn-new')?.addEventListener('click', newItem);
    $('#btn-articles-reload')?.addEventListener('click', loadArticlesList);
    $('#btn-article-new')?.addEventListener('click', newArticle);
    $('#btn-article-cancel')?.addEventListener('click', cancelArticleEdit);
    $('#btn-article-save')?.addEventListener('click', saveArticle);
    $('#btn-article-delete')?.addEventListener('click', deleteArticle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
