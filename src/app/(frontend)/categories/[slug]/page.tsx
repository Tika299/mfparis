import type { Metadata } from 'next'
import type { Where } from 'payload'
import type { Category } from '@/payload-types'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import '@/styles/prose.css'
import { ProductCard } from '@/components/ProductCard'
import { JsonLd } from '@/components/JsonLd'
import { ViewportSearchFilters as SearchFilters } from '@/components/search-filters/ViewportSearchFilters'
import { getProductFilterOptions } from '@/data/getProductFilterOptions'
import { SITE_ORIGIN } from '@/utilities/seo'
import { ExpandableContent } from '@/components/ExpandableContent'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'
import { htmlToPlainText, normalizeContentHtml } from '@/lib/html/contentHtml'
import { resolveCategoryFilterArchitecture } from '@/lib/categoryFilterArchitecture'
import { buildCollectionPageSchemaGraph } from '@/lib/structured-data'
import {
  appendAdvancedProductWhereConditions,
  appendAdvancedSearchParams,
  getFirstSearchParam,
  getSearchParamValues,
  type ProductSearchParams,
} from '@/lib/productSearchFilters'
import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'
import {
  getMetadataTitle,
  getSeoCanonical,
  getSeoFollowValue,
  getSeoIndexValue,
  getSeoMedia,
  getSeoText,
} from '@/utilities/metadataSeo'
import {
  getCategoryAncestors,
  getCategoryChildren,
  getCategoryDescendantIDs,
  getCategorySiblings,
  type CategoryTreeItem,
} from '@/lib/categoryTree'
import { CategoryFamilyNav } from '@/components/CategoryFamilyNav'
import { cache, Suspense } from 'react'
import type { ComponentProps } from 'react'
import { getCachedCategoryTree } from '@/data/getCachedCategoryTree'

const PRODUCTS_PER_PAGE = 20
const DEFAULT_SORT = '-createdAt'

const ALLOWED_SORT_VALUES = new Set([
  '-createdAt',
  'price.basePrice',
  '-price.basePrice',
  'title',
  '-averageRating',
  '-reviewCount',
])

type CategoryPageProps = {
  params: Promise<{
    slug: string
    facet?: string
  }>

  searchParams: Promise<ProductSearchParams>
}

type RelationshipMedia =
  | number
  | {
    url?: string | null
  }
  | null
  | undefined

type LandingFaqItem = {
  question?: string | null
  answer?: string | null
}

type SeasonFacet = {
  label: string
  slug: string
}

type IndexableFacetConfig = {
  key?: string | null
  value?: string | null
  h1?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  introHtml?: string | null
  bottomContentHtml?: string | null
}

const SEASON_FILTER_KEY = 'attr_mua'

function normalizePrettyFacet(value: string | undefined): string | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^mua-/, '')

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return null
  }

  return normalized
}

function getSeasonPhrase(label: string): string {
  const normalized = label.trim()

  if (/^mùa\s/i.test(normalized)) {
    return normalized
  }

  return `Mùa ${normalized}`
}

function normalizeFacetKey(value: unknown): string {
  const key = String(value || '').trim()
  return key === 'mua' ? SEASON_FILTER_KEY : key
}

function getIndexableFacetConfig(
  category: Pick<Category, 'indexableFacets'>,
  key: string,
  value: string,
): IndexableFacetConfig | null {
  if (!Array.isArray(category?.indexableFacets)) {
    return null
  }

  return category.indexableFacets.find((item: IndexableFacetConfig) => (
    normalizeFacetKey(item?.key) === key &&
    String(item?.value || '').trim().toLowerCase() === value
  )) ?? null
}

function isFacetAllowedToIndex(
  category: Pick<Category, 'indexableFacets'>,
  facetConfig: IndexableFacetConfig | null,
): boolean {
  const configuredFacets = Array.isArray(category?.indexableFacets)
    ? category.indexableFacets.filter((item: IndexableFacetConfig) => (
      normalizeFacetKey(item?.key) === SEASON_FILTER_KEY
    ))
    : []

  // Nếu admin chưa khai báo allowlist mùa, các giá trị mùa hợp lệ được phép index.
  // Khi đã có allowlist, chỉ những giá trị được khai báo mới được index.
  return configuredFacets.length === 0 || facetConfig !== null
}

function hasExtraFacetFilters(searchParams: ProductSearchParams): boolean {
  for (const key of Object.keys(searchParams)) {
    const values = getSearchParamValues(searchParams, key)

    if (values.length === 0 || key === SEASON_FILTER_KEY) {
      continue
    }

    if (key === 'page' && values[0] === '1') {
      continue
    }

    if (key === 'sort' && values[0] === DEFAULT_SORT) {
      continue
    }

    // Tracking parameters do not change page content.
    if (/^(utm_|gclid$|fbclid$)/i.test(key)) {
      continue
    }

    return true
  }

  return false
}

function buildCategoryFacetUrl(categorySlug: string, facetSlug: string): string {
  return `/categories/${encodeURIComponent(categorySlug)}/mua-${encodeURIComponent(facetSlug)}`
}

function buildLegacyFacetRedirectUrl(
  categorySlug: string,
  facetSlug: string,
  searchParams: ProductSearchParams,
): string {
  const query = new URLSearchParams()

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (key === SEASON_FILTER_KEY || rawValue === undefined) {
      continue
    }

    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue]) {
      query.append(key, value)
    }
  }

  const pathname = buildCategoryFacetUrl(categorySlug, facetSlug)
  const queryString = query.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    SITE_ORIGIN
  )
}

function buildCategoryContainsWhere(categoryIDs: string[]): Where {
  const conditions = categoryIDs.map((categoryID) => ({
    categories: {
      contains: categoryID,
    },
  }))

  if (conditions.length <= 1) {
    return conditions[0] ?? {
      categories: {
        contains: '',
      },
    }
  }

  return {
    or: conditions,
  }
}

function getCategoryDisplayName(
  category: Pick<Category, 'displayName' | 'h1Override' | 'name'>,
): string {
  return (
    category?.h1Override ||
    category?.displayName ||
    category?.name ||
    'Danh mục sản phẩm'
  )
}

function getLandingFaqItems(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item: LandingFaqItem) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
}

const getCategoryBySlug = cache(async (slug: string) => {
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
})

const getSeasonFacetBySlug = cache(async (slug: string): Promise<SeasonFacet | null> => {
  const payload = await getPayload({
    config: configPromise,
  })

  const attributeRes = await payload.find({
    collection: 'attributes',
    where: {
      and: [
        { slug: { equals: 'mua' } },
        { isActive: { equals: true } },
      ],
    },
    limit: 1,
    pagination: false,
    depth: 0,
    select: {
      slug: true,
    },
  })

  const attribute = attributeRes.docs[0]

  if (!attribute) {
    return null
  }

  const valueRes = await payload.find({
    collection: 'attribute-values',
    where: {
      and: [
        { attribute: { equals: attribute.id } },
        { slug: { equals: slug } },
        { isActive: { equals: true } },
      ],
    },
    limit: 1,
    pagination: false,
    depth: 0,
    select: {
      label: true,
      slug: true,
    },
  })

  const value = valueRes.docs[0]

  if (!value) {
    return null
  }

  return {
    label: value.label,
    slug: value.slug,
  }
})

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
  const description = htmlToPlainText(category.description)

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

function shouldIndexCategoryPage(
  category: Pick<Category, 'canonicalToParent' | 'indexableFacets' | 'seoIndex'>,
  searchParams: ProductSearchParams,
  seasonFacet: SeasonFacet | null,
  facetConfig: IndexableFacetConfig | null,
): boolean {
  const seoIndex = String(category?.seoIndex || 'index')
  const seasonValues = getSearchParamValues(searchParams, SEASON_FILTER_KEY)

  if (hasExtraFacetFilters(searchParams)) {
    return false
  }

  if (
    seasonValues.length > 0 &&
    (
      seasonValues.length !== 1 ||
      !seasonFacet ||
      category?.canonicalToParent === true ||
      !isFacetAllowedToIndex(category, facetConfig)
    )
  ) {
    return false
  }

  return ![
    'noindex',
    'noindex-temporary',
    'noindex-after-move',
    'removed',
  ].includes(seoIndex)
}

export async function generateMetadata({
  params,
  searchParams,
}: Pick<
  CategoryPageProps,
  'params' | 'searchParams'
>): Promise<Metadata> {
  const { slug, facet } = await params
  const rawSearchParams = await searchParams
  const prettyFacetSlug = normalizePrettyFacet(facet)
  const queryFacetValues = getSearchParamValues(rawSearchParams, SEASON_FILTER_KEY)
  const requestedFacetSlug = prettyFacetSlug || (
    queryFacetValues.length === 1
      ? normalizePrettyFacet(queryFacetValues[0])
      : null
  )
  const resolvedSearchParams: ProductSearchParams = requestedFacetSlug
    ? { ...rawSearchParams, [SEASON_FILTER_KEY]: requestedFacetSlug }
    : rawSearchParams

  const [category, seasonFacet] = await Promise.all([
    getCategoryBySlug(slug),
    requestedFacetSlug
      ? getSeasonFacetBySlug(requestedFacetSlug)
      : Promise.resolve(null),
  ])

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

  const facetConfig = seasonFacet
    ? getIndexableFacetConfig(category, SEASON_FILTER_KEY, seasonFacet.slug)
    : null
  const seasonPhrase = seasonFacet ? getSeasonPhrase(seasonFacet.label) : null
  const fallbackTitle = seasonPhrase
    ? `${category.name} ${seasonPhrase} Chính Hãng`
    : `${category.name} Chính Hãng`
  const title = facetConfig?.metaTitle || (
    seasonFacet
      ? fallbackTitle
      : getSeoText(category, 'metaTitle') || fallbackTitle
  )
  const description = facetConfig?.metaDescription || (
    seasonPhrase
      ? `Khám phá ${category.name} ${seasonPhrase.toLocaleLowerCase('vi')} chính hãng, phù hợp thời tiết và phong cách tại MF Paris.`
      : getSeoText(category, 'metaDescription') || getCategoryDescription(category)
  )
  const defaultCategoryCanonicalUrl = `/categories/${encodeURIComponent(slug)}`
  const canonicalUrl = seasonFacet && category?.canonicalToParent !== true
    ? buildCategoryFacetUrl(slug, seasonFacet.slug)
    : getSeoCanonical(category, defaultCategoryCanonicalUrl)
  const imageUrl = getMediaUrl(
    (getSeoMedia(category, 'ogImage') ||
      category.ogImage ||
      category.thumbnail ||
      category.image) as RelationshipMedia,
  )
  const twitterImageUrl =
    getMediaUrl(getSeoMedia(category, 'twitterImage') as RelationshipMedia) || imageUrl
  const shouldIndex = shouldIndexCategoryPage(
    category,
    resolvedSearchParams,
    seasonFacet,
    facetConfig,
  )
  const index = getSeoIndexValue(category, shouldIndex)
  const follow = getSeoFollowValue(category)

  return {
    title: getMetadataTitle(title),
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index,
      follow,
      googleBot: {
        index,
        follow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: canonicalUrl,
      siteName: 'MF Paris',
      title: seasonFacet ? title : getSeoText(category, 'ogTitle') || title,
      description: seasonFacet
        ? description
        : getSeoText(category, 'ogDescription') || description,
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
      images: twitterImageUrl
        ? [twitterImageUrl]
        : undefined,
    },
  }
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

async function LinkedCategoryHtml(
  props: Parameters<typeof applyInternalLinksForRender>[0],
) {
  const result = await applyInternalLinksForRender(props)

  return <SafeHtmlContent html={result.html} />
}

type DeferredCategoryFiltersProps = Omit<
  ComponentProps<typeof SearchFilters>,
  'brands' | 'categories' | 'facets'
> & {
  optionsPromise: ReturnType<typeof getProductFilterOptions>
  facetKeys: string[]
}

async function DeferredCategoryFilters({
  optionsPromise,
  facetKeys,
  ...props
}: DeferredCategoryFiltersProps) {
  const options = await optionsPromise
  const enabledKeys = new Set(facetKeys)

  return (
    <SearchFilters
      {...props}
      brands={options.brands}
      categories={options.categories}
      facets={options.facets.filter((facet) =>
        enabledKeys.has(facet.key),
      )}
    />
  )
}

async function DeferredSeasonFacetLinks({
  optionsPromise,
  categorySlug,
  categoryName,
  activeFacet,
}: {
  optionsPromise: ReturnType<typeof getProductFilterOptions>
  categorySlug: string
  categoryName: string
  activeFacet: string | null
}) {
  const options = await optionsPromise
  const seasonFacet = options.facets.find((facet) => facet.key === SEASON_FILTER_KEY)

  if (!seasonFacet || seasonFacet.items.length === 0) {
    return null
  }

  return (
    <nav aria-label="Mua sắm theo mùa" className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-bold text-gray-900">Mua sắm theo mùa</p>
      <div className="flex flex-wrap gap-2">
        {seasonFacet.items.map((item) => {
          const isActive = item.slug === activeFacet

          return (
            <Link
              key={item.id}
              href={buildCategoryFacetUrl(categorySlug, item.slug)}
              aria-current={isActive ? 'page' : undefined}
              className={isActive
                ? 'rounded-full bg-[#b72828] px-3 py-2 text-sm font-semibold text-white'
                : 'rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#b72828] hover:text-[#b72828]'}
            >
              {categoryName} {getSeasonPhrase(item.name).toLocaleLowerCase('vi')}
              {typeof item.count === 'number' ? ` (${item.count})` : ''}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug, facet } = await params
  const rawSearchParams = await searchParams
  const prettyFacetSlug = normalizePrettyFacet(facet)
  const queryFacetValues = getSearchParamValues(rawSearchParams, SEASON_FILTER_KEY)

  if (facet && !prettyFacetSlug) {
    notFound()
  }

  if (!facet && queryFacetValues.length === 1) {
    const legacyFacetSlug = normalizePrettyFacet(queryFacetValues[0])

    if (legacyFacetSlug) {
      permanentRedirect(
        buildLegacyFacetRedirectUrl(slug, legacyFacetSlug, rawSearchParams),
      )
    }
  }

  const resolvedSearchParams: ProductSearchParams = prettyFacetSlug
    ? { ...rawSearchParams, [SEASON_FILTER_KEY]: prettyFacetSlug }
    : rawSearchParams
  const page = getFirstSearchParam(resolvedSearchParams, 'page')
  const brand = getFirstSearchParam(resolvedSearchParams, 'brand')
  const min = getFirstSearchParam(resolvedSearchParams, 'min')
  const max = getFirstSearchParam(resolvedSearchParams, 'max')
  const requestedSort = getFirstSearchParam(resolvedSearchParams, 'sort')

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
  const [currentCategory, allCategoriesRes, seasonFacet] = await Promise.all([
    getCategoryBySlug(slug),
    getCachedCategoryTree(),
    prettyFacetSlug
      ? getSeasonFacetBySlug(prettyFacetSlug)
      : Promise.resolve(null),
  ])

  if (!currentCategory || (prettyFacetSlug && !seasonFacet)) {
    notFound()
  }

  const facetConfig = seasonFacet
    ? getIndexableFacetConfig(currentCategory, SEASON_FILTER_KEY, seasonFacet.slug)
    : null

  const allCategories = allCategoriesRes.docs as CategoryTreeItem[]

  const categoryScopeIDs = getCategoryDescendantIDs(
    currentCategory.id,
    allCategories,
  )

  const childCategories = getCategoryChildren(
    currentCategory.id,
    allCategories,
  )

  const siblingCategories = getCategorySiblings(
    currentCategory,
    allCategories,
  )

  const ancestorCategories = getCategoryAncestors(
    currentCategory,
    allCategories,
  )

  /*
   * Bước 2: Tạo điều kiện lấy sản phẩm.
   */
  const andConditions: Where[] = [
    {
      status: {
        equals: 'published',
      },
    },
    buildCategoryContainsWhere(categoryScopeIDs),
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

  appendAdvancedProductWhereConditions(
    andConditions,
    resolvedSearchParams,
  )

  const whereQueries: Where = {
    and: andConditions,
  }

  const filterOptionsPromise = getProductFilterOptions(
    [...new Set(categoryScopeIDs.map(String))].sort(),
    'categories',
  )

  // Prevent an unhandled rejection while products are pending.
  // The original promise still propagates errors to the consumer.
  void filterOptionsPromise.catch(() => { })

  const productsRes = await payload.find({
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
      createdAt: true,
      displayLocation: true,
    },
  })

  const totalPages =
    productsRes.totalPages || 1

  const totalDocs =
    productsRes.totalDocs || 0

  if (seasonFacet && totalDocs === 0) {
    notFound()
  }

  const filterArchitecture = resolveCategoryFilterArchitecture(currentCategory)
  const categoryPageCoreFilters = filterArchitecture.coreFilters.filter(
    (key) => key !== 'category',
  )

  const categoryDescriptionHtml = normalizeContentHtml(
    seasonFacet ? facetConfig?.introHtml : currentCategory.description,
  )
  const hasDescription = Boolean(categoryDescriptionHtml)
  const bottomContentHtml = normalizeContentHtml(
    seasonFacet ? facetConfig?.bottomContentHtml : currentCategory.bottomContentHtml,
  )
  const faqItems = seasonFacet ? [] : getLandingFaqItems(currentCategory.faq)
  const baseCategoryDisplayName = getCategoryDisplayName(currentCategory)
  const seasonPhrase = seasonFacet ? getSeasonPhrase(seasonFacet.label) : null
  const categoryDisplayName = facetConfig?.h1 || (
    seasonPhrase
      ? `${baseCategoryDisplayName} ${seasonPhrase}`
      : baseCategoryDisplayName
  )
  const breadcrumb = [
    {
      name: 'Trang chủ',
      url: '/',
    },
    {
      name: 'Danh mục',
      url: '/categories',
    },
    ...ancestorCategories
      .filter((category) => category.name && category.slug)
      .map((category) => ({
        name: String(category.name),
        url: `/categories/${category.slug}`,
      })),
    ...(seasonFacet
      ? [
        {
          name: baseCategoryDisplayName,
          url: `/categories/${currentCategory.slug}`,
        },
        {
          name: seasonPhrase || seasonFacet.label,
          url: buildCategoryFacetUrl(slug, seasonFacet.slug),
        },
      ]
      : [
        {
          name: baseCategoryDisplayName,
          url: `/categories/${currentCategory.slug}`,
        },
      ]),
  ]

  const categoryUrl = seasonFacet
    ? buildCategoryFacetUrl(slug, seasonFacet.slug)
    : `/categories/${encodeURIComponent(slug)}`
  const pageDescription = facetConfig?.metaDescription || (
    seasonPhrase
      ? `Khám phá ${currentCategory.name} ${seasonPhrase.toLocaleLowerCase('vi')} chính hãng, phù hợp thời tiết và phong cách tại MF Paris.`
      : getCategoryDescription(currentCategory)
  )

  const internalLinkingConfig = getInternalLinkingConfig(currentCategory)

  const schemaGraph = buildCollectionPageSchemaGraph({
    page: {
      url: categoryUrl,
      name: categoryDisplayName,
      description: pageDescription,
      breadcrumb,
      faq: !seasonFacet && faqItems.length > 0
        ? {
          questions: faqItems,
        }
        : undefined,
      items: productsRes.docs.map((product) => ({
        name: product.title,
        url: `/products/${product.slug}`,
      })),
    },
  })

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

    appendAdvancedSearchParams(
      query,
      resolvedSearchParams,
    )

    if (seasonFacet) {
      query.delete(SEASON_FILTER_KEY)
    }

    if (pageNumber > 1) {
      query.set(
        'page',
        String(pageNumber),
      )
    }

    const queryString = query.toString()

    return queryString
      ? `${categoryUrl}?${queryString}`
      : categoryUrl
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
      <JsonLd data={schemaGraph} />
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <nav aria-label="Breadcrumb" className="mb-4 overflow-x-auto">
            <ol className="flex min-w-max items-center gap-2 text-xs text-gray-500 md:text-sm">
              {breadcrumb.map((item, index) => {
                const isCurrent = index === breadcrumb.length - 1

                return (
                  <li
                    key={item.url}
                    className="flex shrink-0 items-center gap-2"
                  >
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-gray-300">
                        /
                      </span>
                    ) : null}

                    {isCurrent ? (
                      <span
                        aria-current="page"
                        className="font-semibold text-gray-900"
                      >
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.url}
                        className="transition-colors hover:text-[#b72828]"
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl lg:text-4xl">
            {categoryDisplayName}
          </h1>

          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            {totalDocs.toLocaleString(
              'vi-VN',
            )}{' '}
            sản phẩm
          </p>
          {seasonFacet && !hasDescription ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 md:text-base">
              {pageDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        <CategoryFamilyNav
          currentCategory={currentCategory}
          childCategories={childCategories}
          siblingCategories={siblingCategories}
          ancestorCategories={ancestorCategories}
          allCategories={allCategories}
        />
        <Suspense fallback={null}>
          <DeferredSeasonFacetLinks
            optionsPromise={filterOptionsPromise}
            categorySlug={slug}
            categoryName={baseCategoryDisplayName}
            activeFacet={seasonFacet?.slug ?? null}
          />
        </Suspense>
        {/* Tablet */}
        <div className="sticky top-28 z-40 mb-5 hidden md:block lg:hidden">
          <Suspense fallback={
            <div role="status" className="min-h-12 bg-white p-3 text-sm text-gray-500">
              Đang tải bộ lọc…
            </div>
          }>
            <DeferredCategoryFilters
              optionsPromise={filterOptionsPromise}
              facetKeys={filterArchitecture.facetKeys}
              enabledCoreFilters={categoryPageCoreFilters}
              variant="horizontal"
              sticky={false}
              routeContext={
                filterRouteContext
              }
            /></Suspense>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          {/* Desktop */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:w-[250px] lg:shrink-0 lg:self-start lg:overflow-y-auto">
            <div className="lc-card rounded-2xl">
              <Suspense fallback={
                <div role="status" className="min-h-12 bg-white p-3 text-sm text-gray-500">
                  Đang tải bộ lọc…
                </div>
              }>
                <DeferredCategoryFilters
                  optionsPromise={filterOptionsPromise}
                  facetKeys={filterArchitecture.facetKeys}
                  enabledCoreFilters={categoryPageCoreFilters}
                  variant="sidebar"
                  sticky={false}
                  routeContext={
                    filterRouteContext
                  }
                /></Suspense>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {seasonFacet && hasDescription && categoryDescriptionHtml ? (
              <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm md:mb-8 md:p-8">
                <div className="category-description prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
                  <Suspense key={`facet-intro:${categoryUrl}`} fallback={null}>
                    <LinkedCategoryHtml
                      html={categoryDescriptionHtml}
                      currentUrl={categoryUrl}
                      scope="categories"
                      payload={payload}
                      {...internalLinkingConfig}
                    />
                  </Suspense>
                </div>
              </section>
            ) : null}

            {productsRes.docs.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
                  {productsRes.docs.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      imagePriority={index === 0}
                    />
                  ))}
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

            {!seasonFacet && hasDescription && categoryDescriptionHtml && (
                <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                  <h2 className="mb-4 text-xl font-bold md:text-2xl">
                    Giới thiệu về{' '}
                    {
                      currentCategory.name
                    }
                  </h2>

                  <div className="category-description prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
                    <ExpandableContent maxHeight={500}>
                      <Suspense key={`description:${categoryUrl}`} fallback={null}>
                        <LinkedCategoryHtml
                          html={categoryDescriptionHtml}
                          currentUrl={categoryUrl}
                          scope="categories"
                          payload={payload}
                          {...internalLinkingConfig}
                        />
                      </Suspense>
                    </ExpandableContent>
                  </div>
                </section>
              )}

            {bottomContentHtml ? (
              <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                <div className="category-description prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
                  <Suspense key={`bottom:${categoryUrl}`} fallback={null}>
                    <LinkedCategoryHtml
                      html={bottomContentHtml}
                      currentUrl={categoryUrl}
                      scope="categories"
                      payload={payload}
                      {...internalLinkingConfig}
                    />
                  </Suspense>
                </div>
              </section>
            ) : null}

            {faqItems.length > 0 ? (
              <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                <h2 className="mb-5 text-xl font-bold md:text-2xl">
                  Câu hỏi thường gặp về {categoryDisplayName}
                </h2>

                <div className="divide-y divide-gray-100">
                  {faqItems.map((item, index) => (
                    <details
                      key={`${item.question}-${index}`}
                      className="group py-4"
                    >
                      <summary className="cursor-pointer list-none text-base font-bold text-gray-900">
                        {item.question}
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-gray-600">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>

      {/* Mobile */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <Suspense fallback={
          <div role="status" className="min-h-12 bg-white p-3 text-sm text-gray-500">
            Đang tải bộ lọc…
          </div>
        }>
          <DeferredCategoryFilters
            optionsPromise={filterOptionsPromise}
            facetKeys={filterArchitecture.facetKeys}
            enabledCoreFilters={categoryPageCoreFilters}
            variant="mobile-fab"
            routeContext={
              filterRouteContext
            }
          />
        </Suspense>
      </div>
    </div>
  )
}


