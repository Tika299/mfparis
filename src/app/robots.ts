import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/utilities/seo'

const DISALLOWED_ROUTE_SEGMENTS = [
    '/admin',
    '/api',
    '/cart',
    '/checkout',
    '/fundiin',
    '/my-route',
    '/test-fragrance-profile',
    '/test-filter',
    '/tra-cuu-don-hang',
    '/tai-ung-dung',
    '/wishlist',
] as const satisfies readonly string[]

const DISALLOWED_QUERY_PARAMETERS = [
    'q',
    'sort',
    'min',
    'max',
    'price',
    'minPrice',
    'maxPrice',
    'min_price',
    'max_price',
    'price_min',
    'price_max',
] as const satisfies readonly string[]

function createRouteDisallowRules(routes: readonly string[]): string[] {
    return routes.flatMap((route) => [
        `${route}$`,
        `${route}?*`,
        `${route}/*`,
    ])
}

function createQueryParameterDisallowRules(
    parameters: readonly string[],
): string[] {
    return parameters.flatMap((parameter) => [
        `/*?${parameter}=*`,
        `/*?*&${parameter}=*`,
    ])
}

export default function robots(): MetadataRoute.Robots {
    const disallowRules = [
        ...createRouteDisallowRules(DISALLOWED_ROUTE_SEGMENTS),
        ...createQueryParameterDisallowRules(DISALLOWED_QUERY_PARAMETERS),
    ]

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: disallowRules,
        },
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    }
}