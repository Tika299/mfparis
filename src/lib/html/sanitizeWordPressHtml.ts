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

const namedHtmlEntities: Record<string, string> = {
  aacute: '\u00e1',
  Aacute: '\u00c1',
  acirc: '\u00e2',
  Acirc: '\u00c2',
  agrave: '\u00e0',
  Agrave: '\u00c0',
  amp: '&',
  aring: '\u00e5',
  Aring: '\u00c5',
  apos: "'",
  atilde: '\u00e3',
  Atilde: '\u00c3',
  auml: '\u00e4',
  Auml: '\u00c4',
  ccedil: '\u00e7',
  Ccedil: '\u00c7',
  eacute: '\u00e9',
  Eacute: '\u00c9',
  ecirc: '\u00ea',
  Ecirc: '\u00ca',
  egrave: '\u00e8',
  Egrave: '\u00c8',
  euml: '\u00eb',
  Euml: '\u00cb',
  gt: '>',
  hellip: '...',
  iacute: '\u00ed',
  Iacute: '\u00cd',
  icirc: '\u00ee',
  Icirc: '\u00ce',
  igrave: '\u00ec',
  Igrave: '\u00cc',
  iuml: '\u00ef',
  Iuml: '\u00cf',
  ldquo: '"',
  lsquo: "'",
  lt: '<',
  mdash: '-',
  ndash: '-',
  nbsp: ' ',
  ntilde: '\u00f1',
  Ntilde: '\u00d1',
  oacute: '\u00f3',
  Oacute: '\u00d3',
  ocirc: '\u00f4',
  Ocirc: '\u00d4',
  ograve: '\u00f2',
  Ograve: '\u00d2',
  oslash: '\u00f8',
  Oslash: '\u00d8',
  otilde: '\u00f5',
  Otilde: '\u00d5',
  ouml: '\u00f6',
  Ouml: '\u00d6',
  quot: '"',
  rdquo: '"',
  rsquo: "'",
  szlig: '\u00df',
  uacute: '\u00fa',
  Uacute: '\u00da',
  ucirc: '\u00fb',
  Ucirc: '\u00db',
  ugrave: '\u00f9',
  Ugrave: '\u00d9',
  uuml: '\u00fc',
  Uuml: '\u00dc',
  times: 'x',
  yacute: '\u00fd',
  Yacute: '\u00dd',
  yuml: '\u00ff',
  Yuml: '\u0178',
}

export function normalizeBrokenHtmlEntities(value: string): string {
  return value
    .replace(/\$#(x?[0-9a-f]+);/gi, '&#$1;')
    .replace(/&0*#?([0-9]{2,6});/g, '&#$1;')
    .replace(/\$amp;/gi, '&amp;')
    .replace(/&amp;(#x?[0-9a-f]+;)/gi, '&$1')
    .replace(/&amp;([a-z][a-z0-9]+;)/gi, '&$1')
}

export function decodeHtmlEntities(value: string): string {
  let decoded = normalizeBrokenHtmlEntities(value)

  for (let index = 0; index < 3; index += 1) {
    const nextDecoded = decoded.replace(
      /&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi,
      (full, rawEntity) => {
        const entity = String(rawEntity).toLowerCase()

        if (entity.startsWith('#x')) {
          const codePoint = Number.parseInt(entity.slice(2), 16)

          if (Number.isFinite(codePoint)) {
            try {
              return codePoint === 160 ? ' ' : String.fromCodePoint(codePoint)
            } catch {
              return full
            }
          }

          return full
        }

        if (entity.startsWith('#')) {
          const codePoint = Number.parseInt(entity.slice(1), 10)

          if (Number.isFinite(codePoint)) {
            try {
              return codePoint === 160 ? ' ' : String.fromCodePoint(codePoint)
            } catch {
              return full
            }
          }

          return full
        }

        return namedHtmlEntities[entity] ?? namedHtmlEntities[rawEntity] ?? full
      },
    )

    if (nextDecoded === decoded) {
      break
    }

    decoded = nextDecoded
  }

  return decoded.replace(/\u00a0/g, ' ')
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cleanSlugPathSegment(value: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(value.trim()))
  } catch {
    return encodeURIComponent(value.trim())
  }
}

export function normalizeLegacyInternalUrl(value: string): string {
  const raw = String(value || '').trim()

  if (!raw) {
    return raw
  }

  const hashMatch = raw.match(/#.*$/)
  const hash = hashMatch?.[0] || ''
  const withoutHash = hash ? raw.slice(0, -hash.length) : raw
  const hadTrailingSlash = /\/$/.test(withoutHash)

  try {
    const parsed = new URL(withoutHash, 'https://mfparis.vn')
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const isKnownHost = host === 'mfparis.vn' || host === 'maraisdefrance.vn'
    const pathname = parsed.pathname.replace(/\/+$/g, '')

    if (isKnownHost) {
      const brandFromQuery = parsed.searchParams.get('filter_brand')

      if (brandFromQuery && (pathname === '/shop' || pathname === '/products')) {
        return '/brands/' + cleanSlugPathSegment(brandFromQuery) + hash
      }

      const brandMatch = pathname.match(/^\/thuong-hieu\/([^/]+)(?:\/san-pham)?$/i)

      if (brandMatch?.[1]) {
        return '/brands/' + cleanSlugPathSegment(brandMatch[1]) + (hadTrailingSlash ? '/' : '') + hash
      }

      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return parsed.pathname + parsed.search + hash
      }
    }
  } catch {
    // Fall through to path-only handling.
  }

  const pathOnlyMatch = withoutHash.match(/^\/thuong-hieu\/([^/?#]+)(?:\/san-pham)?\/?$/i)

  if (pathOnlyMatch?.[1]) {
    return '/brands/' + cleanSlugPathSegment(pathOnlyMatch[1]) + (hadTrailingSlash ? '/' : '') + hash
  }

  return raw
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

function unwrapImageOnlyLinks(html: string): string {
  let nextHtml = html

  for (let index = 0; index < 5; index += 1) {
    const unwrapped = nextHtml.replace(
      /<a\b[^>]*>\s*((?:<img\b[^>]*>\s*)+)<\/a>/gi,
      '$1',
    )

    if (unwrapped === nextHtml) {
      break
    }

    nextHtml = unwrapped
  }

  return nextHtml
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

    const nextAttrValue =
      tagName === 'a' && attrName === 'href'
        ? normalizeLegacyInternalUrl(attrValue)
        : attrValue

    sanitized.push(`${attrName}="${escapeAttribute(nextAttrValue)}"`)
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

  return unwrapImageOnlyLinks(decodeHtmlEntities(html))
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
