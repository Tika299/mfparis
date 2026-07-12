const allowedTags = new Set([
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
])

const voidTags = new Set(['br', 'col', 'hr', 'img'])

const globalAttributes = new Set([
  'class',
  'id',
  'title',
  'lang',
  'dir',
  'role',
  'aria-label',
  'aria-describedby',
  'itemscope',
  'itemtype',
  'itemprop',
  'itemid',
  'itemref',
])

const attributesByTag: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'name', 'download']),
  img: new Set([
    'src',
    'alt',
    'title',
    'width',
    'height',
    'loading',
    'decoding',
  ]),
  table: new Set(['border', 'cellpadding', 'cellspacing']),
  td: new Set(['colspan', 'rowspan', 'align', 'valign']),
  th: new Set(['colspan', 'rowspan', 'align', 'valign', 'scope']),
  ol: new Set(['start', 'type']),
  ul: new Set(['type']),
  time: new Set(['datetime']),
}

const styleProperties = new Set([
  'background-color',
  'clear',
  'color',
  'display',
  'float',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'width',
])

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isSafeUrl(value: string, tagName: string, attrName: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, '')

  if (!normalized) {
    return false
  }

  if (
    normalized.startsWith('#') ||
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    return true
  }

  if (tagName === 'img' && attrName === 'src') {
    return /^https?:\/\//i.test(normalized)
  }

  return /^(https?:|mailto:|tel:)/i.test(normalized)
}

function sanitizeStyle(value: string): string {
  return value
    .split(';')
    .map((declaration) => {
      const [property, ...rawValueParts] = declaration.split(':')
      const normalizedProperty = property?.trim().toLowerCase()
      const rawValue = rawValueParts.join(':').trim()

      if (!normalizedProperty || !rawValue) {
        return ''
      }

      if (!styleProperties.has(normalizedProperty)) {
        return ''
      }

      if (/expression\s*\(|url\s*\(|javascript:/i.test(rawValue)) {
        return ''
      }

      return `${normalizedProperty}: ${rawValue}`
    })
    .filter(Boolean)
    .join('; ')
}

function isAllowedAttribute(tagName: string, attrName: string): boolean {
  if (globalAttributes.has(attrName)) {
    return true
  }

  if (attrName.startsWith('data-') || attrName.startsWith('aria-')) {
    return true
  }

  return attributesByTag[tagName]?.has(attrName) ?? false
}

function isWordPressLazyPlaceholder(value: string): boolean {
  return /\/themes\/woodmart\/images\/lazy\.svg(?:$|[?#])/i.test(value)
}

function sanitizeAttributes(tagName: string, attrs = ''): string {
  const sanitized: string[] = []
  const attrValues = new Map<string, string>()
  const attrPattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(attrs)) !== null) {
    attrValues.set(
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? '',
    )
  }

  if (tagName === 'img') {
    const currentSrc = attrValues.get('src') || ''
    const lazySrc =
      attrValues.get('data-src') ||
      attrValues.get('data-lazy-src') ||
      attrValues.get('data-original') ||
      ''

    if (
      lazySrc &&
      (!currentSrc || isWordPressLazyPlaceholder(currentSrc)) &&
      isSafeUrl(lazySrc, 'img', 'src')
    ) {
      attrValues.set('src', lazySrc)
    }
  }

  for (const [attrName, attrValue] of attrValues) {
    if (attrName.startsWith('on')) {
      continue
    }

    if (attrName === 'style') {
      const safeStyle = sanitizeStyle(attrValue)

      if (safeStyle) {
        sanitized.push(`style="${escapeAttribute(safeStyle)}"`)
      }

      continue
    }

    if (!isAllowedAttribute(tagName, attrName)) {
      continue
    }

    if (
      (attrName === 'href' || attrName === 'src' || attrName === 'cite') &&
      !isSafeUrl(attrValue, tagName, attrName)
    ) {
      continue
    }

    if (tagName === 'a' && attrName === 'target' && attrValue !== '_blank') {
      continue
    }

    if (
      tagName === 'img' &&
      (attrName === 'srcset' ||
        attrName === 'data-srcset' ||
        attrName === 'data-lazy-srcset')
    ) {
      continue
    }

    sanitized.push(`${attrName}="${escapeAttribute(attrValue)}"`)
  }

  if (tagName === 'a' && sanitized.some((attr) => attr === 'target="_blank"')) {
    const relIndex = sanitized.findIndex((attr) => attr.startsWith('rel="'))

    if (relIndex >= 0) {
      sanitized[relIndex] = sanitized[relIndex].replace(
        /"$/,
        ' noopener noreferrer"',
      )
    } else {
      sanitized.push('rel="noopener noreferrer"')
    }
  }

  if (tagName === 'img') {
    if (!sanitized.some((attr) => attr.startsWith('alt='))) {
      sanitized.push('alt=""')
    }

    if (!sanitized.some((attr) => attr.startsWith('loading='))) {
      sanitized.push('loading="lazy"')
    }

    if (!sanitized.some((attr) => attr.startsWith('decoding='))) {
      sanitized.push('decoding="async"')
    }
  }

  return sanitized.length ? ` ${sanitized.join(' ')}` : ''
}

export function sanitizeWordPressHtml(html: unknown): string {
  if (typeof html !== 'string' || !html.trim()) {
    return ''
  }

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base)[^>]*\/?\s*>/gi,
      '',
    )
    .replace(/<\/?([a-zA-Z0-9-]+)(\s[^<>]*)?>/g, (full, rawTag, attrs) => {
      const tagName = String(rawTag).toLowerCase()
      const isClosing = /^<\s*\//.test(full)

      if (!allowedTags.has(tagName)) {
        return ''
      }

      if (isClosing) {
        return voidTags.has(tagName) ? '' : `</${tagName}>`
      }

      return `<${tagName}${sanitizeAttributes(tagName, attrs)}>`
    })
}
