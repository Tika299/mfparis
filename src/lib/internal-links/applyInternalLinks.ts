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
}

export async function applyInternalLinksForRender({
    html,
    currentUrl,
    scope,
    disabled,
    maxLinksOverride,
    excludeKeywords,
    payload,
}: ApplyForRenderInput): Promise<ApplyInternalLinksResult> {
    const resolvedPayload =
        payload ||
        (await getPayload({
            config: configPromise,
        }))

    const [settings, rules] = await Promise.all([
        getSiteSettings(),
        loadActiveInternalLinkRules(resolvedPayload),
    ])

    return applyInternalLinksToHtml({
        html,
        currentUrl,
        scope,
        rules,
        settings: settings.internalLinking,
        disabled:
            disabled ||
            settings.internalLinking?.enabled !== true ||
            settings.internalLinking?.previewOnly === true,
        maxLinksOverride,
        excludeKeywords,
    } satisfies ApplyInternalLinksInput)
}