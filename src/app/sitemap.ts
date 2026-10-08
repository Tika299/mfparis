import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { SITE_ORIGIN } from '@/utilities/seo'
import {
    buildIndexableFacetPath,
} from '@/lib/indexableCategoryFacets'

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
    {
        url: `${SITE_ORIGIN}/contact`,
        changeFrequency: 'monthly',
        priority: 0.7,
    },
    {
        url: `${SITE_ORIGIN}/chinh-sach-doi-tra`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/chinh-sach-van-chuyen`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/chinh-sach-bao-mat`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/dieu-khoan-su-dung`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/phuong-thuc-thanh-toan`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/vouchers`,
        changeFrequency: 'weekly',
        priority: 0.55,
    },
    {
        url: `${SITE_ORIGIN}/he-thong-cua-hang`,
        changeFrequency: 'monthly',
        priority: 0.6,
    },
    {
        url: `${SITE_ORIGIN}/huong-dan-mua-hang`,
        changeFrequency: 'monthly',
        priority: 0.55,
    },
    {
        url: `${SITE_ORIGIN}/cau-hoi-thuong-gap`,
        changeFrequency: 'monthly',
        priority: 0.55,
    },
    {
        url: `${SITE_ORIGIN}/chinh-sach-kiem-hang`,
        changeFrequency: 'monthly',
        priority: 0.55,
    },
    {
        url: `${SITE_ORIGIN}/cam-ket-chinh-hang`,
        changeFrequency: 'monthly',
        priority: 0.55,
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function getRelationshipID(value: unknown): string | null {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
    }

    if (isRecord(value) && (typeof value.id === 'string' || typeof value.id === 'number')) {
        return String(value.id)
    }

    return null
}

function shouldIncludeSeoPage(doc: {
    seo?: Record<string, unknown> | null
    seoStatus?: string | null
    slug?: string | null
}): boolean {
    if (!hasUsableSlug(doc.slug)) {
        return false
    }

    if (doc.seo?.sitemapInclude === false) {
        return false
    }

    if (doc.seo?.robotsIndex === 'noindex') {
        return false
    }

    if (doc.seoStatus === 'discontinued_keep_page') {
        return false
    }

    return true
}

function shouldIncludeTaxonomyPage(doc: {
    redirectStatus?: string | null
    seo?: Record<string, unknown> | null
    seoIndex?: string | null
    slug?: string | null
    taxonomyType?: string | null
}): boolean {
    if (!hasUsableSlug(doc.slug)) {
        return false
    }

    if (!shouldIncludeSeoPage(doc)) {
        return false
    }

    if (
        [
            'noindex',
            'noindex-temporary',
            'noindex-after-move',
        ].includes(String(doc.seoIndex || 'index'))
    ) {
        return false
    }

    if (
        [
            'facet',
            'removed',
            'temporary-node',
        ].includes(String(doc.taxonomyType || 'category'))
    ) {
        return false
    }

    if (
        [
            '301',
            '410-noindex',
            'noindex',
            'keep-noindex',
        ].includes(String(doc.redirectStatus || ''))
    ) {
        return false
    }

    return true
}

function getConfiguredFacetPaths(doc: {
    indexableFacets?: Array<{
        key?: string | null
        value?: string | null
    }> | null
}): string[] {
    if (!Array.isArray(doc.indexableFacets)) {
        return []
    }

    return [...new Set(
        doc.indexableFacets
            .map((facet) => buildIndexableFacetPath(facet?.key, facet?.value))
            .filter((path) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)),
    )]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const payload = await getPayload({
        config: configPromise,
    })

    const [
        productsRes,
        categoriesRes,
        brandsRes,
        postsRes,
        postCategoriesRes,
        attributesRes,
        attributeValuesRes,
    ] = await Promise.all([
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
                seo: true,
                seoStatus: true,
                categories: true,
                productAttributes: true,
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
                seo: true,
                seoIndex: true,
                taxonomyType: true,
                redirectStatus: true,
                indexableFacets: true,
                parent: true,
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
                seo: true,
            },
        }),
        payload.find({
            collection: 'posts',
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
                seo: true,
                status: true,
            },
        }),
        payload.find({
            collection: 'post-categories',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            select: {
                slug: true,
                updatedAt: true,
                seo: true,
                seoIndex: true,
                taxonomyType: true,
                redirectStatus: true,
            },
        }),
        payload.find({
            collection: 'attributes',
            depth: 0,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            where: {
                isActive: { equals: true },
            },
            select: {
                slug: true,
            },
        }),
        payload.find({
            collection: 'attribute-values',
            depth: 0,
            limit: 10000,
            pagination: false,
            overrideAccess: true,
            where: {
                isActive: { equals: true },
            },
            select: {
                attribute: true,
                slug: true,
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
        .filter(shouldIncludeSeoPage)
        .map((product) => ({
            url: toAbsoluteUrl(`/products/${product.slug}`),
            lastModified: toValidLastModified(product.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.8,
        }))

    const categoryEntries: MetadataRoute.Sitemap = categoriesRes.docs
        .filter(shouldIncludeTaxonomyPage)
        .map((category) => ({
            url: toAbsoluteUrl(`/categories/${category.slug}`),
            lastModified: toValidLastModified(category.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.7,
        }))

    const attributeSlugByID = new Map(
        attributesRes.docs
            .filter((attribute) => hasUsableSlug(attribute.slug))
            .map((attribute) => [String(attribute.id), String(attribute.slug).replace(/^pa_/, '')]),
    )
    const valueSlugByID = new Map(
        attributeValuesRes.docs
            .filter((value) => hasUsableSlug(value.slug))
            .map((value) => [String(value.id), String(value.slug)]),
    )
    const parentByCategoryID = new Map(
        categoriesRes.docs.map((category) => [
            String(category.id),
            getRelationshipID(category.parent),
        ]),
    )
    const facetPathsByCategoryID = new Map<string, Set<string>>()

    const addFacetToCategoryAndAncestors = (categoryID: string, facetPath: string) => {
        const visited = new Set<string>()
        let currentCategoryID: string | null = categoryID

        while (currentCategoryID && !visited.has(currentCategoryID)) {
            visited.add(currentCategoryID)
            const values = facetPathsByCategoryID.get(currentCategoryID) ?? new Set<string>()
            values.add(facetPath)
            facetPathsByCategoryID.set(currentCategoryID, values)
            currentCategoryID = parentByCategoryID.get(currentCategoryID) ?? null
        }
    }

    for (const product of productsRes.docs) {
        const facetPaths = new Set<string>()

        for (const row of Array.isArray(product.productAttributes) ? product.productAttributes : []) {
            const attributeID = getRelationshipID(row.attribute)
            const attributeSlug = attributeID ? attributeSlugByID.get(attributeID) : undefined

            if (!attributeSlug) {
                continue
            }

            for (const value of Array.isArray(row.values) ? row.values : []) {
                const valueID = getRelationshipID(value)
                const valueSlug = valueID ? valueSlugByID.get(valueID) : undefined
                const facetPath = valueSlug
                    ? buildIndexableFacetPath(`attr_${attributeSlug}`, valueSlug)
                    : ''

                if (facetPath) {
                    facetPaths.add(facetPath)
                }
            }
        }

        for (const category of Array.isArray(product.categories) ? product.categories : []) {
            const categoryID = getRelationshipID(category)

            if (!categoryID) {
                continue
            }

            for (const facetPath of facetPaths) {
                addFacetToCategoryAndAncestors(categoryID, facetPath)
            }
        }
    }

    const categoryFacetEntries: MetadataRoute.Sitemap = categoriesRes.docs
        .filter(shouldIncludeTaxonomyPage)
        .flatMap((category) => {
            const observedValues = facetPathsByCategoryID.get(String(category.id)) ?? new Set<string>()
            const configuredValues = getConfiguredFacetPaths(category)
            const values = configuredValues.length > 0
                ? configuredValues.filter((value) => observedValues.has(value))
                : [...observedValues].filter((value) => value.startsWith('mua-'))

            return values.map((facetPath) => ({
                url: toAbsoluteUrl(`/categories/${category.slug}/${facetPath}`),
                lastModified: toValidLastModified(category.updatedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.65,
            }))
        })

    const brandEntries: MetadataRoute.Sitemap = brandsRes.docs
        .filter(shouldIncludeSeoPage)
        .map((brand) => ({
            url: toAbsoluteUrl(`/brands/${brand.slug}`),
            lastModified: toValidLastModified(brand.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.7,
        }))

    const blogEntries: MetadataRoute.Sitemap = postsRes.docs
        .filter(shouldIncludeSeoPage)
        .map((post) => ({
            url: toAbsoluteUrl(`/blog/${post.slug}`),
            lastModified: toValidLastModified(post.updatedAt),
            changeFrequency: 'monthly',
            priority: 0.6,
        }))

    const blogCategoryEntries: MetadataRoute.Sitemap = postCategoriesRes.docs
        .filter(shouldIncludeTaxonomyPage)
        .map((category) => ({
            url: toAbsoluteUrl(`/blog/category/${category.slug}`),
            lastModified: toValidLastModified(category.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.55,
        }))

    return [
        ...staticEntries,
        ...productEntries,
        ...categoryEntries,
        ...categoryFacetEntries,
        ...brandEntries,
        ...blogCategoryEntries,
        ...blogEntries,
    ]
}
