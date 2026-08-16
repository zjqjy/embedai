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
      '# ============================================\n# 嵌入式工具列表 (Tools Registry)\n# 由 admin-server 自动写入,可手工调整\n# ============================================',
      dump
    );
    res.json({
      ok: true,
      file: 'tools.yml',
      count: existing.length,
      bytes,
      stats,
      message: `已 merge: 新增 ${stats.added} 条,更新 ${stats.updated} 条 (共 ${existing.length} 条)`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/links', (req, res) => {
  try {
    const yamlText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.body || '');
    if (!yamlText.trim()) {
      return res.status(400).json({ ok: false, error: 'YAML 内容为空' });
    }
    const newItems = yaml.load(yamlText);
    if (!newItems || typeof newItems !== 'object' || Array.isArray(newItems)) {
      return res.status(400).json({ ok: false, error: 'links 数据必须是对象' });
    }
    // merge 模式:按 key 匹配
    let existing = {};
    try {
      const raw = fs.readFileSync(LINKS_YML, 'utf8');
      existing = yaml.load(raw) || {};
      if (typeof existing !== 'object' || Array.isArray(existing)) existing = {};
    } catch (e) { existing = {}; }
    const stats = { added: 0, updated: 0 };
    Object.entries(newItems).forEach(([key, value]) => {
      if (existing[key]) stats.updated++;
      else stats.added++;
      existing[key] = value;
    });
    const dump = yaml.dump(existing, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    });
    const bytes = writeYmlWithHeader(
      LINKS_YML,
      '# ============================================\n# 链接中央注册表 (Link Registry)\n# 由 admin-server 自动写入,可手工调整\n# ============================================',
      dump
    );
    res.json({
      ok: true,
      file: 'links.yml',
      count: Object.keys(existing).length,
      bytes,
      stats,
      message: `已 merge: 新增 ${stats.added} 条,更新 ${stats.updated} 条 (共 ${Object.keys(existing).length} 条)`
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