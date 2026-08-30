import { decodeHtmlEntities } from '@/lib/html/sanitizeWordPressHtml'

function decodeSummaryEntities(value: string): string {
  let decoded = value

  for (let index = 0; index < 4; index += 1) {
    const next = decodeHtmlEntities(decoded)

    if (next === decoded) {
      break
    }

    decoded = next
  }

  return decoded
}

function normalizeSummaryText(value: string): string {
  return decodeSummaryEntities(value)
    .replace(/\u00a0/gu, ' ')
    .replace(/[\u0000-\u001f\u007f]/gu, ' ')
    .replace(/[“”„«»]/gu, '"')
    .replace(/[‘’‚]/gu, "'")
    .replace(/[–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function stripHtmlToText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return normalizeSummaryText(value)
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