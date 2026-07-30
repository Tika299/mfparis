import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { SITE_ORIGIN } from '@/utilities/seo'

export const revalidate = 3600

const CACHE_HEADERS = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
}

function absoluteUrl(pathname: string): string {
    return new URL(pathname, SITE_ORIGIN).toString()
}

function cleanText(value: unknown): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
}

function hasSlug(value: unknown): value is { slug: string } {
    return (
        Boolean(value) &&
        typeof value === 'object' &&
        typeof (value as { slug?: unknown }).slug === 'string' &&
        (value as { slug: string }).slug.trim().length > 0
    )
}

function markdownLink(title: unknown, pathname: string): string {
    const label = cleanText(title) || pathname
    return `- [${label}](${absoluteUrl(pathname)})`
}

export async function GET() {
    const payload = await getPayload({ config: configPromise })

    const [products, categories, brands, posts, postCategories] = await Promise.all([
        payload.find({
            collection: 'products',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            sort: '-updatedAt',
            where: {
                status: {
                    equals: 'published',
                },
            },
            select: {
                title: true,
                slug: true,
            },
        }),
        payload.find({
            collection: 'categories',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            sort: 'name',
            select: {
                name: true,
                slug: true,
            },
        }),
        payload.find({
            collection: 'brands',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            sort: 'name',
            select: {
                name: true,
                slug: true,
            },
        }),
        payload.find({
            collection: 'posts',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            sort: '-updatedAt',
            select: {
                title: true,
                slug: true,
            },
        }),
        payload.find({
            collection: 'post-categories',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            sort: 'title',
            select: {
                title: true,
                slug: true,
            },
        }),
    ])

    const lines = [
        '# Marais de France / MF Paris - Full Public Content Index',
        '',
        '## Core Pages',
        markdownLink('Trang chu', '/'),
        markdownLink('Tat ca san pham', '/products'),
        markdownLink('Danh muc san pham', '/categories'),
        markdownLink('Thuong hieu', '/brands'),
        markdownLink('Blog', '/blog'),
        markdownLink('Lien he', '/contact'),
        markdownLink('Gioi thieu', '/about'),
        markdownLink('He thong cua hang', '/he-thong-cua-hang'),
        markdownLink('Huong dan mua hang', '/huong-dan-mua-hang'),
        markdownLink('Cau hoi thuong gap', '/cau-hoi-thuong-gap'),
        markdownLink('Chinh sach kiem hang', '/chinh-sach-kiem-hang'),
        '',
        '## Product Categories',
        ...categories.docs
            .filter(hasSlug)
            .map((category) => markdownLink((category as { name?: string }).name, `/categories/${category.slug}`)),
        '',
        '## Brands',
        ...brands.docs
            .filter(hasSlug)
            .map((brand) => markdownLink((brand as { name?: string }).name, `/brands/${brand.slug}`)),
        '',
        '## Products',
        ...products.docs
            .filter(hasSlug)
            .map((product) => markdownLink((product as { title?: string }).title, `/products/${product.slug}`)),
        '',
        '## Blog Categories',
        ...postCategories.docs
            .filter(hasSlug)
            .map((category) => markdownLink((category as { title?: string }).title, `/blog/category/${category.slug}`)),
        '',
        '## Articles',
        ...posts.docs
            .filter(hasSlug)
            .map((post) => markdownLink((post as { title?: string }).title, `/blog/${post.slug}`)),
        '',
    ]

    return new Response(lines.join('\n'), {
        headers: CACHE_HEADERS,
    })
}
