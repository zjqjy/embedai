// ============================================
// admin-server.js — 本地 Node.js 后端
// ============================================
// 启动: npm run admin
// 默认端口: 3000 (可改 PORT 环境变量)
//
// 功能:
//   - GET  /api/tools          读取 source/_data/tools.yml
//   - GET  /api/links          读取 source/_data/links.yml
//   - POST /api/tools          写入 tools.yml (body 是 YAML 文本)
//   - POST /api/links          写入 links.yml (body 是 YAML 文本)
//   - POST /api/rebuild        运行 hexo generate
//   - GET  /admin/*            静态托管 source/admin/
//
// ⚠️ 本地工具,不部署到生产。
// ============================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'source/_data');
const TOOLS_YML = path.join(DATA_DIR, 'tools.yml');
const LINKS_YML = path.join(DATA_DIR, 'links.yml');
const POSTS_DIR = path.join(ROOT, 'source/_posts');

// 简单的 frontmatter 解析(只支持标准 YAML 风格,不依赖库)
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { data: {}, body: raw };
  const fmBlock = raw.substring(4, end); // 去掉前导 ---\n
  const body = raw.substring(end + 4).replace(/^\n/, '');
  // 极简 YAML 解析: 只支持 key: value 和 key: [a, b] 列表
  const data = {};
  fmBlock.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  });
  return { data, body };
}

function buildFrontmatter(data) {
  const lines = ['---'];
  Object.entries(data).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((s) => `'${s}'`).join(', ')}]`);
    } else if (typeof v === 'string') {
      // 如果包含特殊字符,用引号包裹
      if (/[:#\[\]&*?|<>=!%@`]/.test(v) || v.includes(': ')) {
        lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${k}: ${v}`);
      }
    } else {
      lines.push(`${k}: ${v}`);
    }
  });
  lines.push('---', '');
  return lines.join('\n');
}

// ---------- middleware ----------
// 用 express.raw + 手动 utf-8 解码（express.text 的自动 charset 检测在 Windows 下会乱码）
app.use(express.raw({ type: ['text/yaml', 'text/plain', 'application/x-yaml'], limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// 简单请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.url}`);
  next();
});

// ---------- 静态托管 admin 页 ----------
app.use('/admin', express.static(path.join(ROOT, 'source/admin')));

// ---------- 健康检查 ----------
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'admin-server',
    version: '1.0.0',
    cwd: ROOT,
    dataDir: DATA_DIR
  });
});

// ---------- GET: 读取数据 ----------
app.get('/api/tools', (_req, res) => {
  try {
    const raw = fs.readFileSync(TOOLS_YML, 'utf8');
    const data = yaml.load(raw);
    res.json({ ok: true, data, raw });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/links', (_req, res) => {
  try {
    const raw = fs.readFileSync(LINKS_YML, 'utf8');
    const data = yaml.load(raw);
    res.json({ ok: true, data, raw });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- POST: 写入数据 ----------
function backup(filePath) {
  try {
    fs.copyFileSync(filePath, filePath + '.bak');
  } catch (e) {
    // .bak 已存在或源文件不存在,不影响主流程
  }
}

function writeYmlWithHeader(filePath, headerComment, ymlBody) {
  // 写文件:头部注释 + 空行 + yml
  const content = headerComment + '\n' + ymlBody;
  // 备份
  if (fs.existsSync(filePath)) backup(filePath);
  // 写入
  fs.writeFileSync(filePath, content, 'utf8');
  return content.length;
}

app.post('/api/tools', (req, res) => {
  try {
    // body 是 Buffer(raw) — 手动解码为 utf-8 字符串
    const yamlText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.body || '');
    if (!yamlText.trim()) {
      return res.status(400).json({ ok: false, error: 'YAML 内容为空' });
    }
    const newItems = yaml.load(yamlText);
    if (!Array.isArray(newItems)) {
      return res.status(400).json({ ok: false, error: 'tools 数据必须是数组' });
    }
    // merge 模式:按 name 匹配,存在的更新,不存在的新增
    let existing = [];
    try {
      const raw = fs.readFileSync(TOOLS_YML, 'utf8');
      existing = yaml.load(raw) || [];
      if (!Array.isArray(existing)) existing = [];
    } catch (e) { existing = []; }
    const stats = { added: 0, updated: 0 };
    newItems.forEach((item) => {
      const idx = existing.findIndex((e) => e && e.name === item.name);
      if (idx >= 0) {
        existing[idx] = item;
        stats.updated++;
      } else {
        existing.push(item);
        stats.added++;
      }
    });
    const dump = yaml.dump(existing, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    });
    const bytes = writeYmlWithHeader(
      TOOLS_YML,
      '# ============================================\n# 嵌入式工具列表 (Tools Registry)\n# 由 admin-server 自动写入,可手工调整\n# 工具的链接完整数据会自动同步到 source/_data/links.yml 的 _shared section\n# ============================================',
      dump
    );
    // ★ 同步工具链接到 links.yml 的 _shared section(让 helper 和 /tools/ 页面共享数据)
    const linkStats = syncLinksFromTools(existing);
    res.json({
      ok: true,
      file: 'tools.yml',
      count: existing.length,
      bytes,
      stats,
      linkStats,
      message: `已 merge: 新增 ${stats.added} 条,更新 ${stats.updated} 条 (共 ${existing.length} 条) | links.yml 同步 ${linkStats.added}+${linkStats.updated}~`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 从 tools 数据同步链接到 links.yml 的 _shared section
function syncLinksFromTools(tools) {
  // 读取现有 links.yml
  let links = {};
  try {
    const raw = fs.readFileSync(LINKS_YML, 'utf8');
    links = yaml.load(raw) || {};
    if (typeof links !== 'object' || Array.isArray(links)) links = {};
  } catch (e) { links = {}; }
  if (!Array.isArray(links._shared)) links._shared = [];
  const stats = { added: 0, updated: 0 };
  tools.forEach((tool) => {
    if (!tool || !Array.isArray(tool.links)) return;
    tool.links.forEach((link) => {
      if (!link || !link.key) return;
      const idx = links._shared.findIndex(l => l && l.key === link.key);
      // 组装完整 link 数据(从 tools 行内取,缺失字段从已有 links.yml 找)
      const merged = {
        key: link.key,
        label: link.label || '',
        url: link.url || '',
        type: link.type || 'official',
        extract_code: link.extract_code || '',
        status: link.status || 'active',
        added: link.added || new Date().toISOString().slice(0, 10)
      };
      if (idx >= 0) {
        // 只在 tools 提供了完整数据时才覆盖,否则保留 links.yml 原有
        const old = links._shared[idx];
        links._shared[idx] = {
          ...old,
          ...merged,
          url: link.url || old.url,
          label: link.label || old.label
        };
        stats.updated++;
      } else {
        links._shared.push(merged);
        stats.added++;
      }
    });
  });
  // 写回(只在有变更时写)
  if (stats.added > 0 || stats.updated > 0) {
    const dump = yaml.dump(links, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    });
    writeYmlWithHeader(
      LINKS_YML,
      '# ============================================\n# 链接中央注册表 (按文章嵌套)\n# 由 admin-server 自动写入,可手工调整\n# _shared:工具页用到的共享链接(由 admin 同步)\n# ============================================',
      dump
    );
  }
  return stats;
}

app.post('/api/links', (req, res) => {
  try {
    const yamlText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.body || '');
    if (!yamlText.trim()) {
      return res.status(400).json({ ok: false, error: 'YAML 内容为空' });
    }
    const newData = yaml.load(yamlText);
    if (!newData || typeof newData !== 'object' || Array.isArray(newData)) {
      return res.status(400).json({ ok: false, error: 'links 数据必须是对象 (按文章嵌套)' });
    }
    // 读取现有嵌套结构
    let existing = {};
    try {
      const raw = fs.readFileSync(LINKS_YML, 'utf8');
      existing = yaml.load(raw) || {};
      if (typeof existing !== 'object' || Array.isArray(existing)) existing = {};
    } catch (e) { existing = {}; }
    // merge 模式:按 article_slug + key 复合键
    const stats = { added: 0, updated: 0, articles: 0 };
    Object.entries(newData).forEach(([articleSlug, articleLinks]) => {
      if (!Array.isArray(articleLinks)) return;
      stats.articles++;
      if (!Array.isArray(existing[articleSlug])) existing[articleSlug] = [];
      articleLinks.forEach((newLink) => {
        if (!newLink || !newLink.key) return;
        const idx = existing[articleSlug].findIndex((l) => l && l.key === newLink.key);
        if (idx >= 0) {
          existing[articleSlug][idx] = newLink;
          stats.updated++;
        } else {
          existing[articleSlug].push(newLink);
          stats.added++;
        }
      });
    });
    const dump = yaml.dump(existing, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    });
    const totalLinks = Object.values(existing).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    const bytes = writeYmlWithHeader(
      LINKS_YML,
      '# ============================================\n# 链接中央注册表 (按文章嵌套)\n# 由 admin-server 自动写入,可手工调整\n# ============================================',
      dump
    );
    res.json({
      ok: true,
      file: 'links.yml',
      count: totalLinks,
      bytes,
      stats,
      message: `已 merge: 新增 ${stats.added} 条,更新 ${stats.updated} 条 (共 ${totalLinks} 条,跨 ${stats.articles} 文章)`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- POST: rebuild ----------
app.post('/api/rebuild', (_req, res) => {
  console.log('  → 触发 hexo generate...');
  exec('npx hexo generate', { cwd: ROOT, timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('  ✗ rebuild 失败:', stderr);
      return res.status(500).json({ ok: false, error: 'rebuild 失败', detail: stderr });
    }
    console.log('  ✓ rebuild 成功');
    res.json({ ok: true, message: 'rebuild 成功', output: stdout });
  });
});

// ---------- 文章管理 ----------
// 列出所有文章 (从 frontmatter 提取 title/date/tags)
app.get('/api/posts', (_req, res) => {
  try {
    if (!fs.existsSync(POSTS_DIR)) {
      return res.json({ ok: true, data: [] });
    }
    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
    const posts = files.map((filename) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
      const { data } = parseFrontmatter(raw);
      return {
        slug: filename.replace(/\.md$/, ''),
        filename,
        title: data.title || filename,
        date: data.date || '',
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
        categories: Array.isArray(data.categories) ? data.categories : (data.categories ? [data.categories] : []),
        excerpt: raw.split(/\r?\n/).slice(0, 5).join(' ').substring(0, 100)
      };
    });
    posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json({ ok: true, data: posts });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 读取单篇文章
app.get('/api/posts/:slug', (req, res) => {
  try {
    const slug = req.params.slug.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: '文章不存在' });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    res.json({ ok: true, slug, data, body, filename: `${slug}.md` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 创建或更新文章
// body: { slug, data: {title, date, tags, categories}, content: string }
app.post('/api/posts/:slug', (req, res) => {
  try {
    const slug = req.params.slug.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!slug) return res.status(400).json({ ok: false, error: 'slug 无效' });
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    const incoming = req.body || {};
    const front = incoming.data || {};
    const content = incoming.content || '';
    // 默认值
    if (!front.title) front.title = slug;
    if (!front.date) front.date = new Date().toISOString().slice(0, 10);
    // 备份
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, filePath + '.bak');
    }
    const fileContent = buildFrontmatter(front) + '\n' + content + '\n';
    fs.writeFileSync(filePath, fileContent, 'utf8');
    res.json({
      ok: true,
      slug,
      filename: `${slug}.md`,
      message: `已保存 ${slug}.md (${fileContent.length} 字节)`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 删除文章
app.delete('/api/posts/:slug', (req, res) => {
  try {
    const slug = req.params.slug.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: '文章不存在' });
    }
    // 备份
    fs.copyFileSync(filePath, filePath + '.bak-deleted');
    fs.unlinkSync(filePath);
    res.json({ ok: true, slug, message: `已删除 ${slug}.md (备份到 .bak-deleted)` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 把文章正文里的 inline URL 替换为 {% link "key" %},同时在 links.yml 注册新条目
// body: { inlineUrl, key, label, type, extract_code?, note? }
app.post('/api/posts/:slug/migrate-link', (req, res) => {
  try {
    const slug = req.params.slug.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(POSTS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: '文章不存在' });
    }
    const body = req.body || {};
    const inlineUrl = body.inlineUrl;
    const key = (body.key || '').trim();
    const label = (body.label || key).trim();
    const type = body.type || 'official';
    const extract_code = body.extract_code || '';
    const note = body.note || '';
    if (!inlineUrl) return res.status(400).json({ ok: false, error: '缺少 inlineUrl' });
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      return res.status(400).json({ ok: false, error: 'key 只能包含英文/数字/下划线/连字符' });
    }

    // 1. 读 .md 正文,替换 inlineUrl 为 {% link key %}
    let raw = fs.readFileSync(filePath, 'utf8');
    const before = raw;
    // 多种 URL 出现形式都替换:
    //   <https://...>    → <{% link key %}>
    //   https://...      → {% link key %}
    //   [text](url)      → [text]({% link key %})
    const escInlineUrl = inlineUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re1 = new RegExp('<' + escInlineUrl + '>', 'g');
    raw = raw.replace(re1, `{% link "${key}" %}`);
    const re2 = new RegExp('\\(' + escInlineUrl + '\\)', 'g');
    raw = raw.replace(re2, `({% link "${key}" %})`); // 暂时保留括号避免破坏 markdown link 语法
    // 简单 url 替换(无 <> 包裹的裸 url)
    raw = raw.split(inlineUrl).join(`{% link "${key}" %}`);
    // 上一步会把 markdown [text](url) 里的 url 也替换,但留下括号
    // 把 ([text]({% link "key" %}) 这种格式回滚成 [text]({% link "key" %})
    raw = raw.replace(/\(\[([^\]]+)\]\(\{% link "([^"]+)" %\}\)/g, '[$1]({% link "$2" %})');
    if (raw === before) {
      return res.status(400).json({ ok: false, error: '正文中未找到该 URL,无法替换' });
    }
    // 备份
    fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, raw, 'utf8');

    // 2. 在 links.yml 注册新条目(若 key 不存在)
    let links = {};
    try {
      const raw2 = fs.readFileSync(LINKS_YML, 'utf8');
      links = yaml.load(raw2) || {};
      if (typeof links !== 'object' || Array.isArray(links)) links = {};
    } catch (e) { links = {}; }
    if (!Array.isArray(links[slug])) links[slug] = [];
    const idx = links[slug].findIndex(l => l && l.key === key);
    const newEntry = {
      key,
      label,
      url: inlineUrl,
      type,
      status: 'active',
      added: new Date().toISOString().slice(0, 10)
    };
    if (extract_code) newEntry.extract_code = extract_code;
    if (note) newEntry.note = note;
    if (idx >= 0) {
      // 已有同 key → 合并(保留原 note,更新 url 等)
      links[slug][idx] = { ...links[slug][idx], ...newEntry };
    } else {
      links[slug].push(newEntry);
    }
    const dump = yaml.dump(links, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    });
    const bytes = writeYmlWithHeader(
      LINKS_YML,
      '# ============================================\n# 链接中央注册表 (按文章嵌套)\n# 由 admin-server 自动写入,可手工调整\n# ============================================',
      dump
    );
    res.json({
      ok: true,
      file: `${slug}.md`,
      key,
      bytes,
      message: `已迁移:正文 URL → {% link "${key}" %},links.yml 注册成功`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- 启动 ----------
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🛠  admin server 已启动');
  console.log('========================================');
  console.log(`📍 管理界面:  http://localhost:${PORT}/admin/`);
  console.log(`📡 API 文档:   http://localhost:${PORT}/api/health`);
  console.log('----------------------------------------');
  console.log('  GET  /api/tools         读取 tools.yml');
  console.log('  GET  /api/links         读取 links.yml');
  console.log('  POST /api/tools         写入 tools.yml (body: YAML 文本)');
  console.log('  POST /api/links         写入 links.yml (body: YAML 文本)');
  console.log('  POST /api/rebuild       运行 hexo generate');
  console.log('========================================\n');
});