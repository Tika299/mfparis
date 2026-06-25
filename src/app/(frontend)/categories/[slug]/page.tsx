import type { Metadata } from 'next'
import type { Where } from 'payload'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProductCard } from '@/components/ProductCard'
import { RichText } from '@/components/RichText'
import { SearchFilters } from '@/components/search-filters/SearchFilters'
import { getProductFilterOptions } from '@/data/getProductFilterOptions'
import { SITE_ORIGIN } from '@/utilities/seo'

const PRODUCTS_PER_PAGE = 20
const DEFAULT_SORT = '-createdAt'

const ALLOWED_SORT_VALUES = new Set([
  '-createdAt',
  'price.basePrice',
  '-price.basePrice',
  'title',
])

type CategoryPageProps = {
  params: Promise<{
    slug: string
  }>

  searchParams: Promise<{
    page?: string
    brand?: string
    min?: string
    max?: string
    sort?: string
  }>
}

type RelationshipMedia =
  | number
  | {
    url?: string | null
  }
  | null
  | undefined

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    SITE_ORIGIN
  )
}

async function getCategoryBySlug(slug: string) {
  const payload = await getPayload({
    config: configPromise,
  })

  const categoryRes = await payload.find({
    collection: 'categories',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    pagination: false,
    depth: 2,
  })

  return categoryRes.docs[0] ?? null
}

function extractPlainTextFromRichText(
  value: unknown,
): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const visit = (node: unknown): string[] => {
    if (!node || typeof node !== 'object') {
      return []
    }

    const record = node as Record<
      string,
      unknown
    >

    const parts: string[] = []

    if (typeof record.text === 'string') {
      const text = record.text.trim()

      if (text) {
        parts.push(text)
      }
    }

    if (Array.isArray(record.children)) {
      for (const child of record.children) {
        parts.push(...visit(child))
      }
    }

    return parts
  }

  const text = visit(value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

function truncateText(
  value: string,
  maxLength: number,
): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value
    .slice(0, maxLength - 1)
    .trim()}…`
}

function getCategoryDescription(
  category: {
    name?: string | null
    description?: unknown
  },
): string {
  const description =
    extractPlainTextFromRichText(
      category.description,
    )

  if (description) {
    return truncateText(description, 160)
  }

  return `Khám phá danh mục ${category.name ?? 'sản phẩm'} chính hãng tại MF Paris.`
}

function getMediaUrl(
  media: RelationshipMedia,
): string | undefined {
  if (!media || typeof media !== 'object') {
    return undefined
  }

  if (
    typeof media.url !== 'string' ||
    !media.url.trim()
  ) {
    return undefined
  }

  try {
    return new URL(
      media.url,
      getSiteUrl(),
    ).toString()
  } catch {
    return undefined
  }
}

export async function generateMetadata({
  params,
}: Pick<
  CategoryPageProps,
  'params'
>): Promise<Metadata> {
  const { slug } = await params

  const category =
    await getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Danh mục không tồn tại | MF Paris',
      description:
        'Danh mục bạn đang tìm kiếm hiện không tồn tại tại MF Paris.',
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const title = `${category.name} | MF Paris`
  const description =
    getCategoryDescription(category)
  const canonicalUrl = `/categories/${encodeURIComponent(
    slug,
  )}`
  const imageUrl = getMediaUrl(
    category.image,
  )

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: canonicalUrl,
      siteName: 'MF Paris',
      title,
      description,
      images: imageUrl
        ? [
          {
            url: imageUrl,
            alt: category.name,
          },
        ]
        : undefined,
    },
    twitter: {
      card: imageUrl
        ? 'summary_large_image'
        : 'summary',
      title,
      description,
      images: imageUrl
        ? [imageUrl]
        : undefined,
    },
  }
}

function hasRichTextContent(content: unknown): boolean {
  if (
    !content ||
    typeof content !== 'object' ||
    !('root' in content)
  ) {
    return false
  }

  const root = content.root

  if (
    !root ||
    typeof root !== 'object' ||
    !('children' in root)
  ) {
    return false
  }

  return (
    Array.isArray(root.children) &&
    root.children.length > 0
  )
}

function normalizePage(value?: string): number {
  const parsedPage = Number(value)

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1
  ) {
    return 1
  }

  return parsedPage
}

function normalizePrice(value?: string): number | null {
  if (!value) return null

  const parsedValue = Number(value)

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return null
  }

  return parsedValue
}

function normalizeSort(value?: string): string {
  if (
    value &&
    ALLOWED_SORT_VALUES.has(value)
  ) {
    return value
  }

  return DEFAULT_SORT
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params

  const {
    page,
    brand,
    min,
    max,
    sort: requestedSort,
  } = await searchParams

  const currentPage = normalizePage(page)
  const minimumPrice = normalizePrice(min)
  const maximumPrice = normalizePrice(max)
  const sort = normalizeSort(requestedSort)

  const payload = await getPayload({
    config: configPromise,
  })

  /*
   * Bước 1: Tìm category hiện tại bằng slug.
   */
  const categoryRes = await payload.find({
    collection: 'categories',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    pagination: false,
    depth: 2,
  })

  const currentCategory = categoryRes.docs[0]

  if (!currentCategory) {
    notFound()
  }

  /*
   * Bước 2: Tạo điều kiện lấy sản phẩm.
   */
  const andConditions: Where[] = [
    {
      status: {
        equals: 'published',
      },
    },
    {
      categories: {
        contains: currentCategory.id,
      },
    },
  ]

  if (brand) {
    andConditions.push({
      'brand.slug': {
        equals: brand,
      },
    })
  }

  if (minimumPrice !== null) {
    andConditions.push({
      'price.basePrice': {
        greater_than_equal: minimumPrice,
      },
    })
  }

  if (maximumPrice !== null) {
    andConditions.push({
      'price.basePrice': {
        less_than_equal: maximumPrice,
      },
    })
  }

  const whereQueries: Where = {
    and: andConditions,
  }

  const [
    productsRes,
    filterOptions,
  ] = await Promise.all([
    payload.find({
      collection: 'products',
      where: whereQueries,
      sort,
      limit: PRODUCTS_PER_PAGE,
      page: currentPage,
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
    }),

    getProductFilterOptions(),
  ])

  const totalPages =
    productsRes.totalPages || 1

  const totalDocs =
    productsRes.totalDocs || 0

  const hasDescription =
    hasRichTextContent(
      currentCategory.description,
    )

  /*
   * Giữ nguyên filter khi người dùng chuyển trang.
   */
  const buildPageHref = (
    pageNumber: number,
  ): string => {
    const query = new URLSearchParams()

    if (brand) {
      query.set('brand', brand)
    }

    if (minimumPrice !== null) {
      query.set(
        'min',
        String(minimumPrice),
      )
    }

    if (maximumPrice !== null) {
      query.set(
        'max',
        String(maximumPrice),
      )
    }

    if (sort !== DEFAULT_SORT) {
      query.set('sort', sort)
    }

    if (pageNumber > 1) {
      query.set(
        'page',
        String(pageNumber),
      )
    }

    const queryString = query.toString()

    return queryString
      ? `/categories/${encodeURIComponent(
        slug,
      )}?${queryString}`
      : `/categories/${encodeURIComponent(
        slug,
      )}`
  }

  const visiblePages = Array.from(
    {
      length: totalPages,
    },
    (_, index) => index + 1,
  ).filter((pageNumber) => {
    return (
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(
        pageNumber - currentPage,
      ) <= 2
    )
  })

  /*
   * Route context được dùng chung cho cả 3 phiên bản
   * SearchFilters.
   */
  const filterRouteContext = {
    type: 'category' as const,
    slug,
    clearPath: '/products',
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl lg:text-4xl">
            {currentCategory.name}
          </h1>

          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            {totalDocs.toLocaleString(
              'vi-VN',
            )}{' '}
            sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        {/* Tablet */}
        <div className="sticky top-28 z-40 mb-5 hidden md:block lg:hidden">
          <SearchFilters
            brands={filterOptions.brands}
            categories={filterOptions.categories}
            variant="horizontal"
            sticky={false}
            routeContext={
              filterRouteContext
            }
          />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          {/* Desktop */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:w-[250px] lg:shrink-0 lg:self-start lg:overflow-y-auto">
            <div className="lc-card rounded-2xl p-5">
              <SearchFilters
                brands={filterOptions.brands}
                categories={filterOptions.categories}
                variant="sidebar"
                sticky={false}
                routeContext={
                  filterRouteContext
                }
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {productsRes.docs.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
                  {productsRes.docs.map(
                    (product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                      />
                    ),
                  )}
                </div>

                {totalPages > 1 && (
                  <nav
                    aria-label="Phân trang sản phẩm"
                    className="mt-10 flex flex-wrap items-center justify-center gap-2"
                  >
                    {productsRes.hasPrevPage && (
                      <Link
                        href={buildPageHref(
                          currentPage - 1,
                        )}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        Trước
                      </Link>
                    )}

                    {visiblePages.map(
                      (
                        pageNumber,
                        index,
                      ) => {
                        const previousPage =
                          visiblePages[
                          index - 1
                          ]

                        const showDots =
                          previousPage &&
                          pageNumber -
                          previousPage >
                          1

                        return (
                          <div
                            key={
                              pageNumber
                            }
                            className="flex items-center gap-2"
                          >
                            {showDots && (
                              <span className="px-1 text-sm font-bold text-gray-400">
                                …
                              </span>
                            )}

                            <Link
                              href={buildPageHref(
                                pageNumber,
                              )}
                              aria-current={
                                pageNumber ===
                                  currentPage
                                  ? 'page'
                                  : undefined
                              }
                              className={
                                pageNumber ===
                                  currentPage
                                  ? 'rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm'
                                  : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50'
                              }
                            >
                              {pageNumber}
                            </Link>
                          </div>
                        )
                      },
                    )}

                    {productsRes.hasNextPage && (
                      <Link
                        href={buildPageHref(
                          currentPage + 1,
                        )}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        Sau
                      </Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="lc-card rounded-2xl py-16 text-center md:py-24">
                <p className="text-lg font-bold md:text-xl">
                  Chưa có sản phẩm phù
                  hợp với bộ lọc hiện tại.
                </p>
              </div>
            )}

            {hasDescription &&
              currentCategory.description && (
                <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                  <h2 className="mb-4 text-xl font-bold md:text-2xl">
                    Giới thiệu về{' '}
                    {
                      currentCategory.name
                    }
                  </h2>

                  <div className="category-description prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
                    <RichText
                      data={
                        currentCategory.description
                      }
                      showToc
                      expandable
                      maxHeight={1200}
                    />
                  </div>
                </section>
              )}
          </main>
        </div>
      </div>

      {/* Mobile */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters
          brands={filterOptions.brands}
          categories={filterOptions.categories}
          variant="mobile-fab"
          routeContext={
            filterRouteContext
          }
        />
      </div>
    </div>
  )
}