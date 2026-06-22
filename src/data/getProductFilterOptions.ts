import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

import type { FilterItem } from '@/components/search-filters/search-filters.types'

const PRODUCTS_CACHE_TAG = 'products'
const BRANDS_CACHE_TAG = 'brands'
const CATEGORIES_CACHE_TAG = 'categories'

type RelationshipID = string | number

type FacetCountMap = Record<string, number>

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function getRelationshipID(
    value: unknown,
): RelationshipID | null {
    if (
        typeof value === 'string' ||
        typeof value === 'number'
    ) {
        return value
    }

    if (!isRecord(value)) {
        return null
    }

    const id = value.id

    if (
        typeof id === 'string' ||
        typeof id === 'number'
    ) {
        return id
    }

    return null
}

function incrementCount(
    countMap: FacetCountMap,
    id: RelationshipID,
) {
    const key = String(id)

    countMap[key] =
        (countMap[key] ?? 0) + 1
}

export const getProductFilterOptions =
    unstable_cache(
        async (): Promise<{
            brands: FilterItem[]
            categories: FilterItem[]
        }> => {
            const payload = await getPayload({
                config: configPromise,
            })

            const [
                brandsResult,
                categoriesResult,
                productRelationsResult,
            ] = await Promise.all([
                payload.find({
                    collection: 'brands',
                    depth: 0,
                    pagination: false,
                    overrideAccess: true,
                    sort: 'name',
                }),

                payload.find({
                    collection: 'categories',
                    depth: 0,
                    pagination: false,
                    overrideAccess: true,
                    sort: 'name',
                }),

                payload.find({
                    collection: 'products',
                    depth: 0,
                    pagination: false,
                    overrideAccess: true,

                    where: {
                        status: {
                            equals: 'published',
                        },
                    },

                    select: {
                        brand: true,
                        categories: true,
                    },
                }),
            ])

            const brandCounts: FacetCountMap = {}
            const categoryCounts: FacetCountMap = {}

            for (
                const product of
                productRelationsResult.docs
            ) {
                const brandID =
                    getRelationshipID(product.brand)

                if (brandID !== null) {
                    incrementCount(
                        brandCounts,
                        brandID,
                    )
                }

                if (
                    !Array.isArray(
                        product.categories,
                    )
                ) {
                    continue
                }

                /*
                 * Set ngăn một category bị cộng hai lần
                 * trong cùng một sản phẩm.
                 */
                const uniqueCategoryIDs =
                    new Set<RelationshipID>()

                for (
                    const category of
                    product.categories
                ) {
                    const categoryID =
                        getRelationshipID(category)

                    if (categoryID !== null) {
                        uniqueCategoryIDs.add(
                            categoryID,
                        )
                    }
                }

                for (
                    const categoryID of
                    uniqueCategoryIDs
                ) {
                    incrementCount(
                        categoryCounts,
                        categoryID,
                    )
                }
            }

            const brands: FilterItem[] =
                brandsResult.docs.map(
                    (brand) => ({
                        id: brand.id,
                        name: brand.name,
                        slug: brand.slug,
                        count:
                            brandCounts[
                            String(brand.id)
                            ] ?? 0,
                    }),
                )

            const categories: FilterItem[] =
                categoriesResult.docs.map(
                    (category) => ({
                        id: category.id,
                        name: category.name,
                        slug: category.slug,
                        count:
                            categoryCounts[
                            String(category.id)
                            ] ?? 0,
                    }),
                )

            return {
                brands,
                categories,
            }
        },
        ['mfparis-product-filter-options-v3'],
        {
            revalidate: 300,
            tags: [
                PRODUCTS_CACHE_TAG,
                BRANDS_CACHE_TAG,
                CATEGORIES_CACHE_TAG,
            ],
        },
    )