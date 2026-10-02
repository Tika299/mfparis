import type {
    CollectionAfterChangeHook,
    CollectionAfterDeleteHook,
} from 'payload'

import { normalizeVietnameseText } from '@/lib/internal-links/normalizeVietnamese'
import type { InternalLinkScope } from '@/lib/internal-links/types'

type CategoryInboundLinkKeyword = {
    keyword?: null | string
}

type CategoryInboundLinkSettings = {
    enabled?: boolean | null
    keywords?: null | CategoryInboundLinkKeyword[]
    scope?: InternalLinkScope[] | null
    maxInsertionsPerPage?: number | null
}

type CategoryDocument = {
    id: number | string
    name?: null | string
    slug?: null | string
    inboundInternalLinks?: null | CategoryInboundLinkSettings
}

const MANAGED_KEY_PREFIX = 'category:'

const VALID_SCOPES = new Set<InternalLinkScope>([
    'posts',
    'products',
    'categories',
    'brands',
    'post-categories',
])

function getManagedKey(categoryId: number | string): string {
    return `${MANAGED_KEY_PREFIX}${categoryId}`
}

function getKeywords(
    input: CategoryInboundLinkSettings['keywords'],
): Array<{ keyword: string; matchType: 'phrase'; weight: number }> {
    if (!Array.isArray(input)) return []

    const uniqueKeywords = new Map<string, string>()

    for (const item of input) {
        const keyword =
            typeof item?.keyword === 'string'
                ? item.keyword.trim().replace(/\s+/gu, ' ')
                : ''

        if (!keyword) continue

        const normalized = normalizeVietnameseText(keyword)

        if (!normalized || uniqueKeywords.has(normalized)) continue

        uniqueKeywords.set(normalized, keyword)
    }

    return Array.from(uniqueKeywords.values()).map((keyword) => ({
        keyword,
        matchType: 'phrase',
        weight: 1,
    }))
}

function getScopes(
    input: CategoryInboundLinkSettings['scope'],
): InternalLinkScope[] {
    if (!Array.isArray(input)) return ['posts']

    const scopes = input.filter(
        (scope): scope is InternalLinkScope => VALID_SCOPES.has(scope),
    )

    return scopes.length > 0 ? scopes : ['posts']
}

function getMaxInsertions(
    input: CategoryInboundLinkSettings['maxInsertionsPerPage'],
): number {
    if (typeof input !== 'number' || !Number.isFinite(input)) return 1

    return Math.min(10, Math.max(1, Math.floor(input)))
}

async function findManagedRule(req: any, managedKey: string) {
    const result = await req.payload.find({
        collection: 'internal-link-rules' as any,
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req,
        where: {
            managedKey: {
                equals: managedKey,
            },
        },
    })

    return result.docs[0] as
        | {
            id: number | string
        }
        | undefined
}

async function disableManagedRule(
    req: any,
    categoryId: number | string,
): Promise<void> {
    const existing = await findManagedRule(req, getManagedKey(categoryId))

    if (!existing) return

    await req.payload.update({
        collection: 'internal-link-rules' as any,
        id: existing.id,
        depth: 0,
        overrideAccess: true,
        req,
        data: {
            enabled: false,
        } as any,
    })
}

async function syncCategoryRule(
    doc: CategoryDocument,
    req: any,
): Promise<void> {
    const settings = doc.inboundInternalLinks
    const managedKey = getManagedKey(doc.id)
    const existing = await findManagedRule(req, managedKey)
    const keywords = getKeywords(settings?.keywords)
    const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''

    if (!settings?.enabled || !keywords.length || !slug) {
        if (existing) {
            await req.payload.update({
                collection: 'internal-link-rules' as any,
                id: existing.id,
                depth: 0,
                overrideAccess: true,
                req,
                data: {
                    enabled: false,
                } as any,
            })
        }

        return
    }

    const ruleData = {
        title: `Auto link: ${doc.name?.trim() || `Category #${doc.id}`}`,
        enabled: true,
        priority: 'category',
        keywords,
        targetType: 'category',
        targetUrl: `/categories/${encodeURIComponent(slug)}`,
        scope: getScopes(settings.scope),
        maxInsertionsPerPage: getMaxInsertions(settings.maxInsertionsPerPage),
        managedBy: 'category',
        managedKey,
        managedSourceId: String(doc.id),
    }

    if (existing) {
        await req.payload.update({
            collection: 'internal-link-rules' as any,
            id: existing.id,
            depth: 0,
            overrideAccess: true,
            req,
            data: ruleData as any,
        })

        return
    }

    try {
        await req.payload.create({
            collection: 'internal-link-rules' as any,
            depth: 0,
            overrideAccess: true,
            req,
            data: ruleData as any,
        })
    } catch (error) {
        // If concurrent saves hit the unique managedKey, update the rule
        // created by the other request instead of creating a duplicate.
        const createdByOtherRequest = await findManagedRule(req, managedKey)

        if (!createdByOtherRequest) throw error

        await req.payload.update({
            collection: 'internal-link-rules' as any,
            id: createdByOtherRequest.id,
            depth: 0,
            overrideAccess: true,
            req,
            data: ruleData as any,
        })
    }
}

export const syncCategoryInboundInternalLinks: CollectionAfterChangeHook<
    CategoryDocument
> = async ({ doc, req }) => {
    await syncCategoryRule(doc, req)
    return doc
}

export const disableCategoryInboundInternalLinks: CollectionAfterDeleteHook<
    CategoryDocument
> = async ({ doc, req }) => {
    await disableManagedRule(req, doc.id)
    return doc
}