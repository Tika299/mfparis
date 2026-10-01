import type {
    CollectionAfterChangeHook,
    CollectionAfterDeleteHook,
} from 'payload'

import { normalizeVietnameseText } from '@/lib/internal-links/normalizeVietnamese'
import type { InternalLinkScope } from '@/lib/internal-links/types'

type BrandInboundLinkKeyword = {
    keyword?: null | string
}

type BrandInboundLinkSettings = {
    enabled?: boolean | null
    keywords?: null | BrandInboundLinkKeyword[]
    scope?: InternalLinkScope[] | null
    maxInsertionsPerPage?: number | null
}

type BrandDocument = {
    id: number | string
    name?: null | string
    slug?: null | string
    inboundInternalLinks?: null | BrandInboundLinkSettings
}

const MANAGED_KEY_PREFIX = 'brand:'

const VALID_SCOPES = new Set<InternalLinkScope>([
    'posts',
    'products',
    'categories',
    'brands',
    'post-categories',
])

function getManagedKey(brandId: number | string): string {
    return `${MANAGED_KEY_PREFIX}${brandId}`
}

function getKeywords(
    input: BrandInboundLinkSettings['keywords'],
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
    input: BrandInboundLinkSettings['scope'],
): InternalLinkScope[] {
    if (!Array.isArray(input)) return ['posts']

    const scopes = input.filter(
        (scope): scope is InternalLinkScope => VALID_SCOPES.has(scope),
    )

    return scopes.length > 0 ? scopes : ['posts']
}

function getMaxInsertions(
    input: BrandInboundLinkSettings['maxInsertionsPerPage'],
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
    brandId: number | string,
): Promise<void> {
    const existing = await findManagedRule(req, getManagedKey(brandId))

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

async function syncBrandRule(
    doc: BrandDocument,
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
        title: `Auto link: ${doc.name?.trim() || `Brand #${doc.id}`}`,
        enabled: true,
        priority: 'brand',
        keywords,
        targetType: 'brand',
        targetUrl: `/brands/${encodeURIComponent(slug)}`,
        scope: getScopes(settings.scope),
        maxInsertionsPerPage: getMaxInsertions(
            settings.maxInsertionsPerPage,
        ),
        managedBy: 'brand',
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

export const syncBrandInboundInternalLinks: CollectionAfterChangeHook<
    BrandDocument
> = async ({ doc, req }) => {
    await syncBrandRule(doc, req)
    return doc
}

export const disableBrandInboundInternalLinks: CollectionAfterDeleteHook<
    BrandDocument
> = async ({ doc, req }) => {
    await disableManagedRule(req, doc.id)
    return doc
}