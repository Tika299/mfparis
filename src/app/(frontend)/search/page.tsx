import type { Metadata } from 'next'
import type { Where } from 'payload'

import configPromise from '@payload-config'
import { ChevronLeft, ChevronRight, SearchIcon, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { JsonLd } from '@/components/JsonLd'
import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/search-filters/SearchFilters'
import { getProductFilterOptions } from '@/data/getProductFilterOptions'
import { buildCollectionPageSchemaGraph } from '@/lib/structured-data'
import {
  addStringFilterCondition,
  appendAdvancedProductWhereConditions,
  appendAdvancedSearchParams,
  getFirstSearchParam,
  getSearchParamValues,
  normalizeProductSort,
  parseNonNegativeNumber,
  parsePositiveInteger,
} from '@/lib/productSearchFilters'
import { cn } from '@/utilities'

type SearchPageParams = Readonly<Record<string, string | string[] | undefined>>

type SearchPageProps = {
  searchParams: Promise<SearchPageParams>
}

type PaginationItem = number | 'ellipsis'

const SEARCH_PATHNAME = '/search'
const SEARCH_PER_PAGE = 12

function getSearchPath(query: string): string {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return SEARCH_PATHNAME
  }

  return `${SEARCH_PATHNAME}?q=${encodeURIComponent(normalizedQuery)}`
}

function appendSearchParamValues(
  searchParams: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  for (const value of values) {
    searchParams.append(key, value)
  }
}

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    )
  }

  const pages = new Set<number>([1, totalPages])

  for (
    let page = currentPage - 1;
    page <= currentPage + 1;
    page += 1
  ) {
    if (page > 1 && page < totalPages) {
      pages.add(page)
    }
  }

  const sortedPages = Array.from(pages).sort(
    (left, right) => left - right,
  )

  const result: PaginationItem[] = []

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1]

    if (
      previousPage !== undefined &&
      page - previousPage > 1
    ) {
      result.push('ellipsis')
    }

    result.push(page)
  })

  return result
}

function buildSearchWhere(
  searchParams: SearchPageParams,
): Where {
  const query = getFirstSearchParam(searchParams, 'q') || ''
  const brandValues = getSearchParamValues(searchParams, 'brand')
  const categoryValues = getSearchParamValues(searchParams, 'category')
  const minPrice = parseNonNegativeNumber(getFirstSearchParam(searchParams, 'min'))
  const maxPrice = parseNonNegativeNumber(getFirstSearchParam(searchParams, 'max'))

  const andConditions: Where[] = [
    {
      status: {
        equals: 'published',
      },
    },
  ]

  if (query) {
    const normalizedQuery = normalizeSearchText(query)
    const normalizedSlugQuery = normalizedQuery.replace(/\s+/g, '-')

    andConditions.push({
      or: [
        { searchKeywords: { contains: normalizedQuery } },
        { title: { contains: query } },
        { title: { contains: normalizedQuery } },
        { slug: { contains: normalizedSlugQuery } },
        { sku: { contains: query } },
      ],
    })
  }

  addStringFilterCondition(andConditions, 'brand.slug', brandValues)
  addStringFilterCondition(andConditions, 'categories.slug', categoryValues)

  if (minPrice !== null) {
    andConditions.push({
      'price.basePrice': {
        greater_than_equal: minPrice,
      },
    })
  }

  if (maxPrice !== null) {
    andConditions.push({
      'price.basePrice': {
        less_than_equal: maxPrice,
      },
    })
  }

  appendAdvancedProductWhereConditions(andConditions, searchParams)

  return {
    and: andConditions,
  }
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const query = getFirstSearchParam(resolvedSearchParams, 'q') || ''
  const title = query
    ? `Tìm kiếm "${query}" | MF Paris`
    : 'Tìm kiếm sản phẩm | MF Paris'
  const description = query
    ? `Kết quả tìm kiếm sản phẩm chính hãng cho "${query}" tại MF Paris.`
    : 'Tìm kiếm nước hoa, mỹ phẩm và sản phẩm chính hãng tại MF Paris.'

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: getSearchPath(query),
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MF Paris',
      title,
      description,
      url: getSearchPath(query),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const query = getFirstSearchParam(resolvedSearchParams, 'q') || ''
  const requestedPage = parsePositiveInteger(
    getFirstSearchParam(resolvedSearchParams, 'page'),
    1,
  )
  const sort = normalizeProductSort(getFirstSearchParam(resolvedSearchParams, 'sort'))
  const brandValues = getSearchParamValues(resolvedSearchParams, 'brand')
  const categoryValues = getSearchParamValues(resolvedSearchParams, 'category')
  const minPrice = parseNonNegativeNumber(getFirstSearchParam(resolvedSearchParams, 'min'))
  const maxPrice = parseNonNegativeNumber(getFirstSearchParam(resolvedSearchParams, 'max'))

  const payload = await getPayload({ config: configPromise })

  const [productsRes, filterOptions] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: SEARCH_PER_PAGE,
      page: requestedPage,
      where: buildSearchWhere(resolvedSearchParams),
      sort,
      depth: 1,
      select: {
        id: true,
        title: true,
        slug: true,
        sku: true,
        brand: true,
        categories: true,
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

  if (
    requestedPage > 1 &&
    productsRes.docs.length === 0
  ) {
    notFound()
  }

  const currentPage = productsRes.page ?? requestedPage
  const totalPages = Math.max(productsRes.totalPages ?? 1, 1)
  const fromItem =
    productsRes.totalDocs > 0
      ? (currentPage - 1) * SEARCH_PER_PAGE + 1
      : 0
  const toItem = Math.min(
    currentPage * SEARCH_PER_PAGE,
    productsRes.totalDocs,
  )
  const paginationItems = getPaginationItems(currentPage, totalPages)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages
  const baseSearchPath = SEARCH_PATHNAME
  const clearFiltersHref = query ? getSearchPath(query) : SEARCH_PATHNAME
  const pageTitle = query
    ? `Kết quả tìm kiếm "${query}"`
    : 'Tìm kiếm sản phẩm'
  const pageDescription = query
    ? `Các sản phẩm phù hợp với từ khóa "${query}" tại MF Paris.`
    : 'Nhập từ khóa hoặc dùng bộ lọc để tìm nước hoa, mỹ phẩm và sản phẩm chính hãng tại MF Paris.'

  const createPageUrl = (pageNumber: number): string => {
    const pageSearchParams = new URLSearchParams()

    if (query) {
      pageSearchParams.set('q', query)
    }

    appendSearchParamValues(pageSearchParams, 'brand', brandValues)
    appendSearchParamValues(pageSearchParams, 'category', categoryValues)

    if (minPrice !== null) {
      pageSearchParams.set('min', String(minPrice))
    }

    if (maxPrice !== null) {
      pageSearchParams.set('max', String(maxPrice))
    }

    if (sort !== '-createdAt') {
      pageSearchParams.set('sort', sort)
    }

    appendAdvancedSearchParams(
      pageSearchParams,
      resolvedSearchParams,
    )

    if (pageNumber > 1) {
      pageSearchParams.set('page', String(pageNumber))
    }

    const queryString = pageSearchParams.toString()

    return queryString
      ? `${baseSearchPath}?${queryString}`
      : baseSearchPath
  }

  const schemaGraph = buildCollectionPageSchemaGraph({
    page: {
      url: createPageUrl(currentPage),
      name: pageTitle,
      description: pageDescription,
      breadcrumb: [
        {
          name: 'Trang chủ',
          url: '/',
        },
        {
          name: 'Tìm kiếm',
          url: baseSearchPath,
        },
      ],
      items: productsRes.docs.map((product) => ({
        name: product.title,
        url: `/products/${product.slug}`,
      })),
    },
  })

  const filterRouteContext = {
    type: 'search' as const,
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-20">
      <JsonLd data={schemaGraph} />

      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-8 md:py-12">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#B72828]/60">
            MF Paris Search
          </p>

          <h1 className="text-2xl font-black uppercase tracking-wider text-neutral-900 md:text-4xl">
            {pageTitle}
          </h1>

          <p className="mt-2 text-xs text-gray-400 md:text-sm">
            Hiển thị{' '}
            <span className="font-bold text-black">
              {fromItem} - {toItem}
            </span>{' '}
            trên tổng số{' '}
            <span className="font-bold text-black">
              {productsRes.totalDocs}
            </span>{' '}
            sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-6 md:mt-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="hidden lg:block lg:w-[250px] lg:shrink-0">
            <div className="lc-card rounded-2xl bg-white shadow-sm">
              <SearchFilters
                brands={filterOptions.brands}
                categories={filterOptions.categories}
                facets={filterOptions.facets}
                resultCount={productsRes.totalDocs}
                variant="sidebar"
                sticky={false}
                routeContext={filterRouteContext}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-6 hidden md:block lg:hidden">
              <div className="sticky top-20 z-40 mb-6 hidden md:block lg:hidden">
                <SearchFilters
                  brands={filterOptions.brands}
                  categories={filterOptions.categories}
                  facets={filterOptions.facets}
                  resultCount={productsRes.totalDocs}
                  variant="horizontal"
                  sticky={false}
                  routeContext={filterRouteContext}
                />
              </div>
            </div>

            {productsRes.docs.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
                  {productsRes.docs.map((product) => (
                    <ProductCard
                      key={String(product.id)}
                      product={product}
                      mode="standard"
                      showRating
                      showAddToCart
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-14 flex flex-col items-center gap-4"
                    aria-label="Phân trang kết quả tìm kiếm"
                  >
                    <p className="text-xs font-medium text-neutral-400">
                      Trang{' '}
                      <span className="font-bold text-neutral-900">
                        {currentPage}
                      </span>{' '}
                      / {totalPages}
                    </p>

                    <div className="flex max-w-full items-center justify-center gap-1.5 overflow-x-auto rounded-2xl bg-white/70 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur sm:gap-2">
                      {hasPreviousPage ? (
                        <Link
                          href={createPageUrl(currentPage - 1)}
                          aria-label="Trang trước"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-black hover:text-white sm:h-11 sm:w-11"
                        >
                          <ChevronLeft
                            aria-hidden="true"
                            size={18}
                          />
                        </Link>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-neutral-300 sm:h-11 sm:w-11"
                        >
                          <ChevronLeft size={18} />
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {paginationItems.map((item, index) => {
                          if (item === 'ellipsis') {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                aria-hidden="true"
                                className="flex h-10 min-w-8 items-center justify-center text-sm font-bold text-neutral-300 sm:h-11"
                              >
                                ...
                              </span>
                            )
                          }

                          const isCurrentPage = item === currentPage

                          return (
                            <Link
                              key={item}
                              href={createPageUrl(item)}
                              aria-current={isCurrentPage ? 'page' : undefined}
                              aria-label={`Trang ${item}`}
                              className={cn(
                                'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-black transition-all sm:h-11 sm:min-w-11',
                                isCurrentPage
                                  ? 'bg-black text-white shadow-md shadow-black/15'
                                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-black',
                              )}
                            >
                              {item}
                            </Link>
                          )
                        })}
                      </div>

                      {hasNextPage ? (
                        <Link
                          href={createPageUrl(currentPage + 1)}
                          aria-label="Trang sau"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-black hover:text-white sm:h-11 sm:w-11"
                        >
                          <ChevronRight
                            aria-hidden="true"
                            size={18}
                          />
                        </Link>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-neutral-300 sm:h-11 sm:w-11"
                        >
                          <ChevronRight size={18} />
                        </span>
                      )}
                    </div>
                  </nav>
                )}
              </>
            ) : (
              <div className="lc-card flex flex-col items-center rounded-2xl bg-white py-20 text-center md:py-28">
                <SearchIcon size={40} className="mb-4 text-gray-200" />

                <p className="text-lg font-bold text-neutral-500 md:text-xl">
                  Không tìm thấy sản phẩm phù hợp
                </p>

                <p className="mt-2 max-w-md px-6 text-sm leading-6 text-neutral-400">
                  Hãy thử rút gọn từ khóa hoặc xóa bớt bộ lọc để xem thêm sản phẩm.
                </p>

                <Link
                  href={clearFiltersHref}
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B72828] px-6 text-sm font-bold text-white transition hover:bg-[#951F1F]"
                >
                  <X aria-hidden="true" size={15} />
                  Xóa bộ lọc
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters
          brands={filterOptions.brands}
          categories={filterOptions.categories}
          facets={filterOptions.facets}
          resultCount={productsRes.totalDocs}
          variant="mobile-fab"
          routeContext={filterRouteContext}
        />
      </div>
    </div>
  )
}
