'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Product } from '@/payload-types'

const MAX_WISHLIST_ITEMS = 100

type PayloadProductId = string | number

function normalizeProductIds(
    productIds: string[],
): PayloadProductId[] {
    if (!Array.isArray(productIds)) {
        return []
    }

    const uniqueIds = Array.from(
        new Set(
            productIds
                .map((productId) =>
                    String(productId).trim(),
                )
                .filter(Boolean),
        ),
    ).slice(0, MAX_WISHLIST_ITEMS)

    return uniqueIds.map((productId) => {
        /**
         * Nếu ID chỉ gồm số thì chuyển thành number.
         * UUID hoặc ID dạng chuỗi được giữ nguyên.
         */
        if (/^\d+$/.test(productId)) {
            const numericId = Number(productId)

            if (Number.isSafeInteger(numericId)) {
                return numericId
            }
        }

        return productId
    })
}

export async function getWishlistProducts(
    productIds: string[],
): Promise<Product[]> {
    const normalizedIds =
        normalizeProductIds(productIds)

    if (normalizedIds.length === 0) {
        return []
    }

    const payload = await getPayload({
        config: configPromise,
    })

    const result = await payload.find({
        collection: 'products',

        where: {
            and: [
                {
                    id: {
                        in: normalizedIds,
                    },
                },
                {
                    status: {
                        equals: 'published',
                    },
                },
            ],
        },

        depth: 1,
        select: {
            id: true,
            title: true,
            slug: true,
            sku: true,
            brand: true,
            price: true,
            images: true,
            averageRating: true,
            reviewCount: true,
            status: true,
            productType: true,
            variants: {
                id: true,
                name: true,
                sku: true,
                basePrice: true,
                salePrice: true,
                stock: true,
                isActive: true,
                isDefault: true,
                image: true,
            },
        },
        limit: normalizedIds.length,
        overrideAccess: true,
    })

    const positionById = new Map(
        normalizedIds.map(
            (productId, index) => [
                String(productId),
                index,
            ],
        ),
    )

    return [...result.docs].sort(
        (firstProduct, secondProduct) => {
            const firstPosition =
                positionById.get(
                    String(firstProduct.id),
                ) ?? Number.MAX_SAFE_INTEGER

            const secondPosition =
                positionById.get(
                    String(secondProduct.id),
                ) ?? Number.MAX_SAFE_INTEGER

            return firstPosition - secondPosition
        },
    )
}