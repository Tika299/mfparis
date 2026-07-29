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

async function loadExistingKeys(payload: Payload) {
    const result = await payload.find({
        collection: 'internal-link-rules' as any,
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
    })

    const keys = new Set<string>()

    for (const rule of result.docs as any[]) {
        const targetUrl = cleanText(rule.targetUrl)

        for (const item of rule.keywords || []) {
            const keyword = cleanText(item.keyword)
            if (!targetUrl || !keyword) continue

            keys.add(`${normalizeVietnameseText(targetUrl)}::${normalizeVietnameseText(keyword)}`)
        }
    }

    return keys
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

    for (const collection of collections) {
        const result = await payload.find({
            collection: collection as any,
            depth: 0,
            limit,
            pagination: false,
            overrideAccess: true,
        })

        for (const doc of result.docs as any[]) {
            const sourceId = doc.id
            const sourceTitle = cleanText(doc.title || doc.name)
            const slug = cleanText(doc.slug)

            if (!sourceId || !sourceTitle || !slug) continue

            const targetUrl = targetUrlFor(collection, slug)
            const keywords = makeKeywords(doc, collection)

            if (keywords.length === 0) continue

            const exists = keywords.some((keyword) =>
                existingKeys.has(
                    `${normalizeVietnameseText(targetUrl)}::${normalizeVietnameseText(keyword)}`,
                ),
            )

            if (exists && !includeExisting) continue

            suggestions.push({
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
                score:
                    collection === 'categories'
                        ? 90
                        : collection === 'brands'
                            ? 85
                            : collection === 'products'
                                ? 70
                                : 55,
                reason: 'Gợi ý tự động từ title, slug, SEO title và keyword hiện có.',
                exists,
            })
        }
    }

    const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score)

    if (sourceType !== 'all') {
        return sortedSuggestions.slice(0, limit)
    }

    const perCollectionLimit = Math.max(1, Math.ceil(limit / collections.length))
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
