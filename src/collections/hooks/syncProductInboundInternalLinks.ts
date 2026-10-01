import type {
    CollectionAfterChangeHook,
    CollectionAfterDeleteHook,
} from 'payload'

import { normalizeVietnameseText } from '@/lib/internal-links/normalizeVietnamese'
import type { InternalLinkScope } from '@/lib/internal-links/types'

type ProductInboundLinkKeyword = {
    keyword?: null | string
}

type ProductInboundLinkSettings = {
    enabled?: boolean | null
    keywords?: null | ProductInboundLinkKeyword[]
    scope?: InternalLinkScope[] | null
    maxInsertionsPerPage?: number | null
}

type ProductDocument = {
    id: number | string
    title?: null | string
    slug?: null | string
    inboundInternalLinks?: null | ProductInboundLinkSettings
}

const MANAGED_KEY_PREFIX = 'product:'

const VALID_SCOPES = new Set<InternalLinkScope>([
    'posts',
    'products',
    'categories',
    'brands',
    'post-categories',
])

function getManagedKey(productId: number | string): string {
    return `${MANAGED_KEY_PREFIX}${productId}`
}

function getKeywords(
    input: ProductInboundLinkSettings['keywords'],
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
    input: ProductInboundLinkSettings['scope'],
): InternalLinkScope[] {
    if (!Array.isArray(input)) return ['posts']

    const scopes = input.filter(
        (scope): scope is InternalLinkScope => VALID_SCOPES.has(scope),
    )

    return scopes.length > 0 ? scopes : ['posts']
}

function getMaxInsertions(
    input: ProductInboundLinkSettings['maxInsertionsPerPage'],
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
    productId: number | string,
): Promise<void> {
    const existing = await findManagedRule(req, getManagedKey(productId))

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

async function syncProductRule(
    doc: ProductDocument,
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
        title: `Auto link: ${doc.title?.trim() || `Product #${doc.id}`}`,
        enabled: true,
        priority: 'product',
        keywords,
        targetType: 'product',
        targetUrl: `/products/${encodeURIComponent(slug)}`,
        scope: getScopes(settings.scope),
        maxInsertionsPerPage: getMaxInsertions(
            settings.maxInsertionsPerPage,
        ),
        managedBy: 'product',
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
        // If two saves race to create the unique managedKey, update the rule
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

export const syncProductInboundInternalLinks: CollectionAfterChangeHook<
    ProductDocument
> = async ({ doc, req }) => {
    await syncProductRule(doc, req)
    return doc
}

export const disableProductInboundInternalLinks: CollectionAfterDeleteHook<
    ProductDocument
> = async ({ doc, req }) => {
    await disableManagedRule(req, doc.id)
    return doc
}