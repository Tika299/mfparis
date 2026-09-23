import type { Payload } from 'payload'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getSiteSettings } from '@/data/getSiteSettings'
import { loadActiveInternalLinkRules } from './loadRules'
import { applyInternalLinksToHtml } from './htmlLinkInjector'
import type {
    ApplyInternalLinksInput,
    ApplyInternalLinksResult,
    InternalLinkScope,
} from './types'

type ApplyForRenderInput = {
    html: unknown
    currentUrl: string
    scope: InternalLinkScope
    disabled?: boolean
    maxLinksOverride?: number | null
    excludeKeywords?: string[]
    payload?: Payload
    forcePreview?: boolean
}

export async function applyInternalLinksForRender({
    html,
    currentUrl,
    scope,
    disabled,
    maxLinksOverride,
    excludeKeywords,
    payload,
    forcePreview,
}: ApplyForRenderInput): Promise<ApplyInternalLinksResult> {
    const resolvedPayload =
        payload ||
        (await getPayload({
            config: configPromise,
        }))

    const startedAt = performance.now()

    const [settings, rules] = await Promise.all([
        getSiteSettings(),
        loadActiveInternalLinkRules(resolvedPayload),
    ])

    const loadedAt = performance.now()

    const result = applyInternalLinksToHtml({
        collectDiagnostics: forcePreview === true,
        html,
        currentUrl,
        scope,
        rules,
        settings: settings.internalLinking,
        disabled:
            disabled ||
            settings.internalLinking?.enabled !== true ||
            (settings.internalLinking?.previewOnly === true && !forcePreview),
        maxLinksOverride,
        excludeKeywords,
    } satisfies ApplyInternalLinksInput)

    const finishedAt = performance.now()

    if (process.env.DEBUG_INTERNAL_LINK_PERF === 'true') {
        console.log('[INTERNAL LINK PERF]', JSON.stringify({
            url: currentUrl,
            rules: rules.length,
            htmlCharacters: typeof html === 'string' ? html.length : null,
            loadMs: Math.round(loadedAt - startedAt),
            injectMs: Math.round(finishedAt - loadedAt),
            totalMs: Math.round(finishedAt - startedAt),
        }))
    }

    return result
}
