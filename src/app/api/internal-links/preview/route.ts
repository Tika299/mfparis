import { NextResponse } from 'next/server'

import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'
import { recordInternalLinkPreview } from '@/lib/internal-links/logPreview'
import {
  createInternalLinkRuleFromSuggestion,
  suggestInternalLinkRules,
  type InternalLinkSuggestion,
  type InternalLinkSuggestionSource,
} from '@/lib/internal-links/suggestRules'
import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'

type PreviewBody = {
  collection: 'posts' | 'products' | 'categories' | 'brands' | 'post-categories'
  currentUrl?: string
  html?: string
  id: string | number
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
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const body = (await req.json()) as PreviewBody

    if (!body.collection || !body.id) {
      return NextResponse.json({ error: 'Missing collection or id' }, { status: 400 })
    }

    const payload = auth.payload
    const doc = await payload.findByID({
      collection: body.collection as any,
      depth: 1,
      id: body.id,
    })

    const htmlField = getHtmlField(body.collection)
    const html = body.html ?? doc?.[htmlField] ?? ''
    const currentUrl = body.currentUrl || (doc?.slug ? `/${body.collection}/${doc.slug}/` : '/')
    const internalLinkingConfig = getInternalLinkingConfig(doc)

    const result = await applyInternalLinksForRender({
      html,
      currentUrl,
      forcePreview: true,
      payload,
      scope: getScope(body.collection),
      ...internalLinkingConfig,
    })

    const sourceTitle =
      typeof doc?.title === 'string'
        ? doc.title
        : typeof doc?.name === 'string'
          ? doc.name
          : null

    const logResult = await recordInternalLinkPreview({
      payload,
      result,
      sourceId: body.id,
      sourceTitle,
      sourceType: getScope(body.collection),
      sourceUrl: currentUrl,
    })

    return NextResponse.json({
      ...result,
      log: logResult,
    })
  } catch (error) {
    console.error('[internal-links-preview]', error)

    return NextResponse.json({ error: 'Cannot preview internal links' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const url = new URL(req.url)
    const payload = auth.payload
    const sourceType = (url.searchParams.get('sourceType') || 'all') as
      | InternalLinkSuggestionSource
      | 'all'
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get('limit') || 500) || 500),
      2000,
    )
    const includeExisting = url.searchParams.get('includeExisting') === 'true'

    const suggestions = await suggestInternalLinkRules({
      payload,
      includeExisting,
      limit,
      sourceType,
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
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const body = (await req.json()) as {
      enabled?: boolean
      suggestions?: InternalLinkSuggestion[]
    }
    const suggestions = Array.isArray(body.suggestions) ? body.suggestions : []
    const enabled = body.enabled === true

    if (suggestions.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing suggestions' }, { status: 400 })
    }

    const created = []

    for (const suggestion of suggestions.slice(0, 50)) {
      const rule = await createInternalLinkRuleFromSuggestion(auth.payload, suggestion, { enabled })
      created.push(rule)
    }

    return NextResponse.json({
      success: true,
      created,
      createdCount: created.length,
    })
  } catch (error) {
    console.error('[internal-links-create-suggestions]', error)

    return NextResponse.json(
      { success: false, error: 'Cannot create internal link rules' },
      { status: 500 },
    )
  }
}
