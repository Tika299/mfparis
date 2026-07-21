import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { normalizeSearchText } from '@/utilities/searchKeywords'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Suggestion = {
  id: string | number
  type: 'brand' | 'category' | 'product'
  title: string
  subtitle?: string
  href: string
}

function compact(value: unknown, fallback = ''): string {
  return String(value || fallback).replace(/\s+/g, ' ').trim()
}

function productSubtitle(product: any): string {
  const brand =
    product.brand && typeof product.brand === 'object'
      ? compact(product.brand.name)
      : ''
  const price = Number(product.price?.salePrice || product.price?.basePrice || 0)
  const priceLabel = price > 0 ? price.toLocaleString('vi-VN') + 'đ' : ''

  return [brand, priceLabel].filter(Boolean).join(' • ')
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q') || ''
  const query = rawQuery.trim()
  const normalizedQuery = normalizeSearchText(query)
  const slugQuery = normalizedQuery.replace(/\s+/g, '-')

  if (normalizedQuery.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const payload = await getPayload({ config: configPromise })

  const [brands, categories, products] = await Promise.all([
    payload.find({
      collection: 'brands',
      depth: 0,
      limit: 5,
      overrideAccess: true,
      sort: 'name',
      where: {
        or: [
          { name: { contains: query } },
          { name: { contains: normalizedQuery } },
          { slug: { contains: slugQuery } },
        ],
      },
      select: {
        name: true,
        slug: true,
      },
    }),
    payload.find({
      collection: 'categories',
      depth: 0,
      limit: 4,
      overrideAccess: true,
      sort: 'name',
      where: {
        or: [
          { name: { contains: query } },
          { name: { contains: normalizedQuery } },
          { slug: { contains: slugQuery } },
        ],
      },
      select: {
        name: true,
        slug: true,
      },
    }),
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 6,
      overrideAccess: true,
      sort: '-createdAt',
      where: {
        and: [
          { status: { equals: 'published' } },
          {
            or: [
              { searchKeywords: { contains: normalizedQuery } },
              { title: { contains: query } },
              { title: { contains: normalizedQuery } },
              { slug: { contains: slugQuery } },
              { sku: { contains: query } },
            ],
          },
        ],
      },
      select: {
        title: true,
        slug: true,
        sku: true,
        brand: true,
        price: true,
      },
    }),
  ])

  const suggestions: Suggestion[] = [
    ...brands.docs.map((brand: any) => ({
      id: brand.id,
      type: 'brand' as const,
      title: compact(brand.name, brand.slug),
      subtitle: 'Thương hiệu',
      href: '/thuong-hieu/' + encodeURIComponent(brand.slug) + '/san-pham',
    })),
    ...categories.docs.map((category: any) => ({
      id: category.id,
      type: 'category' as const,
      title: compact(category.name, category.slug),
      subtitle: 'Danh mục sản phẩm',
      href: '/categories/' + encodeURIComponent(category.slug),
    })),
    ...products.docs.map((product: any) => ({
      id: product.id,
      type: 'product' as const,
      title: compact(product.title, product.slug),
      subtitle: productSubtitle(product),
      href: '/products/' + encodeURIComponent(product.slug),
    })),
  ]

  return NextResponse.json(
    { suggestions },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    },
  )
}
