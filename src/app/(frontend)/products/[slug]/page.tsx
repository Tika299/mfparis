import type { Metadata } from 'next'
import type { Where } from 'payload'
import type { JSX } from 'react'
import FragranceProfile from '@/components/product/FragranceProfile'
import '../@/styles/prose.css'
import configPromise from '@payload-config'
import {
  ChevronRight,
  Info,
  ShieldCheck,
  Star,
  Truck,
  UserCheck,
} from 'lucide-react'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import {
  notFound,
  permanentRedirect,
  RedirectType,
} from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { ProductGallery } from '@/components/ProductGallery'
import { ProductPurchase } from '@/components/ProductPurchase'
import {
  ProductQuickNav,
  ProductRichTextContent,
} from '@/components/ProductQuickNav'
import { RelatedProducts } from '@/components/RelatedProducts'
import type {
  Brand,
  Category,
  Media,
  Product,
} from '@/payload-types'
import { SITE_ORIGIN } from '@/utilities/seo'
import {
  ProductReviews,
  type ProductReviewItem,
} from '@/components/product/ProductReviews'

export const revalidate = 300
export const dynamicParams = true

const PRODUCT_ROUTE_PREFIX = '/products'
const PRODUCT_REVALIDATE_SECONDS = 300
const DEFAULT_RELATED_PRODUCTS_LIMIT = 10
const DISCONTINUED_RELATED_PRODUCTS_LIMIT = 4
const MAX_REDIRECT_HOPS = 5

const PRODUCTS_CACHE_TAG = 'products'
const BRANDS_CACHE_TAG = 'brands'
const CATEGORIES_CACHE_TAG = 'categories'
const REVIEWS_CACHE_TAG = 'reviews'
const APPROVED_REVIEWS_LIMIT = 20

type ProductPageProps = Readonly<{
  params: Promise<{
    slug: string
  }>
}>

type ProductSeoStatus =
  | 'active'
  | 'temporarily_out_of_stock'
  | 'discontinued_keep_page'
  | 'discontinued_redirect'

type RelationshipID = number | string

type ProductMetadataContent = Readonly<{
  description: string
  title: string
}>

type ProductSchemaAvailability =
  | 'Discontinued'
  | 'InStock'
  | 'OutOfStock'

type OpenGraphImageData = Readonly<{
  url: string
  width?: number
  height?: number
}>

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRelationshipID(
  value: unknown,
): value is RelationshipID {
  return (
    typeof value === 'number' ||
    typeof value === 'string'
  )
}

function getRelationshipID(
  value: unknown,
): RelationshipID | null {
  if (isRelationshipID(value)) {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  return isRelationshipID(id) ? id : null
}

function isPopulatedBrand(
  value: unknown,
): value is Brand {
  return (
    isRecord(value) &&
    isRelationshipID(value.id) &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isPopulatedCategory(
  value: unknown,
): value is Category {
  return (
    isRecord(value) &&
    isRelationshipID(value.id) &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isPopulatedMedia(
  value: unknown,
): value is Media {
  return (
    isRecord(value) &&
    isRelationshipID(value.id)
  )
}

function getProductBrand(
  product: Product,
): Brand | null {
  return isPopulatedBrand(product.brand)
    ? product.brand
    : null
}

function getProductCategories(
  product: Product,
): Category[] {
  if (!Array.isArray(product.categories)) {
    return []
  }

  return product.categories.filter(isPopulatedCategory)
}

function getProductCategoryIDs(
  product: Product,
): RelationshipID[] {
  if (!Array.isArray(product.categories)) {
    return []
  }

  const categoryIDs = product.categories
    .map((category) => getRelationshipID(category))
    .filter(
      (
        categoryID,
      ): categoryID is RelationshipID =>
        categoryID !== null,
    )

  return [...new Set(categoryIDs)]
}

function normalizeSlug(
  value: string,
): string | null {
  let decodedValue: string

  try {
    decodedValue = decodeURIComponent(value)
  } catch {
    return null
  }

  const normalizedValue = decodedValue
    .trim()
    .toLowerCase()
    .replace(/^\/+/gu, '')
    .replace(/\/+$/gu, '')

  if (
    normalizedValue.length === 0 ||
    normalizedValue.length > 200 ||
    normalizedValue.includes('/')
  ) {
    return null
  }

  return normalizedValue
}

function getProductSeoStatus(
  product: Product,
): ProductSeoStatus {
  const seoStatus: unknown = product.seoStatus

  if (
    seoStatus === 'active' ||
    seoStatus === 'temporarily_out_of_stock' ||
    seoStatus === 'discontinued_keep_page' ||
    seoStatus === 'discontinued_redirect'
  ) {
    return seoStatus
  }

  return 'active'
}

function getPlainText(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  return normalizedValue || null
}

function truncateText(
  value: string,
  maximumLength: number,
): string {
  if (value.length <= maximumLength) {
    return value
  }

  return `${value
    .slice(0, maximumLength - 1)
    .trim()}…`
}

function getProductDescription(
  product: Product,
): string {
  const seoDescription = getPlainText(
    product.seoDescription,
  )

  if (seoDescription) {
    return truncateText(seoDescription, 160)
  }

  const shortDescription = getPlainText(
    product.shortDescription,
  )

  if (shortDescription) {
    return truncateText(shortDescription, 160)
  }

  return `Khám phá ${product.title} chính hãng tại MF PARIS. Thông tin sản phẩm minh bạch, tư vấn chuyên nghiệp và giao hàng toàn quốc.`
}

function getProductMetadataContent(
  product: Product,
): ProductMetadataContent {
  return {
    title: `${product.title} | MF PARIS Chính Hãng`,
    description: getProductDescription(product),
  }
}

function getAbsoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString()
}

function getProductPath(slug: string): string {
  return `${PRODUCT_ROUTE_PREFIX}/${slug}`
}

function getProductCanonicalUrl(
  slug: string,
): string {
  return getAbsoluteUrl(getProductPath(slug))
}

function getMediaUrl(
  value: unknown,
): string | null {
  if (!isRecord(value)) {
    return null
  }

  const url = value.url

  if (
    typeof url !== 'string' ||
    url.trim().length === 0
  ) {
    return null
  }

  try {
    return new URL(url, SITE_ORIGIN).toString()
  } catch {
    return null
  }
}

function getProductOpenGraphImageData(
  product: Product,
): OpenGraphImageData | null {
  const firstImage = product.images?.[0]?.image

  if (!isPopulatedMedia(firstImage)) {
    return null
  }

  const candidate =
    firstImage.sizes?.heroDesktop?.url
      ? {
        url: firstImage.sizes.heroDesktop.url,
        width:
          firstImage.sizes.heroDesktop.width ?? undefined,
        height:
          firstImage.sizes.heroDesktop.height ?? undefined,
      }
      : firstImage.sizes?.card?.url
        ? {
          url: firstImage.sizes.card.url,
          width: firstImage.sizes.card.width ?? undefined,
          height: firstImage.sizes.card.height ?? undefined,
        }
        : firstImage.url
          ? {
            url: firstImage.url,
            width: firstImage.width ?? undefined,
            height: firstImage.height ?? undefined,
          }
          : null

  if (!candidate?.url) {
    return null
  }

  try {
    return {
      url: new URL(
        candidate.url,
        SITE_ORIGIN,
      ).toString(),
      width: candidate.width,
      height: candidate.height,
    }
  } catch {
    return null
  }
}

function getSchemaAvailability(
  seoStatus: ProductSeoStatus,
): ProductSchemaAvailability {
  if (seoStatus === 'temporarily_out_of_stock') {
    return 'OutOfStock'
  }

  if (seoStatus === 'discontinued_keep_page') {
    return 'Discontinued'
  }

  return 'InStock'
}

const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const cachedQuery = unstable_cache(
      async (): Promise<Product | null> => {
        const payload = await getPayload({
          config: configPromise,
        })

        const result = await payload.find({
          collection: 'products',
          depth: 2,
          limit: 1,
          pagination: false,
          overrideAccess: true,
          where: {
            and: [
              {
                slug: {
                  equals: slug,
                },
              },
              {
                status: {
                  equals: 'published',
                },
              },
            ],
          },
        })

        return result.docs[0] ?? null
      },
      [
        'mfparis-product-detail-v3',
        slug,
      ],
      {
        revalidate: PRODUCT_REVALIDATE_SECONDS,
        tags: [
          PRODUCTS_CACHE_TAG,
          `product:${slug}`,
        ],
      },
    )

    return cachedQuery()
  },
)

const getProductByID = cache(
  async (
    id: RelationshipID,
  ): Promise<Product | null> => {
    const normalizedID = String(id)

    const cachedQuery = unstable_cache(
      async (): Promise<Product | null> => {
        const payload = await getPayload({
          config: configPromise,
        })

        try {
          const product = await payload.findByID({
            collection: 'products',
            id,
            depth: 2,
            overrideAccess: true,
          })

          if (product.status !== 'published') {
            return null
          }

          return product
        } catch {
          return null
        }
      },
      [
        'mfparis-product-by-id-v3',
        normalizedID,
      ],
      {
        revalidate: PRODUCT_REVALIDATE_SECONDS,
        tags: [
          PRODUCTS_CACHE_TAG,
          `product-id:${normalizedID}`,
        ],
      },
    )

    return cachedQuery()
  },
)

async function resolveRedirectTargetProduct(
  sourceProduct: Product,
): Promise<Product | null> {
  const visitedProductIDs = new Set<string>()

  visitedProductIDs.add(String(sourceProduct.id))

  let relatedProductValue: unknown =
    sourceProduct.relatedProduct

  for (
    let hop = 0;
    hop < MAX_REDIRECT_HOPS;
    hop += 1
  ) {
    const relatedProductID =
      getRelationshipID(relatedProductValue)

    if (relatedProductID === null) {
      return null
    }

    const normalizedRelatedProductID =
      String(relatedProductID)

    if (
      visitedProductIDs.has(
        normalizedRelatedProductID,
      )
    ) {
      return null
    }

    visitedProductIDs.add(
      normalizedRelatedProductID,
    )

    const relatedProduct =
      await getProductByID(relatedProductID)

    if (
      !relatedProduct ||
      !relatedProduct.slug ||
      relatedProduct.slug === sourceProduct.slug
    ) {
      return null
    }

    const relatedSeoStatus =
      getProductSeoStatus(relatedProduct)

    if (
      relatedSeoStatus === 'active' ||
      relatedSeoStatus ===
      'temporarily_out_of_stock'
    ) {
      return relatedProduct
    }

    if (
      relatedSeoStatus !==
      'discontinued_redirect'
    ) {
      return null
    }

    relatedProductValue =
      relatedProduct.relatedProduct
  }

  return null
}

async function enforceProductLifecycleRedirect(
  product: Product,
): Promise<void> {
  if (
    getProductSeoStatus(product) !==
    'discontinued_redirect'
  ) {
    return
  }

  const redirectTarget =
    await resolveRedirectTargetProduct(product)

  if (!redirectTarget?.slug) {
    notFound()
  }

  permanentRedirect(
    getProductPath(redirectTarget.slug),
    RedirectType.replace,
  )
}

function buildRelatedProductsWhere(
  productID: RelationshipID,
  brandID: RelationshipID | null,
  categoryIDsCsv: string,
): Where {
  const andConditions: Where[] = [
    {
      id: {
        not_equals: productID,
      },
    },
    {
      status: {
        equals: 'published',
      },
    },
    {
      or: [
        {
          seoStatus: {
            equals: 'active',
          },
        },
        {
          seoStatus: {
            equals:
              'temporarily_out_of_stock',
          },
        },
        {
          seoStatus: {
            exists: false,
          },
        },
      ],
    },
  ]

  const affinityConditions: Where[] = []

  if (brandID !== null) {
    affinityConditions.push({
      brand: {
        equals: brandID,
      },
    })
  }

  if (categoryIDsCsv.length > 0) {
    affinityConditions.push({
      categories: {
        in: categoryIDsCsv,
      },
    })
  }

  if (affinityConditions.length > 0) {
    andConditions.push({
      or: affinityConditions,
    })
  }

  return {
    and: andConditions,
  }
}

const getRelatedProducts = unstable_cache(
  async (
    productID: RelationshipID,
    brandID: RelationshipID | null,
    categoryIDsCsv: string,
    limit: number,
  ): Promise<Product[]> => {
    const payload = await getPayload({
      config: configPromise,
    })

    const result = await payload.find({
      collection: 'products',
      depth: 1,
      limit,
      overrideAccess: true,
      sort: '-createdAt',
      where: buildRelatedProductsWhere(
        productID,
        brandID,
        categoryIDsCsv,
      ),
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
    })

    return result.docs
  },
  ['mfparis-related-products-v3'],
  {
    revalidate: PRODUCT_REVALIDATE_SECONDS,
    tags: [
      PRODUCTS_CACHE_TAG,
      BRANDS_CACHE_TAG,
      CATEGORIES_CACHE_TAG,
    ],
  },
)

async function loadRelatedProducts(
  product: Product,
  limit: number,
): Promise<Product[]> {
  const brandID = getRelationshipID(
    product.brand,
  )

  const categoryIDsCsv = getProductCategoryIDs(
    product,
  )
    .map(String)
    .sort((left, right) =>
      left.localeCompare(right),
    )
    .join(',')

  return getRelatedProducts(
    product.id,
    brandID,
    categoryIDsCsv,
    limit,
  )
}

function normalizeAverageRating(
  value: unknown,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null
  }

  return Math.min(5, value)
}

function normalizeReviewCount(
  value: unknown,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0
  }

  return Math.floor(value)
}

function getOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()

  return normalizedValue || null
}

function normalizeReviewUser(
  value: unknown,
): ProductReviewItem['user'] {
  if (isRelationshipID(value)) {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = getRelationshipID(value)

  if (id === null) {
    return null
  }

  return {
    id,
    name: getOptionalString(value.name),
    displayName: getOptionalString(
      value.displayName,
    ),
    firstName: getOptionalString(
      value.firstName,
    ),
    lastName: getOptionalString(
      value.lastName,
    ),
  }
}

function toProductReviewItem(
  value: unknown,
): ProductReviewItem | null {
  if (!isRecord(value)) {
    return null
  }

  const id = getRelationshipID(value.id)
  const rating = Number(value.rating)

  if (
    id === null ||
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return null
  }

  return {
    id,
    rating,
    comment: getOptionalString(
      value.comment,
    ),
    createdAt: getOptionalString(
      value.createdAt,
    ),
    updatedAt: getOptionalString(
      value.updatedAt,
    ),
    user: normalizeReviewUser(
      value.user,
    ),
  }
}

const getApprovedReviews = cache(
  async (
    productID: Product['id'],
  ): Promise<ProductReviewItem[]> => {
    const cachedQuery = unstable_cache(
      async (): Promise<ProductReviewItem[]> => {
        const payload = await getPayload({
          config: configPromise,
        })

        const result = await payload.find({
          collection: 'reviews',
          where: {
            and: [
              {
                product: {
                  equals: productID,
                },
              },
              {
                status: {
                  equals: 'approved',
                },
              },
            ],
          },
          sort: '-createdAt',
          limit: APPROVED_REVIEWS_LIMIT,
          depth: 1,
          overrideAccess: false,
          select: {
            rating: true,
            comment: true,
            user: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        return result.docs
          .map(toProductReviewItem)
          .filter(
            (
              review,
            ): review is ProductReviewItem =>
              review !== null,
          )
      },
      [
        'mfparis-approved-reviews-v1',
        String(productID),
      ],
      {
        revalidate:
          PRODUCT_REVALIDATE_SECONDS,
        tags: [
          REVIEWS_CACHE_TAG,
          `reviews:product:${productID}`,
        ],
      },
    )

    return cachedQuery()
  },
)

function ProductRatingStars({
  rating,
}: Readonly<{
  rating: number
}>): JSX.Element {
  const normalizedRating = Math.min(
    5,
    Math.max(0, rating),
  )

  const filledStarCount = Math.round(
    normalizedRating,
  )

  return (
    <span
      role="img"
      aria-label={`${normalizedRating.toLocaleString(
        'vi-VN',
        {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        },
      )} trên 5 sao`}
      className="inline-flex shrink-0 items-center gap-1 leading-none"
    >
      {Array.from(
        { length: 5 },
        (_, index) => {
          const isFilled =
            index < filledStarCount

          return (
            <Star
              key={index}
              aria-hidden="true"
              size={18}
              strokeWidth={1.5}
              color={
                isFilled
                  ? '#F6A800'
                  : '#E5E7EB'
              }
              fill={
                isFilled
                  ? '#F6A800'
                  : '#E5E7EB'
              }
              style={{
                color: isFilled
                  ? '#F6A800'
                  : '#E5E7EB',
                fill: isFilled
                  ? '#F6A800'
                  : '#E5E7EB',
                flexShrink: 0,
              }}
            />
          )
        },
      )}
    </span>
  )
}

function StockAlertForm({
  product,
}: Readonly<{
  product: Product
}>): JSX.Element {
  return (
    <section
      aria-labelledby="stock-alert-heading"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
    >
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">
        Hết hàng tạm thời
      </p>

      <h2
        id="stock-alert-heading"
        className="mt-2 text-lg font-black text-gray-950"
      >
        Nhận thông báo khi có hàng lại
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Sản phẩm vẫn đang được MF PARIS phân phối.
        Hãy để lại email để nhận thông báo ngay khi
        hàng được bổ sung.
      </p>

      <form
        action="/api/stock-alerts"
        method="post"
        className="mt-5 space-y-3"
      >
        <input
          type="hidden"
          name="productId"
          value={String(product.id)}
        />

        <input
          type="hidden"
          name="productSlug"
          value={product.slug}
        />

        <input
          type="hidden"
          name="productTitle"
          value={product.title}
        />

        <input
          type="hidden"
          name="returnTo"
          value={getProductPath(product.slug)}
        />

        <label
          htmlFor="stock-alert-email"
          className="block text-xs font-bold uppercase tracking-wider text-gray-700"
        >
          Email của bạn
        </label>

        <input
          id="stock-alert-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="email@example.com"
          className="min-h-12 w-full rounded-xl border border-amber-200 bg-white px-4 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-[#B72828] focus:ring-2 focus:ring-[#B72828]/15"
        />

        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B72828] px-5 text-sm font-black text-white transition hover:bg-[#951F1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
        >
          Nhận thông báo khi có hàng lại
        </button>
      </form>

      <p className="mt-3 text-[11px] leading-5 text-gray-500">
        Email chỉ được sử dụng để thông báo tình trạng
        hàng của sản phẩm này.
      </p>
    </section>
  )
}

function DiscontinuedBanner(): JSX.Element {
  return (
    <section
      role="status"
      className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm md:px-8"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B72828]">
        Thông báo sản phẩm
      </p>

      <h2 className="mt-2 text-xl font-black text-gray-950 md:text-2xl">
        Sản phẩm này đã ngừng kinh doanh
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        MF PARIS không còn nhận đơn cho sản phẩm này.
        Bạn có thể xem các sản phẩm cùng thương hiệu
        hoặc cùng danh mục được gợi ý bên dưới.
      </p>
    </section>
  )
}

function DiscontinuedPurchasePanel(): JSX.Element {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-100 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-gray-500">
        Đã ngừng kinh doanh
      </p>

      <h2 className="mt-2 text-lg font-black text-gray-950">
        Sản phẩm không còn khả dụng
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Chức năng mua hàng đã được vô hiệu hóa để
        tránh phát sinh đơn cho sản phẩm không còn
        phân phối.
      </p>

      <Link
        href="/products"
        className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#B72828] px-5 text-sm font-black text-white transition hover:bg-[#951F1F]"
      >
        Khám phá sản phẩm khác
      </Link>
    </section>
  )
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = normalizeSlug(rawSlug)

  if (!slug) {
    notFound()
  }

  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const seoStatus =
    getProductSeoStatus(product)

  const metadataContent =
    getProductMetadataContent(product)

  const canonicalUrl =
    getProductCanonicalUrl(product.slug)

  const openGraphImage =
    getProductOpenGraphImageData(product)

  const shouldNoindex =
    seoStatus === 'discontinued_keep_page'

  return {
    title: metadataContent.title,
    description: metadataContent.description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: !shouldNoindex,
      follow: true,
      googleBot: {
        index: !shouldNoindex,
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
      title: metadataContent.title,
      description: metadataContent.description,
      url: canonicalUrl,
      images: openGraphImage
        ? [
          {
            url: openGraphImage.url,
            alt: product.title,
            width: openGraphImage.width,
            height: openGraphImage.height,
          },
        ]
        : undefined,
    },

    twitter: {
      card: 'summary_large_image',
      title: metadataContent.title,
      description: metadataContent.description,
      images: openGraphImage
        ? [openGraphImage.url]
        : undefined,
    },
  }
}

export default async function ProductPage({
  params,
}: ProductPageProps): Promise<JSX.Element> {
  const { slug: rawSlug } = await params
  const slug = normalizeSlug(rawSlug)

  if (!slug) {
    notFound()
  }

  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  await enforceProductLifecycleRedirect(product)

  const seoStatus =
    getProductSeoStatus(product)

  const schemaAvailability =
    getSchemaAvailability(seoStatus)

  const brand = getProductBrand(product)
  const categories =
    getProductCategories(product)

  const relatedProductsLimit =
    seoStatus === 'discontinued_keep_page'
      ? DISCONTINUED_RELATED_PRODUCTS_LIMIT
      : DEFAULT_RELATED_PRODUCTS_LIMIT

  const [
    relatedProducts,
    approvedReviews,
  ] = await Promise.all([
    loadRelatedProducts(
      product,
      relatedProductsLimit,
    ),
    getApprovedReviews(product.id),
  ])

  const averageRating =
    typeof product.averageRating ===
      'number' &&
      Number.isFinite(
        product.averageRating,
      ) &&
      product.averageRating > 0
      ? Math.min(5, product.averageRating)
      : null

  const reviewCount =
    typeof product.reviewCount ===
      'number' &&
      Number.isFinite(
        product.reviewCount,
      ) &&
      product.reviewCount > 0
      ? Math.floor(product.reviewCount)
      : 0

  const displayRating =
    averageRating !== null &&
      reviewCount > 0
      ? averageRating
      : null

  const getProductImageUrls = (
    currentProduct: Product,
  ): string[] => {
    if (!Array.isArray(currentProduct.images)) {
      return []
    }

    return currentProduct.images
      .map((item) => getMediaUrl(item.image))
      .filter(
        (url): url is string =>
          Boolean(url),
      )
  }

  const getProductOfferPrice = (
    currentProduct: Product,
  ): number | null => {
    const basePrice = Number(
      currentProduct.price?.basePrice ?? 0,
    )
    const salePrice = Number(
      currentProduct.price?.salePrice ?? 0,
    )

    if (
      salePrice > 0 &&
      salePrice < basePrice
    ) {
      return salePrice
    }

    if (basePrice > 0) {
      return basePrice
    }

    return null
  }

  const buildProductJsonLd = (
    currentProduct: Product,
  ) => {
    const currentBrand =
      getProductBrand(currentProduct)
    const currentSeoStatus =
      getProductSeoStatus(currentProduct)
    const price =
      getProductOfferPrice(currentProduct)
    const normalizedReviewCount =
      normalizeReviewCount(
        currentProduct.reviewCount,
      )
    const normalizedAverageRating =
      normalizeAverageRating(
        currentProduct.averageRating,
      )
    const canonicalUrl =
      getProductCanonicalUrl(
        currentProduct.slug,
      )
    const imageUrls =
      getProductImageUrls(currentProduct)

    const jsonLd: Record<
      string,
      unknown
    > = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: currentProduct.title,
      url: canonicalUrl,
      description:
        getProductDescription(
          currentProduct,
        ),
      image: imageUrls,
      sku:
        currentProduct.sku || undefined,
      brand: currentBrand
        ? {
          '@type': 'Brand',
          name: currentBrand.name,
        }
        : undefined,
      offers: price
        ? {
          '@type': 'Offer',
          url: canonicalUrl,
          price,
          priceCurrency: 'VND',
          availability: `https://schema.org/${getSchemaAvailability(
            currentSeoStatus,
          )}`,
          itemCondition:
            'https://schema.org/NewCondition',
        }
        : undefined,
    }

    if (
      normalizedAverageRating &&
      normalizedReviewCount > 0
    ) {
      jsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue:
          normalizedAverageRating,
        reviewCount:
          normalizedReviewCount,
        bestRating: 5,
        worstRating: 1,
      }
    }

    return jsonLd
  }

  const buildProductBreadcrumbJsonLd = (
    currentProduct: Product,
  ) => {
    const currentCategories =
      getProductCategories(
        currentProduct,
      )
    const primaryCategory =
      currentCategories[0]

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Trang chủ',
          item: SITE_ORIGIN,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sản phẩm',
          item: `${SITE_ORIGIN}/products`,
        },
        primaryCategory
          ? {
            '@type': 'ListItem',
            position: 3,
            name: primaryCategory.name,
            item: `${SITE_ORIGIN}/categories/${primaryCategory.slug}`,
          }
          : null,
        {
          '@type': 'ListItem',
          position: primaryCategory
            ? 4
            : 3,
          name: currentProduct.title,
          item: getProductCanonicalUrl(
            currentProduct.slug,
          ),
        },
      ].filter(Boolean),
    }
  }

  const productJsonLd =
    buildProductJsonLd(product)
  const breadcrumbJsonLd =
    buildProductBreadcrumbJsonLd(product)

  return (
    <div
      className="min-h-screen bg-[#F0F2F5] pb-20 lg:pb-12"
      data-product-seo-status={seoStatus}
      data-schema-availability={
        schemaAvailability
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productJsonLd,
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd,
          ),
        }}
      />

      <ProductQuickNav
        description={product.description}
      />

      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux flex h-11 items-center gap-1.5 text-xs font-medium text-gray-500 md:h-12">
          <Link
            href="/"
            className="line-clamp-1 hover:text-black"
          >
            Trang chủ
          </Link>

          <ChevronRight
            aria-hidden="true"
            size={14}
          />

          <Link
            href="/products"
            className="line-clamp-1 hover:text-black"
          >
            Sản phẩm
          </Link>

          <ChevronRight
            aria-hidden="true"
            size={14}
          />

          <span
            aria-current="page"
            className="line-clamp-1 text-gray-900"
          >
            {product.title}
          </span>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        <div className="flex flex-col gap-6 lg:gap-8">
          {seoStatus ===
            'discontinued_keep_page' ? (
            <DiscontinuedBanner />
          ) : null}

          <div className="grid grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-sm lg:grid-cols-12">
            <div className="bg-white p-3 sm:p-4 md:p-6 lg:col-span-7 lg:border-r lg:border-gray-100 lg:p-8">
              <div className="overflow-hidden rounded-2xl">
                <ProductGallery
                  images={product.images ?? []}
                />
              </div>
            </div>

            <div className="flex flex-col p-5 md:p-8 lg:col-span-5 lg:p-10">
              <div className="mb-6">
                {brand ? (
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="text-xs font-black uppercase tracking-widest text-[#B72828]"
                  >
                    {brand.name}
                  </Link>
                ) : null}

                <h1 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-3xl lg:text-[2.1rem]">
                  {product.title}
                </h1>

                <div className="mt-4 min-h-6">
                  {displayRating !== null ? (
                    <Link
                      href="#product-reviews-heading"
                      aria-label={`${displayRating.toLocaleString(
                        'vi-VN',
                        {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        },
                      )} trên 5 sao từ ${reviewCount.toLocaleString(
                        'vi-VN',
                      )} đánh giá`}
                      className="inline-flex w-fit flex-nowrap items-center gap-2 whitespace-nowrap rounded-md leading-none outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
                    >
                      <ProductRatingStars
                        rating={displayRating}
                      />

                      <span className="shrink-0 text-sm font-black tabular-nums text-gray-900">
                        {displayRating.toLocaleString(
                          'vi-VN',
                          {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          },
                        )}
                      </span>

                      <span
                        aria-hidden="true"
                        className="h-4 w-px shrink-0 bg-gray-200"
                      />

                      <span className="shrink-0 text-sm font-medium text-gray-500">
                        {reviewCount.toLocaleString(
                          'vi-VN',
                        )}{' '}
                        đánh giá
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="#product-reviews-heading"
                      className="inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-[#B72828]"
                    >
                      Chưa có đánh giá · Viết đánh giá đầu tiên
                    </Link>
                  )}
                </div>
              </div>

              {seoStatus === 'active' ? (
                <ProductPurchase product={product} />
              ) : null}

              {seoStatus ===
                'temporarily_out_of_stock' ? (
                <StockAlertForm product={product} />
              ) : null}

              {seoStatus ===
                'discontinued_keep_page' ? (
                <DiscontinuedPurchasePanel />
              ) : null}

              {categories.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Danh mục:
                  </span>

                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:border-black hover:text-black"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              {Array.isArray(
                product.specifications,
              ) &&
                product.specifications.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-gray-100 bg-[#F8F9FB] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#B72828]">
                      <Info
                        aria-hidden="true"
                        size={16}
                      />
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">
                      Thông số kỹ thuật
                    </h2>
                  </div>

                  <dl className="divide-y divide-gray-200">
                    {product.specifications.map(
                      (
                        specification,
                        index,
                      ) => (
                        <div
                          key={
                            specification.id ??
                            `${specification.label}-${index}`
                          }
                          className="grid grid-cols-12 gap-3 py-3 text-sm"
                        >
                          <dt className="col-span-5 font-semibold text-gray-500">
                            {specification.label}
                          </dt>

                          <dd className="col-span-7 font-bold text-gray-900">
                            {specification.value}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              ) : null}

              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-100 pt-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                    <Truck
                      aria-hidden="true"
                      size={20}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase">
                      Giao nhanh 2h
                    </p>

                    <p className="text-[10px] text-gray-500">
                      Hà Nội &amp; TP.HCM
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-50 p-2.5 text-green-600">
                    <ShieldCheck
                      aria-hidden="true"
                      size={20}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase">
                      100% Chính hãng
                    </p>

                    <p className="text-[10px] text-gray-500">
                      Bảo hành đầy đủ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <FragranceProfile
              data={product.fragranceProfile}
              scoreMax={10}
              title="Kiến trúc mùi hương"
              eyebrow="Fragrance profile"
            />
            <ProductRichTextContent
              description={product.description}
            />

            <ProductReviews
              productId={product.id}
              reviews={approvedReviews}
            />

            <div className="rounded-[2.5rem] bg-[#16423C] p-8 text-white md:p-10">
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-400">
                  <UserCheck
                    aria-hidden="true"
                    size={32}
                  />
                </div>

                <div className="text-center md:text-left">
                  <h2 className="text-lg font-bold uppercase italic">
                    Chuyên gia MF PARIS tư vấn
                  </h2>

                  <p className="mt-3 text-[15px] leading-relaxed text-emerald-100/80">
                    Nếu bạn có thắc mắc về cách sử
                    dụng hoặc thành phần, hãy nhấn
                    Chat ngay để được hỗ trợ 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 ? (
            <section
              aria-labelledby="related-products-heading"
              className={
                seoStatus ===
                  'discontinued_keep_page'
                  ? 'rounded-3xl border border-red-100 bg-white p-5 shadow-sm md:p-8'
                  : undefined
              }
            >
              {seoStatus ===
                'discontinued_keep_page' ? (
                <header className="mb-7">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B72828]">
                    Gợi ý thay thế
                  </p>

                  <h2
                    id="related-products-heading"
                    className="mt-2 text-2xl font-black text-gray-950 md:text-3xl"
                  >
                    Sản phẩm bạn có thể quan tâm
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Các sản phẩm cùng thương hiệu
                    hoặc cùng danh mục đang được
                    MF PARIS phân phối.
                  </p>
                </header>
              ) : null}

              <RelatedProducts
                products={relatedProducts}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}