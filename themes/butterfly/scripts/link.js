/**
 * link.js
 * 文章链接 helper —— 编译时查 source/_data/links.yml
 *
 * 用法：
 *   {% link "claude_oneclick" %}
 *
 * 配合 source/_data/links.yml 单一真源，
 * 改链接一处全站更新（工具页 + 所有文章）。
 *
 * 可选参数：
 *   {% link "key" "自定义锚文本" %}
 *   {% link "key" "自定义文本" "false" %}  ← 不显示提取码
 *
 * 注意：在 tag 渲染上下文中 `hexo.site.data` 不可访问，
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

const linkTag = function(args) {
  const key = args[0]
  const customText = args[1]
  const showCode = args[2] !== 'false' // 默认 true，传字符串 'false' 隐藏

  if (!key) {
    return '<span style="color:red">[link helper 缺少 key 参数]</span>'
  }

  const links = loadLinks()
  const link = links && links[key]
  if (!link) {
    return `<span style="color:red">[未知链接: ${key}]</span>`
  }

  const text = customText || link.label
  let html = `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`

  if (showCode && link.extract_code) {
    html += ` <code>提取码：${link.extract_code}</code>`
  }

  return html
}

hexo.extend.tag.register('link', linkTag, { ends: false })