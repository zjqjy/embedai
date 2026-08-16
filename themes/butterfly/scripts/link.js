/**
 * link.js
 * 文章链接 helper —— 编译时查 source/_data/links.yml
 *
 * 用法：
 *   {% link "claude_oneclick" %}
 *   {% link "key" "自定义锚文本" %}
 *   {% link "key" "自定义文本" "false" %}  ← 不显示提取码
 *
 * links.yml 结构（按文章嵌套）：
 *   claude-code-install-guide:
 *     - key: claude_oneclick
 *       url: ...
 *       extract_code: 86kq
 *       status: active  # active / warning / broken
 *     ...
 *   claude-code-oneclick-install:
 *     - key: claude_oneclick  # 复用同一 key,helper 跨文章找第一个
 *       ...
 *
 * 改链接一处全站更新。同一 key 出现在多文章时,helper 找第一个匹配。
 *
 * 注意:在 tag 渲染上下文中 `hexo.site.data` 不可访问,
 * 所以直接读取并解析 `source/_data/links.yml` 文件。
 */

'use strict'

const path = require('path')
const fs = require('fs')

let _linksCache = null

function loadLinks () {
  if (_linksCache) return _linksCache
  try {
    const yaml = require('js-yaml')
    const linksPath = path.join(hexo.source_dir, '_data', 'links.yml')
    const raw = fs.readFileSync(linksPath, 'utf8')
    // Strip comment lines (starting with #) so js-yaml doesn't choke on '# 字段说明:' style
    const stripped = raw.split(/\r?\n/).map(l => /^\s*#/.test(l) ? '' : l).join('\n')
    _linksCache = yaml.load(stripped) || {}
  } catch (e) {
    _linksCache = {}
  }
  return _linksCache
}

// helper:跨文章查找第一个匹配的 link
function findLink (key, links) {
  for (const articleSlug of Object.keys(links)) {
    const articleLinks = links[articleSlug]
    if (Array.isArray(articleLinks)) {
      const found = articleLinks.find(l => l && l.key === key)
      if (found) return found
    } else if (articleLinks && typeof articleLinks === 'object' && articleLinks.key === key) {
      // 兼容旧 flat 结构
      return articleLinks
    }
  }
  return null
}

const linkTag = function(args) {
  const key = args[0]
  const customText = args[1]
  const showCode = args[2] !== 'false' // 默认 true,传字符串 'false' 隐藏

  if (!key) {
    return '<span style="color:red">[link helper 缺少 key 参数]</span>'
  }

  const links = loadLinks()
  const link = findLink(key, links)
  if (!link) {
    return `<span style="color:red">[未知链接: ${key}]</span>`
  }

  const text = customText || link.label || key
  let html = `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`

  // status 视觉指示
  if (link.status === 'warning') {
    html += ` <span class="link-status link-warning" title="警告:链接可能过期">⚠️</span>`
  } else if (link.status === 'broken') {
    html += ` <span class="link-status link-broken" title="失效:链接已坏">❌</span>`
  }

  if (showCode && link.extract_code) {
    html += ` <code>提取码：${link.extract_code}</code>`
  }

  return html
}

hexo.extend.tag.register('link', linkTag, { ends: false })