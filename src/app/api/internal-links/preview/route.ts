import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'

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

        return NextResponse.json(result)
    } catch (error) {
        console.error('[internal-links-preview]', error)

        return NextResponse.json(
            { error: 'Cannot preview internal links' },
            { status: 500 },
        )
    }
}