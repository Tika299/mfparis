const htmlEntityMap: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '(c)',
  gt: '>',
  hellip: '...',
  laquo: '"',
  ldquo: '"',
  lrm: '',
  lt: '<',
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
  quot: '"',
  raquo: '"',
  rdquo: '"',
  reg: '(R)',
  rlm: '',
  rsquo: "'",
  lsquo: "'",
  trade: 'TM',
}

function decodeHtmlEntity(entity: string): string {
  const value = entity.slice(1, -1)

  if (value.startsWith('#x') || value.startsWith('#X')) {
    const code = Number.parseInt(value.slice(2), 16)
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity
  }

  if (value.startsWith('#')) {
    const code = Number.parseInt(value.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity
  }

  return htmlEntityMap[value.toLowerCase()] || entity
}

export function decodeBasicHtmlEntities(value: string): string {
  return value.replace(/&(?:#x?[0-9a-f]+|[a-z][a-z0-9]+);/giu, decodeHtmlEntity)
}

export function stripHtmlToText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return decodeBasicHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/giu, ' ')
    .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/giu, ' ')
    .replace(/<br\s*\/?\s*>/giu, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|blockquote)>/giu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\[[^\]\n]{1,80}\]/gu, ' ')
    .replace(/https?:\/\/\S+/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function hasMeaningfulText(value: unknown): boolean {
  return stripHtmlToText(value).length > 0
}

export function createAutoSummary(
  value: unknown,
  options: {
    maxLength?: number
    minLength?: number
  } = {},
): string {
  const maxLength = Math.max(80, options.maxLength || 240)
  const minLength = Math.max(40, Math.min(options.minLength || 90, maxLength - 20))
  const text = stripHtmlToText(value)

  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  const windowText = text.slice(0, maxLength + 1)
  const sentenceCuts = ['. ', '! ', '? ', '; ', ': ']
  let cut = -1

  for (const marker of sentenceCuts) {
    const index = windowText.lastIndexOf(marker)

    if (index >= minLength) {
      cut = Math.max(cut, index + 1)
    }
  }

  if (cut < minLength) {
    cut = windowText.lastIndexOf(' ', maxLength)
  }

  if (cut < minLength) {
    cut = maxLength
  }

  return text.slice(0, cut).replace(/[\s,;:.-]+$/gu, '').trim() + '...'
}
