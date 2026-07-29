import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'
import { recordInternalLinkPreview } from '@/lib/internal-links/logPreview'
import {
    createInternalLinkRuleFromSuggestion,
    suggestInternalLinkRules,
    type InternalLinkSuggestion,
    type InternalLinkSuggestionSource,
} from '@/lib/internal-links/suggestRules'


type PreviewBody = {
    collection: 'posts' | 'products' | 'categories' | 'brands' | 'post-categories'
    id: string | number
    html?: string
    currentUrl?: string
}

function getHtmlField(collection: PreviewBody['collection']) {
    if (collection === 'posts') return 'content'
    if (collection === 'products') return 'description'
    return 'description'
}

function getScope(collection: PreviewBody['collection']) {
    return collection
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as PreviewBody

        if (!body.collection || !body.id) {
            return NextResponse.json(
                { error: 'Missing collection or id' },
                { status: 400 },
            )
        }

        const payload = await getPayload({ config: configPromise })

        const doc = await payload.findByID({
            collection: body.collection as any,
            id: body.id,
            depth: 1,
        })

        const htmlField = getHtmlField(body.collection)
        const html = body.html ?? doc?.[htmlField] ?? ''

        const currentUrl =
            body.currentUrl ||
            (doc?.slug ? `/${body.collection}/${doc.slug}/` : '/')

        const internalLinkingConfig = getInternalLinkingConfig(doc)

        const result = await applyInternalLinksForRender({
            html,
            currentUrl,
            scope: getScope(body.collection),
            payload,
            ...internalLinkingConfig,
            forcePreview: true,
        })

        const sourceTitle =
            typeof doc?.title === 'string'
                ? doc.title
                : typeof doc?.name === 'string'
                    ? doc.name
                    : null

        const logResult = await recordInternalLinkPreview({
            payload,
            sourceType: getScope(body.collection),
            sourceId: body.id,
            sourceTitle,
            sourceUrl: currentUrl,
            result,
        })

        return NextResponse.json({
            ...result,
            log: logResult,
        })
    } catch (error) {
        console.error('[internal-links-preview]', error)

        return NextResponse.json(
            { error: 'Cannot preview internal links' },
            { status: 500 },
        )
    }
}


export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const payload = await getPayload({ config: configPromise })

        const sourceType =
            (url.searchParams.get('sourceType') || 'all') as
            | InternalLinkSuggestionSource
            | 'all'

        const limit = Number(url.searchParams.get('limit') || 80)
        const includeExisting = url.searchParams.get('includeExisting') === 'true'

        const suggestions = await suggestInternalLinkRules({
            payload,
            sourceType,
            limit,
            includeExisting,
        })

        return NextResponse.json({
            success: true,
            suggestions,
        })
    } catch (error) {
        console.error('[internal-links-suggestions]', error)

        return NextResponse.json(
            { success: false, error: 'Cannot load internal link suggestions' },
            { status: 500 },
        )
    }
}

export async function PUT(req: Request) {
    try {
        const body = (await req.json()) as {
            suggestions?: InternalLinkSuggestion[]
        }

        const suggestions = Array.isArray(body.suggestions) ? body.suggestions : []

        if (suggestions.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing suggestions' },
                { status: 400 },
            )
        }

        const payload = await getPayload({ config: configPromise })

        const created = []

        for (const suggestion of suggestions.slice(0, 50)) {
            const rule = await createInternalLinkRuleFromSuggestion(payload, suggestion)
            created.push(rule)
        }

        return NextResponse.json({
            success: true,
            createdCount: created.length,
            created,
        })
    } catch (error) {
        console.error('[internal-links-create-suggestions]', error)

        return NextResponse.json(
            { success: false, error: 'Cannot create internal link rules' },
            { status: 500 },
        )
    }
}