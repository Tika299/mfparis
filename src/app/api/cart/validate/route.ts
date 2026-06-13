import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const { items } = await req.json()

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                items: [],
                invalidItems: [],
            })
        }

        const payload = await getPayload({ config: configPromise })

        const checkedItems = []

        for (const item of items) {
            const productId = item.productId || item.id
            const variantId = item.variantId || null
            const quantity = Number(item.quantity || 1)

            try {
                const product: any = await payload.findByID({
                    collection: 'products',
                    id: productId,
                    depth: 1,
                })

                if (!product) {
                    checkedItems.push({
                        ...item,
                        latestStock: 0,
                        latestPrice: Number(item.price || 0),
                        isAvailable: false,
                        reason: 'Sản phẩm không còn tồn tại',
                    })
                    continue
                }

                const latestVariants = Array.isArray(product?.variants)
                    ? product.variants
                        .filter((variant: any) => variant?.isActive !== false)
                        .map((variant: any) => {
                            const basePrice = Number(variant?.basePrice || variant?.price || 0)
                            const salePrice = Number(variant?.salePrice || 0)

                            return {
                                id: variant.id,
                                name: variant.name,
                                sku: variant.sku,
                                basePrice,
                                salePrice,
                                price: salePrice > 0 ? salePrice : basePrice,
                                stock: Number(variant?.stock || 0),
                                image: variant?.image?.url || '',
                            }
                        })
                    : []

                let latestStock = 0
                let latestPrice = 0
                let latestTitle = product.title
                let latestImage = item.image
                let latestSku = product.sku || item.sku

                if (variantId) {
                    const variant = product.variants?.find(
                        (variant: any) => String(variant.id) === String(variantId),
                    )

                    if (!variant || variant?.isActive === false) {
                        checkedItems.push({
                            ...item,
                            latestStock: 0,
                            latestPrice: Number(item.price || 0),
                            isAvailable: false,
                            reason: 'Phân loại đã ngừng bán',
                        })
                        continue
                    }

                    const basePrice = Number(variant?.basePrice || variant?.price || 0)
                    const salePrice = Number(variant?.salePrice || 0)

                    latestStock = Number(variant?.stock || 0)
                    latestPrice = salePrice > 0 ? salePrice : basePrice
                    latestTitle = `${product.title} - ${variant.name}`
                    latestSku = variant.sku || product.sku || item.sku

                    if (variant?.image?.url) {
                        latestImage = variant.image.url
                    }
                } else {
                    const basePrice = Number(product?.price?.basePrice || 0)
                    const salePrice = Number(product?.price?.salePrice || 0)

                    latestStock = Number(product?.price?.stock || 0)
                    latestPrice = salePrice > 0 ? salePrice : basePrice

                    if (product?.images?.[0]?.image?.url) {
                        latestImage = product.images[0].image.url
                    }
                }

                const isOutOfStock = latestStock <= 0
                const isOverStock = quantity > latestStock
                const isContactPrice = latestPrice <= 0

                checkedItems.push({
                    ...item,

                    productId,
                    variantId,

                    title: latestTitle,
                    baseTitle: product.title,
                    price: latestPrice,
                    image: latestImage,
                    sku: latestSku,
                    slug: product.slug,

                    stock: latestStock,
                    latestStock,
                    latestPrice,

                    quantity: isOutOfStock ? quantity : Math.min(quantity, latestStock),

                    variants: latestVariants,
                    isAvailable: !isOutOfStock && !isContactPrice,
                    isOutOfStock,
                    isOverStock,
                    isContactPrice,

                    reason: isOutOfStock
                        ? 'Sản phẩm đã hết hàng'
                        : isContactPrice
                            ? 'Sản phẩm cần liên hệ để báo giá'
                            : isOverStock
                                ? `Chỉ còn ${latestStock} sản phẩm`
                                : null,
                })
            } catch {
                checkedItems.push({
                    ...item,
                    latestStock: 0,
                    isAvailable: false,
                    reason: 'Không thể kiểm tra tồn kho',
                })
            }
        }

        const invalidItems = checkedItems.filter(
            (item) =>
                item.isOutOfStock ||
                item.isOverStock ||
                item.isContactPrice ||
                item.isAvailable === false,
        )

        return NextResponse.json({
            items: checkedItems,
            invalidItems,
        })
    } catch (error: any) {
        console.error('CART VALIDATE ERROR:', error)

        return NextResponse.json(
            {
                error: error?.message || 'Không thể kiểm tra giỏ hàng',
            },
            { status: 500 },
        )
    }
}