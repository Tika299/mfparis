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
import {
  getInternalLinkDocumentUrl,
  getInternalLinkPreviewField,
  isInternalLinkPreviewCollection,
  type InternalLinkPreviewCollection,
} from '@/lib/internal-links/previewFields'

type PreviewBody = {
  collection: InternalLinkPreviewCollection
  currentUrl?: string
  html?: string
  id: string | number
  field?: string
}

function getScope(collection: PreviewBody['collection']) {
  return collection
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const body = (await req.json()) as PreviewBody

    if (
      !isInternalLinkPreviewCollection(body.collection) ||
      body.id === undefined ||
      body.id === null ||
      body.id === ''
    ) {
      return NextResponse.json(
        { error: 'Invalid collection or missing id' },
        { status: 400 },
      )
    }

    if (typeof body.field !== 'string') {
      return NextResponse.json(
        { error: 'Missing preview field' },
        { status: 400 },
      )
    }

    const selectedField = getInternalLinkPreviewField(
      body.collection,
      body.field,
    )

    if (!selectedField) {
      return NextResponse.json(
        { error: 'Invalid preview field for this collection' },
        { status: 400 },
      )
    }

    const payload = auth.payload
    const doc = await payload.findByID({
      collection: body.collection,
      depth: 1,
      id: body.id,
    })
    const previewDoc = doc as unknown as Record<string, unknown>

    const htmlField = selectedField.name
    const html = body.html ?? previewDoc[htmlField] ?? ''
    const currentUrl =
      body.currentUrl ||
      (typeof previewDoc.slug === 'string'
        ? getInternalLinkDocumentUrl(body.collection, previewDoc.slug)
        : '/')
    const internalLinkingConfig = getInternalLinkingConfig(previewDoc)

    const result = await applyInternalLinksForRender({
      html,
      currentUrl,
      forcePreview: true,
      payload,
      scope: getScope(body.collection),
      ...internalLinkingConfig,
    })

    const sourceTitle =
      typeof previewDoc.title === 'string'
        ? previewDoc.title
        : typeof previewDoc.name === 'string'
          ? previewDoc.name
          : null

    const logResult = await recordInternalLinkPreview({
      payload,
      result,
      sourceId: body.id,
      sourceTitle,
      sourceType: getScope(body.collection),
      sourceUrl: currentUrl,
      sourceField: selectedField.name,
      sourceFieldLabel: selectedField.label,
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
