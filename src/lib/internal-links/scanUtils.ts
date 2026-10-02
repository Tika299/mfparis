import { normalizeVietnameseText } from './normalizeVietnamese'
import type {
  InternalLinkInsertion,
  InternalLinkSkippedItem,
} from './types'

const ACTIONABLE_SKIP_REASONS = new Set([
  'self_link',
  'max_links_reached',
  'max_target_reached',
  'max_anchor_reached',
  'duplicate_paragraph',
  'generic_anchor',
  'product_name_fragment',
])

export function countInternalLinkWords(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length
}

export function getInternalLinkContextExcerpt(
  text: string,
  anchor: string | undefined,
  maxLength = 220,
): string {
  const normalizedText = text.replace(/\s+/gu, ' ').trim()

  if (!normalizedText) return ''
  if (!anchor?.trim() || normalizedText.length <= maxLength) {
    return normalizedText.slice(0, maxLength)
  }

  const index = normalizedText
    .toLocaleLowerCase('vi')
    .indexOf(anchor.trim().toLocaleLowerCase('vi'))

  if (index < 0) return normalizedText.slice(0, maxLength)

  const availableContext = Math.max(0, maxLength - anchor.length - 2)
  const beforeLength = Math.floor(availableContext / 2)
  const afterLength = availableContext - beforeLength
  const start = Math.max(0, index - beforeLength)
  const end = Math.min(
    normalizedText.length,
    index + anchor.length + afterLength,
  )
  const prefix = start > 0 ? '…' : ''
  const suffix = end < normalizedText.length ? '…' : ''

  return `${prefix}${normalizedText.slice(start, end).trim()}${suffix}`.slice(
    0,
    maxLength,
  )
}

export function shouldStoreInternalLinkSkip(
  item: InternalLinkSkippedItem,
  plainText: string,
): boolean {
  if (
    item.reason !== 'self_link' &&
    item.reason !== 'excluded_keyword'
  ) {
    return true
  }

  const keyword = normalizeVietnameseText(item.keyword || '')
  const normalizedText = normalizeVietnameseText(plainText)

  return Boolean(keyword && normalizedText.includes(keyword))
}

export function getInternalLinkSkipIssueFlags(
  item: InternalLinkSkippedItem,
): string[] {
  return ACTIONABLE_SKIP_REASONS.has(item.reason)
    ? [`skipped_${item.reason}`]
    : []
}

export function getInternalLinkInsertionIssueFlags(
  insertion: InternalLinkInsertion,
  targetCounts: ReadonlyMap<string, number>,
  anchorCounts: ReadonlyMap<string, number>,
): string[] {
  const flags: string[] = []
  const normalizedAnchor = normalizeVietnameseText(insertion.anchorText)

  if ((targetCounts.get(insertion.targetUrl) || 0) > 1) {
    flags.push('duplicate_target')
  }

  if (normalizedAnchor && (anchorCounts.get(normalizedAnchor) || 0) > 1) {
    flags.push('duplicate_anchor')
  }

  return flags
}
