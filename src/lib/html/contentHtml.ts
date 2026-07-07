import { sanitizeWordPressHtml } from './sanitizeWordPressHtml'

type LexicalNode = Record<string, any>

const textFormatMap = [
  { bit: 1, tag: 'strong' },
  { bit: 2, tag: 'em' },
  { bit: 8, tag: 'u' },
  { bit: 16, tag: 'code' },
] as const

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttribute(value: unknown): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function childrenToHtml(children: LexicalNode[] = []): string {
  return children.map(nodeToHtml).join('')
}

function nodeToHtml(node: LexicalNode): string {
  if (!node || typeof node !== 'object') {
    return ''
  }

  if (node.type === 'text') {
    let content = escapeHtml(node.text ?? '')
    const format = Number(node.format ?? 0)

    for (const item of textFormatMap) {
      if (format & item.bit) {
        content = `<${item.tag}>${content}</${item.tag}>`
      }
    }

    return content
  }

  if (node.type === 'linebreak') {
    return '<br>'
  }

  if (node.type === 'paragraph') {
    const content = childrenToHtml(node.children)
    return content.trim() ? `<p>${content}</p>` : ''
  }

  if (node.type === 'heading') {
    const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag)
      ? node.tag
      : 'h2'

    return `<${tag}>${childrenToHtml(node.children)}</${tag}>`
  }

  if (node.type === 'link') {
    const url = node.fields?.url || node.url || '#'
    const newTab = Boolean(node.fields?.newTab)
    const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''

    return `<a href="${escapeAttribute(url)}"${target}>${childrenToHtml(node.children)}</a>`
  }

  if (node.type === 'list') {
    const tag = node.tag === 'ol' || node.listType === 'number' ? 'ol' : 'ul'
    return `<${tag}>${childrenToHtml(node.children)}</${tag}>`
  }

  if (node.type === 'listitem') {
    return `<li>${childrenToHtml(node.children)}</li>`
  }

  if (node.type === 'quote') {
    return `<blockquote>${childrenToHtml(node.children)}</blockquote>`
  }

  if (node.type === 'horizontalrule') {
    return '<hr>'
  }

  if (node.type === 'table') {
    return `<table><tbody>${childrenToHtml(node.children)}</tbody></table>`
  }

  if (node.type === 'tablerow') {
    return `<tr>${childrenToHtml(node.children)}</tr>`
  }

  if (node.type === 'tablecell') {
    const tag = node.headerState && node.headerState !== 0 ? 'th' : 'td'
    const colSpan = Number(node.colSpan || 1)
    const rowSpan = Number(node.rowSpan || 1)
    const attrs = [
      colSpan > 1 ? ` colspan="${colSpan}"` : '',
      rowSpan > 1 ? ` rowspan="${rowSpan}"` : '',
    ].join('')

    return `<${tag}${attrs}>${childrenToHtml(node.children)}</${tag}>`
  }

  return Array.isArray(node.children) ? childrenToHtml(node.children) : ''
}

export function lexicalToHtml(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const root = (value as Record<string, any>).root
  const children = Array.isArray(root?.children) ? root.children : []

  return childrenToHtml(children)
}

export function normalizeContentHtml(value: unknown): string {
  if (typeof value === 'string') {
    return sanitizeWordPressHtml(value)
  }

  return sanitizeWordPressHtml(lexicalToHtml(value))
}

export function htmlToPlainText(value: unknown): string {
  return normalizeContentHtml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export type HtmlHeading = {
  id: string
  text: string
}

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function extractHtmlHeadings(value: unknown): HtmlHeading[] {
  const html = normalizeContentHtml(value)
  const used = new Map<string, number>()
  const items: HtmlHeading[] = []

  html.replace(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_match, rawText) => {
    const text = String(rawText)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!text) {
      return ''
    }

    const baseId = slugify(text) || 'section'
    const count = used.get(baseId) || 0

    used.set(baseId, count + 1)

    items.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      text,
    })

    return ''
  })

  return items
}

export function addHeadingIds(value: unknown, headings: HtmlHeading[]): string {
  let index = 0

  return normalizeContentHtml(value).replace(
    /<h2(\s[^>]*)?>/gi,
    (match, attrs = '') => {
      const heading = headings[index]
      index += 1

      if (!heading || /\sid\s*=/.test(match)) {
        return match
      }

      return `<h2${attrs} id="${escapeAttribute(heading.id)}">`
    },
  )
}
