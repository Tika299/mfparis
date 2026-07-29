import type { Payload } from 'payload'
import type { InternalLinkRule } from './types'

export async function loadActiveInternalLinkRules(
    payload: Payload,
): Promise<InternalLinkRule[]> {
    const result = await payload.find({
        collection: 'internal-link-rules' as any,
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
        where: {
            enabled: {
                equals: true,
            },
        },
    })

    return result.docs as unknown as InternalLinkRule[]
}