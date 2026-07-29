import type { Payload } from 'payload'

import { normalizeVietnameseText } from './normalizeVietnamese'
import type { InternalLinkRulePriority, InternalLinkScope } from './types'

export type InternalLinkSuggestionSource =
  | 'brands'
  | 'categories'
  | 'products'
  | 'posts'
  | 'post-categories'

export type InternalLinkSuggestion = {
  id: string
  sourceType: InternalLinkSuggestionSource
  sourceId: string | number
  sourceTitle: string
  targetUrl: string
  targetType: 'brand' | 'category' | 'product' | 'post' | 'post_category'
  priority: InternalLinkRulePriority
  scope: InternalLinkScope[]
  keywords: Array<{
    keyword: string
    matchType: 'contains' | 'phrase'
    weight: number
  }>
  score: number
  reason: string
  exists: boolean
}

const COLLECTIONS: InternalLinkSuggestionSource[] = [
  'brands',
  'categories',
  'products',
  'posts',
  'post-categories',
]

const STOPWORDS = new Set([
  'va',
  'voi',
  'cho',
  'cua',
  'cac',
  'nhung',
  'san',
  'pham',
  'bai',
  'viet',
  'danh',
  'muc',
  'chinh',
  'hang',
  'tot',
  'nhat',
  'review',
  'top',
])

const EXISTING_RULE_PAGE_SIZE = 500
const SUGGESTION_PAGE_SIZE = 100
const MAX_SUGGESTION_SCAN_PAGES = 80

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function usefulKeyword(keyword: string): boolean {
  const normalized = normalizeVietnameseText(keyword)
  const words = normalized.split(' ').filter(Boolean)

  if (normalized.length < 3) return false
  if (words.length === 1) return words[0].length >= 3 && !STOPWORDS.has(words[0])

  return words.some((word) => word.length >= 3 && !STOPWORDS.has(word))
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()

  return values
    .map(cleanText)
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeVietnameseText(value)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function targetUrlFor(type: InternalLinkSuggestionSource, slug: string) {
  if (type === 'brands') return `/brands/${slug}/`
  if (type === 'categories') return `/categories/${slug}/`
  if (type === 'products') return `/products/${slug}/`
  if (type === 'posts') return `/blog/${slug}/`

  return `/blog/category/${slug}/`
}

function targetTypeFor(type: InternalLinkSuggestionSource): InternalLinkSuggestion['targetType'] {
  if (type === 'brands') return 'brand'
  if (type === 'categories') return 'category'
  if (type === 'products') return 'product'
  if (type === 'posts') return 'post'

  return 'post_category'
}

function priorityFor(type: InternalLinkSuggestionSource): InternalLinkRulePriority {
  if (type === 'brands') return 'brand'
  if (type === 'categories') return 'category'
  if (type === 'products') return 'product'

  return 'post'
}

function scopeFor(type: InternalLinkSuggestionSource): InternalLinkScope[] {
  if (type === 'products') return ['posts', 'categories', 'brands']
  if (type === 'posts' || type === 'post-categories') return ['posts']

  return ['posts', 'products', 'categories', 'brands']
}

function scoreFor(type: InternalLinkSuggestionSource) {
  if (type === 'categories') return 90
  if (type === 'brands') return 85
  if (type === 'products') return 70

  return 55
}

function makeKeywords(doc: Record<string, unknown>, type: InternalLinkSuggestionSource) {
  const title = cleanText(doc.title || doc.name)
  const slug = cleanText(doc.slug).replace(/-/g, ' ')
  const seoTitle = isRecord(doc.seo)
    ? cleanText(doc.seo.title || doc.seo.metaTitle)
    : cleanText(doc.seoTitle)
  const seoKeywords =
    isRecord(doc.seo) && Array.isArray(doc.seo.keywords)
      ? doc.seo.keywords
          .map((item) => (isRecord(item) ? cleanText(item.keyword) : ''))
          .filter(Boolean)
      : []

  const keywords = [title, seoTitle, ...seoKeywords]

  if (type === 'brands') keywords.push(`${title} chính hãng`)
  if (type === 'categories') keywords.push(`${title} chính hãng`, `mua ${title}`)
  if (type === 'products') {
    keywords.push(
      title
        .replace(/\b(eau de parfum|eau de toilette|edp|edt|parfum)\b/gi, '')
        .replace(/\b\d+\s?(ml|g)\b/gi, '')
        .trim(),
    )
    keywords.push(slug)
  }

  return unique(keywords).filter(usefulKeyword).slice(0, 5)
}

function ruleKey(targetUrl: string, keyword: string) {
  return `${normalizeVietnameseText(targetUrl)}::${normalizeVietnameseText(keyword)}`
}

async function loadExistingKeys(payload: Payload) {
  const keys = new Set<string>()
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'internal-link-rules' as any,
      depth: 0,
      limit: EXISTING_RULE_PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const rule of result.docs as any[]) {
      const targetUrl = cleanText(rule.targetUrl)

      for (const item of rule.keywords || []) {
        const keyword = cleanText(item.keyword)
        if (!targetUrl || !keyword) continue

        keys.add(ruleKey(targetUrl, keyword))
      }
    }

    hasNextPage = Boolean((result as any).hasNextPage)
    page += 1
  }

  return keys
}

function makeSuggestionFromDoc({
  collection,
  doc,
  existingKeys,
  includeExisting,
}: {
  collection: InternalLinkSuggestionSource
  doc: Record<string, unknown>
  existingKeys: Set<string>
  includeExisting: boolean
}): InternalLinkSuggestion | null {
  const sourceId = doc.id as string | number | undefined
  const sourceTitle = cleanText(doc.title || doc.name)
  const slug = cleanText(doc.slug)

  if (!sourceId || !sourceTitle || !slug) return null

  const targetUrl = targetUrlFor(collection, slug)
  const keywords = makeKeywords(doc, collection)

  if (keywords.length === 0) return null

  const exists = keywords.some((keyword) => existingKeys.has(ruleKey(targetUrl, keyword)))

  if (exists && !includeExisting) return null

  return {
    id: `${collection}:${sourceId}`,
    sourceType: collection,
    sourceId,
    sourceTitle,
    targetUrl,
    targetType: targetTypeFor(collection),
    priority: priorityFor(collection),
    scope: scopeFor(collection),
    keywords: keywords.map((keyword, index) => ({
      keyword,
      matchType: index === 0 ? 'phrase' : 'contains',
      weight: Math.max(1, 10 - index),
    })),
    score: scoreFor(collection),
    reason: 'Gợi ý tự động từ title, slug, SEO title và keyword hiện có.',
    exists,
  }
}

async function loadSuggestionsForCollection({
  payload,
  collection,
  limit,
  existingKeys,
  includeExisting,
}: {
  payload: Payload
  collection: InternalLinkSuggestionSource
  limit: number
  existingKeys: Set<string>
  includeExisting: boolean
}) {
  const suggestions: InternalLinkSuggestion[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage && suggestions.length < limit && page <= MAX_SUGGESTION_SCAN_PAGES) {
    const result = await payload.find({
      collection: collection as any,
      depth: 0,
      limit: SUGGESTION_PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const doc of result.docs as Record<string, unknown>[]) {
      const suggestion = makeSuggestionFromDoc({
        collection,
        doc,
        existingKeys,
        includeExisting,
      })

      if (!suggestion) continue

      suggestions.push(suggestion)

      if (suggestions.length >= limit) break
    }

    hasNextPage = Boolean((result as any).hasNextPage)
    page += 1
  }

  return suggestions
}

export async function suggestInternalLinkRules({
  payload,
  sourceType = 'all',
  limit = 80,
  includeExisting = false,
}: {
  payload: Payload
  sourceType?: InternalLinkSuggestionSource | 'all'
  limit?: number
  includeExisting?: boolean
}) {
  const existingKeys = await loadExistingKeys(payload)
  const collections = sourceType === 'all' ? COLLECTIONS : [sourceType]
  const suggestions: InternalLinkSuggestion[] = []
  const perCollectionLimit =
    sourceType === 'all' ? Math.max(1, Math.ceil(limit / collections.length)) : limit

  for (const collection of collections) {
    const collectionSuggestions = await loadSuggestionsForCollection({
      payload,
      collection,
      limit: perCollectionLimit,
      existingKeys,
      includeExisting,
    })

    suggestions.push(...collectionSuggestions)
  }

  const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score)

  if (sourceType !== 'all') {
    return sortedSuggestions.slice(0, limit)
  }

  const balancedSuggestions = collections.flatMap((collection) =>
    sortedSuggestions
      .filter((suggestion) => suggestion.sourceType === collection)
      .slice(0, perCollectionLimit),
  )

  return balancedSuggestions.slice(0, limit)
}

export async function createInternalLinkRuleFromSuggestion(
  payload: Payload,
  suggestion: InternalLinkSuggestion,
) {
  return payload.create({
    collection: 'internal-link-rules' as any,
    depth: 0,
    overrideAccess: true,
    data: {
      title: `Auto: ${suggestion.sourceTitle}`,
      enabled: false,
      priority: suggestion.priority,
      keywords: suggestion.keywords,
      targetType: suggestion.targetType,
      targetUrl: suggestion.targetUrl,
      scope: suggestion.scope,
      maxInsertionsPerPage: suggestion.sourceType === 'products' ? 1 : 2,
      totalInsertions: 0,
    },
  })
}
