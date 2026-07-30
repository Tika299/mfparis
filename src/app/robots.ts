import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/utilities/seo'

const PRIVATE_ROUTE_SEGMENTS = [
    '/admin',
    '/api',
    '/cart',
    '/checkout',
    '/fundiin',
    '/my-route',
    '/test-fragrance-profile',
    '/test-filter',
    '/tai-ung-dung',
    '/wishlist',
] as const satisfies readonly string[]

const AI_SEARCH_USER_AGENTS = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
] as const satisfies readonly string[]

function createPrivateDisallowRules(routes: readonly string[]): string[] {
    return routes.flatMap((route) => [
        `${route}$`,
        `${route}?*`,
        `${route}/*`,
    ])
}

export default function robots(): MetadataRoute.Robots {
    const privateDisallowRules = createPrivateDisallowRules(
        PRIVATE_ROUTE_SEGMENTS,
    )

    return {
        rules: [
            {
                userAgent: [...AI_SEARCH_USER_AGENTS],
                allow: '/',
                disallow: privateDisallowRules,
            },
            {
                userAgent: '*',
                allow: '/',
                disallow: privateDisallowRules,
            },
        ],
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
        host: SITE_ORIGIN,
    }
}
