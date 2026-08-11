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
  'gia',
  'mua',
  'loai',
  'nao',
  'co',
  'khong',
])

const EXISTING_RULE_PAGE_SIZE = 500
const SUGGESTION_PAGE_SIZE = 200
const MAX_SUGGESTION_SCAN_PAGES = 250
const MAX_KEYWORDS_PER_RULE = 8
const ABSOLUTE_MAX_LIMIT = 2000

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;|&#8221;/gi, '"')
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
  if (type === 'brands') return '/brands/' + slug + '/'
  if (type === 'categories') return '/categories/' + slug + '/'
  if (type === 'products') return '/products/' + slug + '/'
  if (type === 'posts') return '/blog/' + slug + '/'

  return '/blog/category/' + slug + '/'
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
  if (type === 'posts') return 60

  return 55
}

function getSeoKeywords(doc: Record<string, unknown>): string[] {
  if (!isRecord(doc.seo) || !Array.isArray(doc.seo.keywords)) return []

  return doc.seo.keywords
    .map((item) => (isRecord(item) ? cleanText(item.keyword) : ''))
    .filter(Boolean)
}

function removeProductNoise(value: string): string {
  return cleanText(value)
    .replace(/\b(eau de parfum|eau de toilette|eau de cologne|extrait de parfum|edp|edt|edc|parfum)\b/gi, ' ')
    .replace(/\b\d+\s?(ml|g|gram|viên|vien|chai|tuýp|tube|hộp|hop)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeKeywords(doc: Record<string, unknown>, type: InternalLinkSuggestionSource) {
  const title = cleanText(doc.title || doc.name)
  const slug = cleanText(doc.slug).replace(/-/g, ' ')
  const seoTitle = isRecord(doc.seo)
    ? cleanText(doc.seo.title || doc.seo.metaTitle)
    : cleanText(doc.seoTitle)
  const seoKeywords = getSeoKeywords(doc)

  const keywords = [title, seoTitle, ...seoKeywords]

  if (slug && slug !== title) keywords.push(slug)

  if (type === 'brands') {
    keywords.push('thương hiệu ' + title, title + ' chính hãng')
  }

  if (type === 'categories') {
    keywords.push(title + ' chính hãng', 'mua ' + title, 'các loại ' + title)
  }

  if (type === 'products') {
    const compactTitle = removeProductNoise(title)

    if (compactTitle && compactTitle !== title) keywords.push(compactTitle)
    keywords.push(slug)
  }

  if (type === 'posts') {
    keywords.push(
      title.replace(/^(review|top|đánh giá|danh sách|cách chọn)\s+/iu, '').trim(),
    )
  }

  return unique(keywords).filter(usefulKeyword).slice(0, MAX_KEYWORDS_PER_RULE)
}

function ruleKey(targetUrl: string, keyword: string) {
  return normalizeVietnameseText(targetUrl) + '::' + normalizeVietnameseText(keyword)
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
    id: collection + ':' + sourceId,
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
      weight: Math.max(1, 20 - index * 2),
    })),
    score: scoreFor(collection) + Math.min(10, keywords.length),
    reason: 'Gợi ý tự động từ tên, slug, SEO title và keyword hiện có.',
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
      sort: '-updatedAt',
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
  limit = 500,
  includeExisting = false,
}: {
  payload: Payload
  sourceType?: InternalLinkSuggestionSource | 'all'
  limit?: number
  includeExisting?: boolean
}) {
  const safeLimit = Math.min(Math.max(1, limit || 500), ABSOLUTE_MAX_LIMIT)
  const existingKeys = await loadExistingKeys(payload)
  const collections = sourceType === 'all' ? COLLECTIONS : [sourceType]
  const suggestions: InternalLinkSuggestion[] = []
  const perCollectionLimit =
    sourceType === 'all' ? Math.max(1, Math.ceil(safeLimit / collections.length)) : safeLimit

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
    return sortedSuggestions.slice(0, safeLimit)
  }

  const balancedSuggestions = collections.flatMap((collection) =>
    sortedSuggestions
      .filter((suggestion) => suggestion.sourceType === collection)
      .slice(0, perCollectionLimit),
  )

  return balancedSuggestions.slice(0, safeLimit)
}

export async function createInternalLinkRuleFromSuggestion(
  payload: Payload,
  suggestion: InternalLinkSuggestion,
  options: { enabled?: boolean } = {},
) {
  return payload.create({
    collection: 'internal-link-rules' as any,
    depth: 0,
    overrideAccess: true,
    data: {
      title: 'Auto: ' + suggestion.sourceTitle,
      enabled: options.enabled ?? false,
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
