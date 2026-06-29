import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { SITE_ORIGIN } from '@/utilities/seo'
import type { Media, Product } from '@/payload-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GOOGLE_PRODUCT_CATEGORY =
    'Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne'

type FeedItem = {
    id: string
    itemGroupId?: string
    title: string
    description: string
    link: string
    imageLink: string
    availability: 'in_stock' | 'out_of_stock'
    price: number
    brand: string
    size?: string
}

function escapeXml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function normalizeId(value: unknown): string {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function getSimpleProductId(product: Product): string {
    return (
        normalizeId(product.sku) ||
        normalizeId(product.slug) ||
        normalizeId(product.id)
    )
}

function getVariantId(
    product: Product,
    variant: NonNullable<Product['variants']>[number],
): string {
    return (
        normalizeId(variant.sku) ||
        normalizeId(`${product.sku || product.slug}-${variant.name || variant.id}`) ||
        normalizeId(`${product.id}-${variant.id}`)
    )
}

function getItemGroupId(product: Product): string {
    return (
        normalizeId(product.sku) ||
        normalizeId(product.slug) ||
        normalizeId(product.id)
    )
}

function getAvailability(
    stock: unknown,
    seoStatus: Product['seoStatus'],
): 'in_stock' | 'out_of_stock' {
    if (seoStatus === 'temporarily_out_of_stock') {
        return 'out_of_stock'
    }

    return Number(stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'
}

function extractSize(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const match = value.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|mL|ML|g|gr|gram)\b/u)

    return match?.[0]?.replace(/\s+/g, '').replace(',', '.')
}

function getVariantSize(
    variant: NonNullable<Product['variants']>[number],
): string | undefined {
    const fromName = extractSize(variant.name)

    if (fromName) {
        return fromName
    }

    if (Array.isArray(variant.optionValues)) {
        for (const optionValue of variant.optionValues) {
            if (!optionValue || typeof optionValue !== 'object') {
                continue
            }

            const record = optionValue as unknown as Record<string, unknown>

            const size =
                extractSize(record.name) ||
                extractSize(record.label) ||
                extractSize(record.value) ||
                extractSize(record.textValue) ||
                extractSize(record.slug)

            if (size) {
                return size
            }
        }
    }

    return undefined
}

function getEffectivePrice(
    basePrice: unknown,
    salePrice: unknown,
): number | null {
    const normalizedBasePrice = Number(basePrice ?? 0)
    const normalizedSalePrice = Number(salePrice ?? 0)

    if (
        normalizedSalePrice > 0 &&
        normalizedBasePrice > 0 &&
        normalizedSalePrice < normalizedBasePrice
    ) {
        return Math.floor(normalizedSalePrice)
    }

    return normalizedBasePrice > 0 ? Math.floor(normalizedBasePrice) : null
}

function stripHtml(value: unknown): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getRichTextPlainText(value: unknown): string {
    const texts: string[] = []

    function walk(node: unknown): void {
        if (!node || typeof node !== 'object') {
            return
        }

        const record = node as Record<string, unknown>

        if (typeof record.text === 'string') {
            texts.push(record.text)
        }

        if (Array.isArray(record.children)) {
            record.children.forEach(walk)
        }
    }

    walk(value)

    return texts.join(' ').replace(/\s+/g, ' ').trim()
}

function getProductDescription(product: Product): string {
    return (
        stripHtml(product.seoDescription) ||
        stripHtml(product.shortDescription) ||
        getRichTextPlainText(product.description) ||
        `Sản phẩm ${product.title} chính hãng tại MF Paris.`
    ).slice(0, 5000)
}

function getBrandName(product: Product): string {
    if (
        product.brand &&
        typeof product.brand === 'object' &&
        typeof product.brand.name === 'string'
    ) {
        return product.brand.name
    }

    return 'MF Paris'
}

function getMediaUrl(media: unknown): string {
    if (!media || typeof media !== 'object') {
        return ''
    }

    const value = media as Media

    const url =
        value.sizes?.card?.url ||
        value.url ||
        value.sizes?.thumbnail?.url ||
        ''

    return url ? new URL(url, SITE_ORIGIN).toString() : ''
}

function getProductImage(product: Product): string {
    const firstImage = product.images?.[0]?.image

    return firstImage && typeof firstImage === 'object'
        ? getMediaUrl(firstImage)
        : ''
}

function shouldIncludeProduct(product: Product): boolean {
    return (
        product.status === 'published' &&
        Boolean(product.slug) &&
        product.seoStatus !== 'discontinued_keep_page' &&
        product.seoStatus !== 'discontinued_redirect'
    )
}

function productToFeedItems(product: Product): FeedItem[] {
    const description = getProductDescription(product)
    const brand = getBrandName(product)
    const link = new URL(`/products/${product.slug}`, SITE_ORIGIN).toString()
    const productImage = getProductImage(product)

    if (!productImage) {
        return []
    }

    if (
        product.productType === 'variable' &&
        Array.isArray(product.variants)
    ) {
        const items: FeedItem[] = []

        for (const variant of product.variants) {
            if (variant?.isActive === false) {
                continue
            }

            const price = getEffectivePrice(variant.basePrice, variant.salePrice)

            if (!price) {
                continue
            }

            const variantImage =
                variant.image && typeof variant.image === 'object'
                    ? getMediaUrl(variant.image)
                    : productImage

            items.push({
                id: getVariantId(product, variant),
                itemGroupId: getItemGroupId(product),
                title: variant.name
                    ? `${product.title} - ${variant.name}`
                    : product.title,
                description,
                link,
                imageLink: variantImage || productImage,
                availability: getAvailability(variant.stock, product.seoStatus),
                price,
                brand,
                size: getVariantSize(variant),
            })
        }

        return items
    }

    const price = getEffectivePrice(
        product.price?.basePrice,
        product.price?.salePrice,
    )

    if (!price) {
        return []
    }

    return [
        {
            id: getSimpleProductId(product),
            title: product.title,
            description,
            link,
            imageLink: productImage,
            availability: getAvailability(product.price?.stock, product.seoStatus),
            price,
            brand,
        },
    ]
}

function renderItem(item: FeedItem): string {
    return `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      ${item.itemGroupId
            ? `<g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`
            : ''
        }
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
      <g:availability>${item.availability}</g:availability>
      <g:price>${item.price} VND</g:price>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:google_product_category>${escapeXml(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>
      ${item.size ? `<g:size>${escapeXml(item.size)}</g:size>` : ''}
      <g:condition>new</g:condition>
    </item>`
}

export async function GET(): Promise<NextResponse> {
    const payload = await getPayload({
        config: configPromise,
    })

    const result = await payload.find({
        collection: 'products',
        depth: 2,
        limit: 10000,
        pagination: false,
        overrideAccess: true,
        where: {
            status: {
                equals: 'published',
            },
        },
    })

    const items = result.docs
        .filter(shouldIncludeProduct)
        .flatMap(productToFeedItems)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MF Paris Product Feed</title>
    <link>${escapeXml(SITE_ORIGIN)}</link>
    <description>Google Merchant Center feed for MF Paris</description>
    ${items.map(renderItem).join('')}
  </channel>
</rss>`

    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    })
}