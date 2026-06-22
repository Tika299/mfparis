import type { Metadata } from 'next'
import type { Where } from 'payload'

import configPromise from '@payload-config'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/search-filters/SearchFilters'
import { cn } from '@/utilities'
import {
  generateCanonicalUrl,
  INDEXABLE_FACET_KEYS,
} from '@/utilities/seo'
import { getProductFilterOptions } from '@/data/getProductFilterOptions'

const PRODUCTS_PATHNAME = '/products'
const PRODUCTS_PER_PAGE = 12
const MAX_PAGE_NUMBER = 10_000
const MAX_FACET_VALUES = 10
const MAX_FACET_VALUE_LENGTH = 100

const PRODUCTS_CACHE_TAG = 'products'
const BRANDS_CACHE_TAG = 'brands'
const CATEGORIES_CACHE_TAG = 'categories'

const DEFAULT_SORT = '-createdAt' as const

const ALLOWED_SORTS = [
  '-createdAt',
  'createdAt',
  'price.basePrice',
  '-price.basePrice',
  'title',
  '-title',
] as const

type ProductSort = (typeof ALLOWED_SORTS)[number]

type SearchParamValue = string | string[] | undefined

type ProductsSearchParams = Readonly<
  Record<string, SearchParamValue>
>

type ProductsPageProps = Readonly<{
  searchParams: Promise<ProductsSearchParams>
}>

type PaginationItem = number | 'ellipsis'

type ProductsQueryInput = Readonly<{
  page: number
  sort: ProductSort
  where: Where
}>

type ProductsSeoContent = Readonly<{
  description: string
  heading: string
  title: string
}>

const INDEXABLE_FACET_KEY_SET: ReadonlySet<string> = new Set(
  INDEXABLE_FACET_KEYS,
)

const getCachedProducts = unstable_cache(
  async ({ page, sort, where }: ProductsQueryInput) => {
    const payload = await getPayload({
      config: configPromise,
    })

    return payload.find({
      collection: 'products',
      depth: 2,
      limit: PRODUCTS_PER_PAGE,
      overrideAccess: true,
      page,
      sort,
      where,
    })
  },
  ['mfparis-products-list-v2'],
  {
    revalidate: 300,
    tags: [
      PRODUCTS_CACHE_TAG,
      BRANDS_CACHE_TAG,
      CATEGORIES_CACHE_TAG,
    ],
  },
)

const getCachedProductFilterOptions = unstable_cache(
  async () => {
    const payload = await getPayload({
      config: configPromise,
    })

    const [brands, categories] = await Promise.all([
      payload.find({
        collection: 'brands',
        depth: 0,
        limit: 500,
        overrideAccess: true,
        pagination: false,
        sort: 'name',
      }),
      payload.find({
        collection: 'categories',
        depth: 0,
        limit: 500,
        overrideAccess: true,
        pagination: false,
        sort: 'name',
      }),
    ])

    return {
      brands,
      categories,
    }
  },
  ['mfparis-product-filter-options-v2'],
  {
    revalidate: 3600,
    tags: [BRANDS_CACHE_TAG, CATEGORIES_CACHE_TAG],
  },
)

function isProductSort(value: string): value is ProductSort {
  return ALLOWED_SORTS.some((allowedSort) => allowedSort === value)
}

function normalizeProductSort(value: string | undefined): ProductSort {
  if (!value || !isProductSort(value)) {
    return DEFAULT_SORT
  }

  return value
}

function hasSearchParamValue(value: SearchParamValue): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0)
  }

  return false
}

function getSearchParamValues(
  searchParams: ProductsSearchParams,
  key: string,
): string[] {
  const rawValue = searchParams[key]

  if (!rawValue) {
    return []
  }

  const values = Array.isArray(rawValue) ? rawValue : [rawValue]

  const normalizedValues = values
    .map((value) => value.trim())
    .filter(
      (value) =>
        value.length > 0 &&
        value.length <= MAX_FACET_VALUE_LENGTH,
    )

  return [...new Set(normalizedValues)]
    .sort((left, right) => left.localeCompare(right, 'vi'))
    .slice(0, MAX_FACET_VALUES)
}

function getFirstSearchParam(
  searchParams: ProductsSearchParams,
  key: string,
): string | undefined {
  return getSearchParamValues(searchParams, key)[0]
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback
  }

  const parsedValue = Number(value)

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > MAX_PAGE_NUMBER
  ) {
    return fallback
  }

  return parsedValue
}

function parseNonNegativeNumber(
  value: string | undefined,
): number | null {
  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null
  }

  return parsedValue
}

function convertToURLSearchParams(
  searchParams: ProductsSearchParams,
): URLSearchParams {
  const urlSearchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      const normalizedValue = value.trim()

      if (normalizedValue.length > 0) {
        urlSearchParams.append(key, normalizedValue)
      }

      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const normalizedValue = item.trim()

        if (normalizedValue.length > 0) {
          urlSearchParams.append(key, normalizedValue)
        }
      }
    }
  }

  return urlSearchParams
}

function containsOnlyIndexableFacetParams(
  searchParams: ProductsSearchParams,
): boolean {
  for (const [key, value] of Object.entries(searchParams)) {
    if (!hasSearchParamValue(value)) {
      continue
    }

    if (!INDEXABLE_FACET_KEY_SET.has(key)) {
      return false
    }
  }

  return true
}

function addStringFilterCondition(
  conditions: Where[],
  fieldPath: string,
  values: readonly string[],
): void {
  if (values.length === 0) {
    return
  }

  if (values.length === 1) {
    const value = values[0]

    if (!value) {
      return
    }

    const condition: Where = {
      [fieldPath]: {
        equals: value,
      },
    }

    conditions.push(condition)
    return
  }

  const condition: Where = {
    [fieldPath]: {
      in: values.join(','),
    },
  }

  conditions.push(condition)
}

function buildProductsWhere({
  brandValues,
  categoryValues,
  genderValues,
  maxPrice,
  minPrice,
  scentValues,
  volumeValues,
}: Readonly<{
  brandValues: readonly string[]
  categoryValues: readonly string[]
  genderValues: readonly string[]
  maxPrice: number | null
  minPrice: number | null
  scentValues: readonly string[]
  volumeValues: readonly string[]
}>): Where {
  const conditions: Where[] = [
    {
      status: {
        equals: 'published',
      },
    },
  ]

  addStringFilterCondition(
    conditions,
    'brand.slug',
    brandValues,
  )

  addStringFilterCondition(
    conditions,
    'categories.slug',
    categoryValues,
  )

  /*
   * Theo schema hiện tại của MF PARIS, các thuộc tính sản phẩm
   * được lưu trong specifications.value.
   *
   * Mỗi nhóm facet được đặt trong một điều kiện AND riêng:
   * sản phẩm phải thỏa volume, scent và gender khi chúng cùng xuất hiện.
   */
  addStringFilterCondition(
    conditions,
    'specifications.value',
    volumeValues,
  )

  addStringFilterCondition(
    conditions,
    'specifications.value',
    scentValues,
  )

  addStringFilterCondition(
    conditions,
    'specifications.value',
    genderValues,
  )

  if (minPrice !== null) {
    conditions.push({
      'price.basePrice': {
        greater_than_equal: minPrice,
      },
    })
  }

  if (maxPrice !== null) {
    conditions.push({
      'price.basePrice': {
        less_than_equal: maxPrice,
      },
    })
  }

  return {
    and: conditions,
  }
}

function humanizeFacetValue(value: string): string {
  const words = value
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0)

  return words
    .map((word) => {
      const firstCharacter = word.charAt(0).toLocaleUpperCase('vi')
      const remainingCharacters = word.slice(1).toLocaleLowerCase('vi')

      return `${firstCharacter}${remainingCharacters}`
    })
    .join(' ')
}

function summarizeFacetValues(
  values: readonly string[],
): string | null {
  if (values.length === 0) {
    return null
  }

  const visibleValues = values
    .slice(0, 2)
    .map(humanizeFacetValue)

  if (values.length <= 2) {
    return visibleValues.join(', ')
  }

  return `${visibleValues.join(', ')} và ${values.length - 2
    } lựa chọn khác`
}

function formatGenderFacet(
  values: readonly string[],
): string | null {
  if (values.length === 0) {
    return null
  }

  const formattedValues = values.map((value) => {
    const normalizedValue = value
      .trim()
      .toLocaleLowerCase('vi')

    if (
      normalizedValue === 'nu' ||
      normalizedValue === 'nữ' ||
      normalizedValue === 'female'
    ) {
      return 'nữ'
    }

    if (
      normalizedValue === 'nam' ||
      normalizedValue === 'male'
    ) {
      return 'nam'
    }

    if (normalizedValue === 'unisex') {
      return 'unisex'
    }

    return humanizeFacetValue(value)
  })

  return formattedValues.join(', ')
}

function buildProductsSeoContent(
  searchParams: ProductsSearchParams,
): ProductsSeoContent {
  const brandLabel = summarizeFacetValues(
    getSearchParamValues(searchParams, 'brand'),
  )

  const volumeLabel = summarizeFacetValues(
    getSearchParamValues(searchParams, 'volume'),
  )

  const scentLabel = summarizeFacetValues(
    getSearchParamValues(searchParams, 'scent'),
  )

  const genderLabel = formatGenderFacet(
    getSearchParamValues(searchParams, 'gender'),
  )

  const headingParts: string[] = []

  if (brandLabel) {
    headingParts.push(brandLabel)
  }

  if (volumeLabel) {
    headingParts.push(volumeLabel)
  }

  if (scentLabel) {
    headingParts.push(`hương ${scentLabel}`)
  }

  if (genderLabel) {
    headingParts.push(`cho ${genderLabel}`)
  }

  if (headingParts.length === 0) {
    return {
      heading: 'Tất cả sản phẩm',
      title:
        'Nước hoa, mỹ phẩm cao cấp chính hãng | MF PARIS',
      description:
        'Khám phá nước hoa, mỹ phẩm và sản phẩm chăm sóc cao cấp chính hãng được tuyển chọn tại MF PARIS.',
    }
  }

  const facetDescription = headingParts.join(' ')
  const heading = `Sản phẩm ${facetDescription}`

  return {
    heading,
    title: `${heading} chính hãng | MF PARIS`,
    description: `Khám phá ${heading.toLocaleLowerCase(
      'vi',
    )} chính hãng tại MF PARIS. Sản phẩm cao cấp, thông tin minh bạch và nhiều lựa chọn phù hợp nhu cầu.`,
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

  const pages = new Set<number>()

  pages.add(1)
  pages.add(totalPages)

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

function appendSearchParamValues(
  searchParams: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  for (const value of values) {
    searchParams.append(key, value)
  }
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const currentSearchParams = convertToURLSearchParams(
    resolvedSearchParams,
  )

  const canonicalUrl = generateCanonicalUrl(
    PRODUCTS_PATHNAME,
    currentSearchParams,
  )

  const seoContent = buildProductsSeoContent(
    resolvedSearchParams,
  )

  const shouldIndex = containsOnlyIndexableFacetParams(
    resolvedSearchParams,
  )

  return {
    title: seoContent.title,
    description: seoContent.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: shouldIndex,
      follow: true,
      googleBot: {
        index: shouldIndex,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MF PARIS',
      title: seoContent.title,
      description: seoContent.description,
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoContent.title,
      description: seoContent.description,
    },
  }
}

export default async function AllProductsPage({
  searchParams,
}: ProductsPageProps) {
  const resolvedSearchParams = await searchParams
  const filterRouteContext = {
    type: 'listing' as const,
  }

  const brandValues = getSearchParamValues(
    resolvedSearchParams,
    'brand',
  )

  const categoryValues = getSearchParamValues(
    resolvedSearchParams,
    'category',
  )

  const volumeValues = getSearchParamValues(
    resolvedSearchParams,
    'volume',
  )

  const scentValues = getSearchParamValues(
    resolvedSearchParams,
    'scent',
  )

  const genderValues = getSearchParamValues(
    resolvedSearchParams,
    'gender',
  )

  const minPrice = parseNonNegativeNumber(
    getFirstSearchParam(resolvedSearchParams, 'min'),
  )

  const maxPrice = parseNonNegativeNumber(
    getFirstSearchParam(resolvedSearchParams, 'max'),
  )

  const requestedPage = parsePositiveInteger(
    getFirstSearchParam(resolvedSearchParams, 'page'),
    1,
  )

  const sort = normalizeProductSort(
    getFirstSearchParam(resolvedSearchParams, 'sort'),
  )

  const productsWhere = buildProductsWhere({
    brandValues,
    categoryValues,
    volumeValues,
    scentValues,
    genderValues,
    minPrice,
    maxPrice,
  })

  const [productsRes, filterOptions] =
    await Promise.all([
      getCachedProducts({
        page: requestedPage,
        sort,
        where: productsWhere,
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
      ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1
      : 0

  const toItem = Math.min(
    currentPage * PRODUCTS_PER_PAGE,
    productsRes.totalDocs,
  )

  const paginationItems = getPaginationItems(
    currentPage,
    totalPages,
  )

  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  const seoContent = buildProductsSeoContent(
    resolvedSearchParams,
  )

  const createPageUrl = (pageNumber: number): string => {
    const pageSearchParams = new URLSearchParams()

    appendSearchParamValues(
      pageSearchParams,
      'brand',
      brandValues,
    )

    appendSearchParamValues(
      pageSearchParams,
      'volume',
      volumeValues,
    )

    appendSearchParamValues(
      pageSearchParams,
      'scent',
      scentValues,
    )

    appendSearchParamValues(
      pageSearchParams,
      'gender',
      genderValues,
    )

    appendSearchParamValues(
      pageSearchParams,
      'category',
      categoryValues,
    )

    if (minPrice !== null) {
      pageSearchParams.set('min', String(minPrice))
    }

    if (maxPrice !== null) {
      pageSearchParams.set('max', String(maxPrice))
    }

    if (sort !== DEFAULT_SORT) {
      pageSearchParams.set('sort', sort)
    }

    if (pageNumber > 1) {
      pageSearchParams.set('page', String(pageNumber))
    }

    const queryString = pageSearchParams.toString()

    if (!queryString) {
      return PRODUCTS_PATHNAME
    }

    return `${PRODUCTS_PATHNAME}?${queryString}`
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-20">
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-8 md:py-12">
          <h1 className="text-2xl font-black uppercase tracking-wider text-neutral-900 md:text-4xl">
            {seoContent.heading}
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
            <div className="lc-card rounded-2xl bg-white p-5 shadow-sm">
              <SearchFilters
                brands={filterOptions.brands}
                categories={filterOptions.categories}
                variant="sidebar"
                sticky={false}
                routeContext={{
                  type: 'listing',
                }}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-6 hidden md:block lg:hidden">
              <div className="sticky top-20 z-40 mb-6 hidden md:block lg:hidden">
                <SearchFilters
                  brands={filterOptions.brands}
                  categories={filterOptions.categories}
                  variant="horizontal"
                  sticky={false}
                  routeContext={{
                    type: 'listing',
                  }}
                />
              </div>
            </div>

            {productsRes.docs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {productsRes.docs.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-14 flex flex-col items-center gap-4"
                    aria-label="Phân trang sản phẩm"
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
                                …
                              </span>
                            )
                          }

                          const isCurrentPage =
                            item === currentPage

                          return (
                            <Link
                              key={item}
                              href={createPageUrl(item)}
                              aria-current={
                                isCurrentPage
                                  ? 'page'
                                  : undefined
                              }
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
              <div className="lc-card rounded-2xl bg-white py-24 text-center">
                <p className="text-lg font-bold text-neutral-400">
                  Không tìm thấy sản phẩm phù hợp
                </p>

                <Link
                  href={PRODUCTS_PATHNAME}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#B72828] px-6 text-sm font-bold text-white transition hover:bg-[#951F1F]"
                >
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
          variant="mobile-fab"
          routeContext={{
            type: 'listing',
          }}
        />
      </div>
    </div>
  )
}