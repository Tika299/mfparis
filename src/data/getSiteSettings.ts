import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import type { SiteSetting } from '@/payload-types'

const SITE_SETTINGS_CACHE_TAG = 'site-settings'

const getCachedSiteSettings = unstable_cache(
    async (): Promise<SiteSetting> => {
        const payload = await getPayload({
            config: configPromise,
        })

        return payload.findGlobal({
            slug: 'site-settings',
            depth: 1,
        })
    },
    ['mfparis-site-settings-v1'],
    {
        revalidate: 300,
        tags: [SITE_SETTINGS_CACHE_TAG],
    },
)

export const getSiteSettings = cache(
    async (): Promise<SiteSetting> => {
        return getCachedSiteSettings()
    },
)