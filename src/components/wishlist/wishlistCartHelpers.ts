import type {
    Media,
    Product,
} from '@/payload-types'

import type {
    CartItem,
    CartVariant,
} from '@/lib/store'

type ProductVariant =
    NonNullable<
        Product['variants']
    >[number]

type MediaRelationship =
    | number
    | Media
    | null
    | undefined

function getImageUrl(
    media: MediaRelationship,
): string {
    if (
        !media ||
        typeof media !== 'object'
    ) {
        return ''
    }

    return (
        media.sizes?.card?.url ??
        media.url ??
        media.sizes?.thumbnail?.url ??
        ''
    )
}

function getEffectivePrice(
    basePriceValue:
        | number
        | null
        | undefined,
    salePriceValue:
        | number
        | null
        | undefined,
): number {
    const basePrice = Number(
        basePriceValue ?? 0,
    )

    const salePrice = Number(
        salePriceValue ?? 0,
    )

    const hasSale =
        basePrice > 0 &&
        salePrice > 0 &&
        salePrice < basePrice

    return hasSale
        ? salePrice
        : basePrice
}

function getVariantId(
    variant: ProductVariant,
    index: number,
): string {
    if (
        typeof variant.id === 'string' &&
        variant.id.trim()
    ) {
        return variant.id.trim()
    }

    if (variant.sku?.trim()) {
        return `sku-${variant.sku.trim()}`
    }

    if (variant.name?.trim()) {
        return `name-${encodeURIComponent(
            variant.name.trim(),
        )}`
    }

    return `variant-${index + 1}`
}

function getActiveVariants(
    product: Product,
): ProductVariant[] {
    if (
        product.productType !==
        'variable' ||
        !Array.isArray(product.variants)
    ) {
        return []
    }

    return product.variants.filter(
        (variant) =>
            variant.isActive !== false,
    )
}

/**
 * Trả về null khi:
 * - Sản phẩm hết hàng.
 * - Không có biến thể còn hàng.
 * - Giá bằng 0 / cần liên hệ.
 */
export function productToCartItem(
    product: Product,
): CartItem | null {
    const productId = String(
        product.id,
    )

    const fallbackImage =
        getImageUrl(
            product.images?.[0]?.image,
        ) || '/placeholder.webp'

    const activeVariants =
        getActiveVariants(product)

    if (
        product.productType ===
        'variable' &&
        activeVariants.length > 0
    ) {
        const selectedVariant =
            activeVariants.find(
                (variant) =>
                    variant.isDefault === true &&
                    Number(
                        variant.stock ?? 0,
                    ) > 0,
            ) ??
            activeVariants.find(
                (variant) =>
                    Number(
                        variant.stock ?? 0,
                    ) > 0,
            )

        if (!selectedVariant) {
            return null
        }

        const selectedIndex =
            activeVariants.indexOf(
                selectedVariant,
            )

        const variantId =
            getVariantId(
                selectedVariant,
                selectedIndex,
            )

        const stock = Number(
            selectedVariant.stock ?? 0,
        )

        const price =
            getEffectivePrice(
                selectedVariant.basePrice,
                selectedVariant.salePrice,
            )

        if (
            stock <= 0 ||
            price <= 0
        ) {
            return null
        }

        const variantName =
            selectedVariant.name?.trim() ||
            'Phân loại mặc định'

        const image =
            fallbackImage

        const cartVariants:
            CartVariant[] =
            activeVariants.map(
                (variant, index) => {
                    const variantBasePrice =
                        Number(
                            variant.basePrice ?? 0,
                        )

                    const variantSalePrice =
                        Number(
                            variant.salePrice ?? 0,
                        )

                    return {
                        id: getVariantId(
                            variant,
                            index,
                        ),

                        name:
                            variant.name?.trim() ||
                            `Phân loại ${index + 1}`,

                        sku:
                            variant.sku ??
                            undefined,

                        basePrice:
                            variantBasePrice,

                        salePrice:
                            variantSalePrice,

                        price:
                            getEffectivePrice(
                                variantBasePrice,
                                variantSalePrice,
                            ),

                        stock: Number(
                            variant.stock ?? 0,
                        ),

                        image:
                            fallbackImage,
                    }
                },
            )

        return {
            id: `${productId}:${variantId}`,

            productId,
            variantId,
            variantName,

            baseTitle: product.title,
            title: `${product.title} - ${variantName}`,

            price,
            image,
            slug: product.slug,
            quantity: 1,

            sku:
                selectedVariant.sku ??
                undefined,

            stock,
            variants: cartVariants,
        }
    }

    const stock = Number(
        product.price?.stock ?? 0,
    )

    const price =
        getEffectivePrice(
            product.price?.basePrice,
            product.price?.salePrice,
        )

    if (
        stock <= 0 ||
        price <= 0
    ) {
        return null
    }

    return {
        id: productId,

        productId,
        variantId: undefined,
        variantName: undefined,

        baseTitle: product.title,
        title: product.title,

        price,
        image: fallbackImage,
        slug: product.slug,
        quantity: 1,

        sku:
            product.sku ??
            undefined,

        stock,
        variants: [],
    }
}

export function getWishlistProductPrice(
    product: Product,
): number {
    const cartItem =
        productToCartItem(product)

    return cartItem?.price ?? 0
}
