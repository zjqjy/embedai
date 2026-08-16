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
    links: clone(emptyLinksForm)
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
        renderLiveList(); // tab 切换时刷新当前数据列表
      });
    });
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
    const wrap = document.createElement('div');
    wrap.className = 'link-row';

    // key select（带 data-list 联想 + 自由输入）
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'input';
    keyInput.placeholder = 'link key';
    keyInput.value = link.key || '';
    keyInput.setAttribute('list', 'link-keys-datalist');
    keyInput.addEventListener('input', () => {
      state.tools.links[idx].key = keyInput.value;
      renderOutput();
    });

    // type text
    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'input';
    typeInput.placeholder = '显示名 / 类型';
    typeInput.value = link.type || '';
    typeInput.addEventListener('input', () => {
      state.tools.links[idx].type = typeInput.value;
      renderOutput();
    });

    // 删除按钮
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

    wrap.appendChild(keyInput);
    wrap.appendChild(typeInput);
    wrap.appendChild(removeBtn);
    return wrap;
  }

  function bindAddToolLink() {
    $('#t-add-link').addEventListener('click', () => {
      state.tools.links.push({ key: '', type: '' });
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
      });
      el.addEventListener('change', () => {
        state.tools[f] = el.value;
        renderOutput();
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
        if (!l.key && !l.type) return;
        lines.push('    - key: ' + yamlQuote(yamlEscape(l.key)));
        lines.push('      type: ' + yamlQuote(yamlEscape(l.type)));
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
    list.innerHTML = '<div class="live-empty"><p>加载中...</p></div>';

    try {
      const [toolsResp, linksResp] = await Promise.all([
        fetch('/api/tools'),
        fetch('/api/links')
      ]);
      const toolsData = await toolsResp.json();
      const linksData = await linksResp.json();
      if (!toolsData.ok || !linksData.ok) {
        throw new Error(toolsData.error || linksData.error || '加载失败');
      }
      liveData.tools = toolsData.data || [];
      liveData.links = linksData.data || {};
      empty.hidden = true;
      renderLiveList();
      const articleCount = Object.keys(liveData.links).length;
      const linkCount = Object.values(liveData.links).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      $('#live-source').textContent = `${liveData.tools.length} 工具 / ${linkCount} 链接 / ${articleCount} 文章`;
      toast(`✅ 已加载 ${liveData.tools.length} 工具 + ${linkCount} 链接 (跨 ${articleCount} 文章)`);
    } catch (e) {
      empty.hidden = false;
      list.innerHTML = '';
      $('#live-source').textContent = '未连接';
      if (!e.message.includes('Failed to fetch')) {
        toast('加载失败：' + e.message, 'error');
      }
    }
  }

  function renderLiveList() {
    const list = $('#live-list');
    list.innerHTML = '';
    const tab = activeTab;
    if (tab === 'tools') {
      if (liveData.tools.length === 0) {
        list.innerHTML = '<div class="live-empty"><p>暂无工具,点「＋ 新增」添加</p></div>';
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
    } else {
      // 链接 tab - 按文章分组渲染
      const articles = liveData.links || {};
      const articleSlugs = Object.keys(articles);
      if (articleSlugs.length === 0) {
        list.innerHTML = '<div class="live-empty"><p>暂无链接,点「＋ 新增」添加</p></div>';
        return;
      }
      articleSlugs.forEach((articleSlug) => {
        const articleLinks = articles[articleSlug] || [];
        // 文章 section header
        const section = document.createElement('div');
        section.className = 'live-article-section';
        section.innerHTML = `
          <div class="live-article-head">
            <span class="article-icon">📄</span>
            <span class="article-slug">${escapeHtml(articleSlug)}</span>
            <span class="article-count">${articleLinks.length} 链接</span>
          </div>
        `;
        const grid = document.createElement('div');
        grid.className = 'live-list live-list-nested';
        articleLinks.forEach((link) => {
          if (!link || !link.key) return;
          const status = link.status || 'active';
          const statusIcon = status === 'broken' ? '❌' : status === 'warning' ? '⚠️' : '✓';
          const card = document.createElement('div');
          card.className = 'live-item live-item-link status-' + status;
          card.dataset.article = articleSlug;
          card.dataset.key = link.key;
          card.innerHTML = `
            <div class="live-item-head">
              <span class="live-item-name">${escapeHtml(link.label || link.key)}</span>
              <span class="status-badge status-${status}">${statusIcon} ${status}</span>
            </div>
            <div class="live-item-tagline">${escapeHtml(link.url || '')}</div>
            <div class="live-item-meta">
              <span class="chip">${escapeHtml(link.type || '?')}</span>
              ${link.extract_code ? `<span class="chip">码: ${escapeHtml(link.extract_code)}</span>` : ''}
            </div>
            <div class="live-item-actions">
              <button class="btn btn-small btn-edit-link" data-article="${escapeHtml(articleSlug)}" data-key="${escapeHtml(link.key)}" type="button">✏️ 编辑</button>
            </div>
          `;
          card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit-link')) return;
            editLink(articleSlug, link.key);
          });
          grid.appendChild(card);
        });
        section.appendChild(grid);
        list.appendChild(section);
      });
      list.querySelectorAll('.btn-edit-link').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editLink(btn.dataset.article, btn.dataset.key);
        });
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
  function init() {
    loadDraft();
    injectDatalist();
    bindTabs();
    bindToolsFields();
    bindLinksFields();
    bindAddToolLink();
    syncFormToDOM();
    renderOutput();
    updateOutputName();
    loadLiveData();

    $('#btn-copy').addEventListener('click', copyYAML);
    $('#btn-download').addEventListener('click', downloadYAML);
    $('#btn-save').addEventListener('click', saveDraft);
    $('#btn-save-server').addEventListener('click', saveToServer);
    $('#btn-clear').addEventListener('click', clearDraft);
    $('#btn-reload-live')?.addEventListener('click', loadLiveData);
    $('#btn-new')?.addEventListener('click', newItem);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
