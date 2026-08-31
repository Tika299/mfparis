import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import type { InternalLinkRule } from './types'

const getCachedActiveInternalLinkRules = unstable_cache(
    async (): Promise<InternalLinkRule[]> => {
        const payload = await getPayload({
            config: configPromise,
        })

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
    },
    ['mfparis-active-internal-link-rules-v1'],
    {
        revalidate: 300,
        tags: ['internal-link-rules'],
    },
)

export async function loadActiveInternalLinkRules(
    _payload?: Payload,
): Promise<InternalLinkRule[]> {
    return getCachedActiveInternalLinkRules()
}