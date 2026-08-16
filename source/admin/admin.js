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
    key: '',
    label: '',
    url: '',
    type: 'baidu',
    extract_code: '',
    note: '',
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
  const formStatus = $('#form-status');
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
    const fields = ['key', 'label', 'url', 'type', 'extract_code', 'note', 'added'];
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
    lines.push('# 链接条目（单条，可粘贴到 source/_data/links.yml）');
    lines.push('# ============================================ ');
    const key = l.key || 'my_link_key';
    lines.push(yamlQuote(key) + ':');
    lines.push('  label: ' + yamlQuote(yamlEscape(l.label)));
    lines.push('  url: ' + yamlQuote(yamlEscape(l.url)));
    lines.push('  type: ' + yamlQuote(yamlEscape(l.type || 'official')));
    if (l.type === 'baidu' && l.extract_code) {
      lines.push('  extract_code: ' + yamlQuote(yamlEscape(l.extract_code)));
    }
    if (l.note) {
      lines.push('  note: ' + yamlQuote(yamlEscape(l.note)));
    }
    lines.push('  added: ' + yamlQuote(yamlEscape(l.added || todayISO())));
    return lines.join('\n');
  }

  function renderOutput() {
    const text = activeTab === 'tools' ? buildToolsYAML() : buildLinksYAML();
    yamlOutput.value = text;
  }

  // -----------------------------------------------------------
  // localStorage 草稿
  // -----------------------------------------------------------
  let saveStatusTimer = null;
  function markSaved() {
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    formStatus.textContent = 'draft saved';
    saveStatusTimer = setTimeout(() => {
      formStatus.textContent = 'draft saved';
    }, 1500);
  }

  function saveDraft() {
    const payload = {
      form: clone(state[activeTab]),
      tab: activeTab,
      savedAt: new Date().toISOString()
    };
    const key = activeTab === 'tools' ? STORAGE_KEY_TOOLS : STORAGE_KEY_LINKS;
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      markSaved();
      toast('💾 草稿已保存到 localStorage');
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
    const linksFields = ['key', 'label', 'url', 'type', 'extract_code', 'note', 'added'];
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
    const endpoint = tab === 'tools' ? '/api/tools' : '/api/links';

    const btn = $('#btn-save-server');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ 保存中...';

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
      toast('✅ ' + data.message, 'success');

      // 询问是否触发 rebuild
      if (confirm('已写入文件。是否立即触发 hexo generate？（选「取消」可稍后手动 `npm run build`）')) {
        btn.textContent = '⏳ rebuild...';
        const r = await fetch('/api/rebuild', { method: 'POST' });
        const rd = await r.json();
        if (r.ok && rd.ok) {
          toast('✅ rebuild 成功,刷新 /tools/ 查看效果', 'success');
        } else {
          toast('rebuild 失败：' + (rd.error || ''), 'error');
        }
      }
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

    $('#btn-copy').addEventListener('click', copyYAML);
    $('#btn-download').addEventListener('click', downloadYAML);
    $('#btn-save').addEventListener('click', saveDraft);
    $('#btn-save-server').addEventListener('click', saveToServer);
    $('#btn-clear').addEventListener('click', clearDraft);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
