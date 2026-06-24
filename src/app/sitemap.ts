import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { SITE_ORIGIN } from '@/utilities/seo'

const STATIC_ROUTES = [
    {
        url: SITE_ORIGIN,
        changeFrequency: 'daily',
        priority: 1.0,
    },
    {
        url: `${SITE_ORIGIN}/about`,
        changeFrequency: 'monthly',
        priority: 0.7,
    },
    {
        url: `${SITE_ORIGIN}/blog`,
        changeFrequency: 'daily',
        priority: 0.7,
    },
    {
        url: `${SITE_ORIGIN}/products`,
        changeFrequency: 'daily',
        priority: 0.9,
    },
    {
        url: `${SITE_ORIGIN}/categories`,
        changeFrequency: 'weekly',
        priority: 0.8,
    },
    {
        url: `${SITE_ORIGIN}/brands`,
        changeFrequency: 'weekly',
        priority: 0.8,
    },
] as const satisfies ReadonlyArray<{
    url: string
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
    priority: number
}>

function toAbsoluteUrl(pathname: string): string {
    return new URL(pathname, SITE_ORIGIN).toString()
}

function toValidLastModified(
    value: unknown,
): Date | string {
    if (typeof value === 'string' || value instanceof Date) {
        return value
    }

    return new Date()
}

function hasUsableSlug(
    value: unknown,
): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const payload = await getPayload({
        config: configPromise,
    })

    const [productsRes, categoriesRes, brandsRes, postsRes] = await Promise.all([
        payload.find({
            collection: 'products',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            where: {
                status: {
                    equals: 'published',
                },
            },
            select: {
                slug: true,
                updatedAt: true,
            },
        }),
        payload.find({
            collection: 'categories',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            select: {
                slug: true,
                updatedAt: true,
            },
        }),
        payload.find({
            collection: 'brands',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            select: {
                slug: true,
                updatedAt: true,
            },
        }),
        payload.find({
            collection: 'posts',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            select: {
                slug: true,
                updatedAt: true,
            },
        }),
    ])

    const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
        url: route.url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }))

    const productEntries: MetadataRoute.Sitemap = productsRes.docs
        .filter((product) => hasUsableSlug(product.slug))
        .map((product) => ({
            url: toAbsoluteUrl(`/products/${product.slug}`),
            lastModified: toValidLastModified(product.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.8,
        }))

    const categoryEntries: MetadataRoute.Sitemap = categoriesRes.docs
        .filter((category) => hasUsableSlug(category.slug))
        .map((category) => ({
            url: toAbsoluteUrl(`/categories/${category.slug}`),
            lastModified: toValidLastModified(category.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.7,
        }))

    const brandEntries: MetadataRoute.Sitemap = brandsRes.docs
        .filter((brand) => hasUsableSlug(brand.slug))
        .map((brand) => ({
            url: toAbsoluteUrl(`/brands/${brand.slug}`),
            lastModified: toValidLastModified(brand.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.7,
        }))

    const blogEntries: MetadataRoute.Sitemap = postsRes.docs
        .filter((post) => hasUsableSlug(post.slug))
        .map((post) => ({
            url: toAbsoluteUrl(`/blog/${post.slug}`),
            lastModified: toValidLastModified(post.updatedAt),
            changeFrequency: 'monthly',
            priority: 0.6,
        }))

    return [
        ...staticEntries,
        ...productEntries,
        ...categoryEntries,
        ...brandEntries,
        ...blogEntries,
    ]
}