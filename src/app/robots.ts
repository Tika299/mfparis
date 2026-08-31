import type { MetadataRoute } from 'next'

import { SITE_ORIGIN } from '@/utilities/seo'

const PRIVATE_ROUTE_SEGMENTS = [
    '/admin',
    '/api/admin',
    '/api/cart',
    '/api/chat',
    '/api/create-order',
    '/api/graphql',
    '/api/graphql-playground',
    '/api/internal',
    '/api/payments',
    '/api/store',
    '/api/vouchers',
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

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: [...AI_SEARCH_USER_AGENTS],
                allow: '/',
                disallow: [...PRIVATE_ROUTE_SEGMENTS],
            },
            {
                userAgent: '*',
                allow: '/',
                disallow: [...PRIVATE_ROUTE_SEGMENTS],
            },
        ],
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    }
}