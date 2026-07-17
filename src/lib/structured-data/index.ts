import { SITE_ORIGIN } from '@/utilities/seo'

type SchemaValue =
  | string
  | number
  | boolean
  | null
  | SchemaObject
  | SchemaValue[]

export type SchemaObject = {
  [key: string]: SchemaValue | undefined
}

export type BreadcrumbItem = {
  name: string
  url?: string | null
}

export type ImageInput = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type OrganizationInput = {
  name?: string | null
  alternateName?: string | string[] | null
  legalName?: string | null
  url?: string | null
  logo?: ImageInput | string | null
  telephone?: string | null
  email?: string | null
  address?: SchemaObject | string | null
  taxID?: string | null
  vatID?: string | null
  foundingDate?: string | null
  identifier?: SchemaObject | SchemaObject[] | string | null
  contactPoint?: SchemaObject | SchemaObject[] | null
  sameAs?: string[] | null
  returnPolicy?: MerchantReturnPolicyInput | null
  shippingService?: ShippingServiceInput | null
}

export type WebPageInput = {
  url: string
  name: string
  description?: string | null
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ProfilePage' | 'FAQPage'
  image?: ImageInput | string | null
  breadcrumbId?: string | null
  primaryImageId?: string | null
  mainEntity?: SchemaObject | null
  datePublished?: string | null
  dateModified?: string | null
}

export type OfferInput = {
  url: string
  price?: number | string | null
  lowPrice?: number | string | null
  highPrice?: number | string | null
  offerCount?: number | null
  priceCurrency?: string | null
  availability?: string | null
  itemCondition?: string | null
  sku?: string | null
  name?: string | null
  priceValidUntil?: string | null
  shippingDetails?: OfferShippingDetailsInput | null
  returnPolicy?: MerchantReturnPolicyInput | null
  seller?: SchemaObject | null
}

export type ProductReviewInput = {
  authorName: string
  ratingValue: number
  body?: string | null
  datePublished?: string | null
  bestRating?: number | null
  worstRating?: number | null
}

export type ProductInput = {
  url: string
  name: string
  description?: string | null
  images?: Array<ImageInput | string> | null
  sku?: string | null
  gtin?: string | null
  mpn?: string | null
  brandName?: string | null
  categoryName?: string | null
  color?: string | null
  size?: string | null
  offers?: OfferInput[] | OfferInput | null
  aggregateRating?: {
    ratingValue: number
    reviewCount: number
  } | null
  reviews?: ProductReviewInput[] | null
}

export type ProductGroupInput = {
  url: string
  name: string
  productGroupID: string
  variesBy?: string[] | null
  variants: ProductInput[]
  description?: string | null
  brandName?: string | null
}

export type CollectionSubjectInput = {
  type?: 'Brand' | 'Thing'
  name: string
  url?: string | null
  description?: string | null
}

export type CollectionPageInput = {
  url: string
  name: string
  description?: string | null
  items?: Array<{
    url: string
    name?: string | null
    image?: ImageInput | string | null
    brandName?: string | null
  }> | null
  breadcrumb?: BreadcrumbItem[] | null
  subject?: CollectionSubjectInput | null
}

export type BlogPostingInput = {
  url: string
  headline: string
  description?: string | null
  name?: string | null
  image?: ImageInput | string | null
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string | null
  authorUrl?: string | null
  authorImage?: ImageInput | string | null
  authorSameAs?: string[] | null
  reviewerName?: string | null
  reviewerUrl?: string | null
  dateReviewed?: string | null
  articleSection?: string | null
  keywords?: string[] | string | null
  wordCount?: number | null
  faq?: FAQInput | null
}

export type RelatedItemInput = {
  url: string
  name?: string | null
  description?: string | null
  image?: ImageInput | string | null
  type?: 'Product' | 'BlogPosting' | 'Article' | 'WebPage' | 'Thing'
  datePublished?: string | null
  dateModified?: string | null
}

export type PersonInput = {
  name: string
  url?: string | null
  image?: ImageInput | string | null
  jobTitle?: string | null
  description?: string | null
  sameAs?: string[] | null
}

export type MerchantReturnPolicyInput = {
  applicableCountry?: string | null
  merchantReturnDays?: number | null
  returnPolicyCategory?: string | null
  returnMethod?: string | null
  returnFees?: string | null
}

export type ShippingServiceInput = {
  name?: string | null
  areaServed?: string | null
  description?: string | null
}

export type OfferShippingDetailsInput = {
  shippingRate?: number | string | null
  currency?: string | null
  shippingDestinationCountry?: string | null
  deliveryMinDays?: number | null
  deliveryMaxDays?: number | null
}

export type LocalBusinessInput = OrganizationInput & {
  image?: ImageInput | string | null
  openingHours?: string[] | null
  geo?: {
    latitude: number
    longitude: number
  } | null
  priceRange?: string | null
}

export type FAQInput = {
  questions: Array<{
    question: string
    answer: string
  }>
}

export type VideoInput = {
  name: string
  description: string
  thumbnailUrl: string | string[]
  uploadDate: string
  contentUrl?: string | null
  embedUrl?: string | null
  duration?: string | null
}

const DEFAULT_SITE_NAME = 'MF Paris'
const DEFAULT_LANGUAGE = 'vi-VN'
const DEFAULT_CURRENCY = 'VND'
const MF_PARIS_LOGO_URL =
  'https://mfparis.vn/wp-content/uploads/2024/08/logo-mfparis-512x512-2.png'

const MF_PARIS_DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og/og-mfparis.png`

const MF_PARIS_SAME_AS = [
  'https://mfparis.vn',
  'https://www.facebook.com/mfparisofficial/',
  'https://www.facebook.com/www.mfparis.vn/',
  'https://www.instagram.com/maraisdefrance/',
  'https://www.tiktok.com/@marais.de.france',
  'https://www.youtube.com/@mfparisvn',
  'https://www.pinterest.com/mfparisvn/',
  'https://www.linkedin.com/in/mf-paris/',
  'https://zalo.me/2731577726641619342',
  'https://zalo.me/0792979299',
  'https://shopee.vn/mfparis',
  'https://www.lazada.vn/shop/perfumes-and-cosmetics-mffrance/',
  'https://maps.app.goo.gl/pS7KGh78XnVHYwX56',
]

const MF_PARIS_POSTAL_ADDRESS: SchemaObject = {
  '@type': 'PostalAddress',
  streetAddress: '220/24 Nguyễn Oanh',
  addressLocality: 'Phường Gò Vấp',
  addressRegion: 'Thành phố Hồ Chí Minh',
  postalCode: '71413',
  addressCountry: 'VN',
}

const MF_PARIS_BUSINESS_IDENTIFIER: SchemaObject[] = [
  {
    '@type': 'PropertyValue',
    name: 'Mã số thuế',
    value: '058095006998',
  },
  {
    '@type': 'PropertyValue',
    name: 'Giấy phép đăng ký kinh doanh',
    value: '41M8043902',
  },
  {
    '@type': 'PropertyValue',
    name: 'Ngày cấp giấy phép đăng ký kinh doanh',
    value: '2021-03-12',
  },
  {
    '@type': 'PropertyValue',
    name: 'Cơ quan cấp giấy phép đăng ký kinh doanh',
    value: 'Sở KH & ĐT Thành phố Hồ Chí Minh',
  },
]

const MF_PARIS_CONTACT_POINTS: SchemaObject[] = [
  {
    '@type': 'ContactPoint',
    telephone: '+84792979299',
    contactType: 'customer service',
    email: 'mfparisvn@gmail.com',
    areaServed: 'VN',
    availableLanguage: ['vi', 'en'],
  },
  {
    '@type': 'ContactPoint',
    telephone: '+84792979299',
    contactType: 'sales',
    email: 'mfparisvn@gmail.com',
    areaServed: 'VN',
    availableLanguage: ['vi', 'en'],
  },
]

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed || undefined
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function stripEmpty<T extends SchemaObject>(value: T): T {
  const output: SchemaObject = {}

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null || item === '') {
      continue
    }

    if (Array.isArray(item)) {
      const nextItems = item.filter((entry) => entry !== undefined && entry !== null && entry !== '')

      if (nextItems.length > 0) {
        output[key] = nextItems as SchemaValue[]
      }

      continue
    }

    output[key] = item
  }

  return output as T
}

export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  const value = cleanString(pathOrUrl)

  if (!value) {
    return undefined
  }

  try {
    return new URL(value, SITE_ORIGIN).toString()
  } catch {
    return undefined
  }
}

export function schemaId(url: string, id: string): string {
  return `${absoluteUrl(url) || SITE_ORIGIN}#${id.replace(/^#/u, '')}`
}

function buildImageObject(image: ImageInput | string | null | undefined, fallbackId?: string): SchemaObject | undefined {
  if (!image) {
    return undefined
  }

  if (typeof image === 'string') {
    const url = absoluteUrl(image)

    return url
      ? stripEmpty({
        '@type': 'ImageObject',
        '@id': fallbackId,
        url,
      })
      : undefined
  }

  const url = absoluteUrl(image.url)

  if (!url) {
    return undefined
  }

  return stripEmpty({
    '@type': 'ImageObject',
    '@id': fallbackId,
    url,
    caption: cleanString(image.alt),
    width: image.width || undefined,
    height: image.height || undefined,
  })
}

export function buildSchemaGraph(items: Array<SchemaObject | null | undefined>): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@graph': items.filter(Boolean) as SchemaObject[],
  }
}

export function buildOrganizationSchema(input: OrganizationInput = {}): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN

  return stripEmpty({
    '@type': 'Organization',
    '@id': schemaId(url, 'organization'),
    name: cleanString(input.name) || DEFAULT_SITE_NAME,
    alternateName: Array.isArray(input.alternateName)
      ? input.alternateName
      : cleanString(input.alternateName) || undefined,
    legalName: cleanString(input.legalName),
    url,
    logo: buildImageObject(input.logo, schemaId(url, 'logo')),
    telephone: cleanString(input.telephone),
    email: cleanString(input.email),
    address: typeof input.address === 'string' ? input.address : input.address || undefined,
    taxID: cleanString(input.taxID),
    vatID: cleanString(input.vatID),
    foundingDate: cleanString(input.foundingDate),
    identifier: input.identifier || undefined,
    contactPoint: input.contactPoint || undefined,
    sameAs: input.sameAs?.map(absoluteUrl).filter(isString),
    hasMerchantReturnPolicy: input.returnPolicy
      ? buildMerchantReturnPolicySchema(input.returnPolicy)
      : undefined,
    hasShippingService: input.shippingService
      ? buildShippingServiceSchema(input.shippingService)
      : undefined,
  })
}

export function buildWebSiteSchema(siteName = DEFAULT_SITE_NAME): SchemaObject {
  return {
    '@type': 'WebSite',
    '@id': schemaId(SITE_ORIGIN, 'website'),
    url: SITE_ORIGIN,
    name: siteName,
    publisher: {
      '@id': schemaId(SITE_ORIGIN, 'organization'),
    },
    inLanguage: DEFAULT_LANGUAGE,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_ORIGIN}/tim-kiem/{search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildWebPageSchema(input: WebPageInput): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN
  const image = buildImageObject(input.image, input.primaryImageId || schemaId(url, 'primaryimage'))

  return stripEmpty({
    '@type': input.type || 'WebPage',
    '@id': schemaId(url, 'webpage'),
    url,
    name: input.name,
    description: cleanString(input.description),
    isPartOf: {
      '@id': schemaId(SITE_ORIGIN, 'website'),
    },
    inLanguage: DEFAULT_LANGUAGE,
    breadcrumb: input.breadcrumbId
      ? {
        '@id': input.breadcrumbId,
      }
      : undefined,
    primaryImageOfPage: image
      ? {
        '@id': image['@id'] as string,
      }
      : undefined,
    image,
    mainEntity: input.mainEntity || undefined,
    datePublished: cleanString(input.datePublished),
    dateModified: cleanString(input.dateModified),
  })
}

export function buildBreadcrumbListSchema(url: string, items: BreadcrumbItem[]): SchemaObject | null {
  const normalizedItems = items
    .filter((item) => cleanString(item.name))
    .map((item, index) =>
      stripEmpty({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.url || undefined),
      }),
    )

  if (normalizedItems.length < 2) {
    return null
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': schemaId(url, 'breadcrumb'),
    itemListElement: normalizedItems,
  }
}

export function buildOfferSchema(input: OfferInput): SchemaObject | null {
  const url = absoluteUrl(input.url)

  if (!url) {
    return null
  }

  if (input.lowPrice || input.highPrice || input.offerCount) {
    return stripEmpty({
      '@type': 'AggregateOffer',
      url,
      priceCurrency: cleanString(input.priceCurrency) || DEFAULT_CURRENCY,
      lowPrice: input.lowPrice || undefined,
      highPrice: input.highPrice || undefined,
      offerCount: input.offerCount || undefined,
      availability: cleanString(input.availability),
      itemCondition: cleanString(input.itemCondition) || 'https://schema.org/NewCondition',
    })
  }

  if (!input.price) {
    return null
  }

  return stripEmpty({
    '@type': 'Offer',
    url,
    name: cleanString(input.name),
    sku: cleanString(input.sku),
    price: input.price,
    priceCurrency: cleanString(input.priceCurrency) || DEFAULT_CURRENCY,
    availability: cleanString(input.availability) || 'https://schema.org/InStock',
    itemCondition: cleanString(input.itemCondition) || 'https://schema.org/NewCondition',
    priceValidUntil: cleanString(input.priceValidUntil),
    seller:
      input.seller || {
        '@id': schemaId(SITE_ORIGIN, 'organization'),
      },
    shippingDetails: input.shippingDetails
      ? buildOfferShippingDetailsSchema(input.shippingDetails)
      : undefined,
    hasMerchantReturnPolicy: input.returnPolicy
      ? buildMerchantReturnPolicySchema(input.returnPolicy)
      : undefined,
  })
}

export function buildAggregateRatingSchema(input?: ProductInput['aggregateRating']): SchemaObject | undefined {
  if (!input || input.ratingValue <= 0 || input.reviewCount <= 0) {
    return undefined
  }

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(5, input.ratingValue),
    reviewCount: Math.floor(input.reviewCount),
    bestRating: 5,
    worstRating: 1,
  }
}

export function buildReviewSchema(review: ProductReviewInput): SchemaObject | null {
  if (!cleanString(review.authorName) || review.ratingValue <= 0) {
    return null
  }

  return stripEmpty({
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: review.authorName,
    },
    datePublished: cleanString(review.datePublished),
    reviewBody: cleanString(review.body),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: Math.min(5, review.ratingValue),
      bestRating: review.bestRating || 5,
      worstRating: review.worstRating || 1,
    },
  })
}

export function buildProductSchema(input: ProductInput): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN
  const images = input.images
    ?.map((image) => (typeof image === 'string' ? absoluteUrl(image) : absoluteUrl(image.url)))
    .filter(isString)
  const offers = Array.isArray(input.offers)
    ? input.offers.map(buildOfferSchema).filter(Boolean)
    : input.offers
      ? buildOfferSchema(input.offers)
      : undefined
  const reviews = input.reviews?.map(buildReviewSchema).filter(Boolean) as SchemaObject[] | undefined

  return stripEmpty({
    '@type': 'Product',
    '@id': schemaId(url, 'product'),
    name: input.name,
    url,
    description: cleanString(input.description),
    image: images,
    sku: cleanString(input.sku),
    gtin: cleanString(input.gtin),
    mpn: cleanString(input.mpn),
    brand: input.brandName
      ? {
        '@type': 'Brand',
        name: input.brandName,
      }
      : undefined,
    category: cleanString(input.categoryName),
    color: cleanString(input.color),
    size: cleanString(input.size),
    offers: Array.isArray(offers) && offers.length === 1 ? offers[0] : offers,
    aggregateRating: buildAggregateRatingSchema(input.aggregateRating),
    review: reviews && reviews.length > 0 ? reviews : undefined,
  })
}

export function buildProductGroupSchema(input: ProductGroupInput): SchemaObject | null {
  if (!input.variants.length) {
    return null
  }

  const url = absoluteUrl(input.url) || SITE_ORIGIN

  return stripEmpty({
    '@type': 'ProductGroup',
    '@id': schemaId(url, 'productgroup'),
    url,
    name: input.name,
    description: cleanString(input.description),
    brand: input.brandName
      ? {
        '@type': 'Brand',
        name: input.brandName,
      }
      : undefined,
    productGroupID: input.productGroupID,
    variesBy: input.variesBy?.length ? input.variesBy : ['https://schema.org/size'],
    hasVariant: input.variants.map(buildProductSchema),
  })
}

function buildCollectionSubjectSchema(input: CollectionPageInput): SchemaObject | null {
  if (!input.subject?.name) {
    return null
  }

  const subjectUrl = input.subject.url || input.url
  const subjectType = input.subject.type || 'Thing'

  return stripEmpty({
    '@type': subjectType,
    '@id': schemaId(subjectUrl, subjectType === 'Brand' ? 'brand' : 'thing'),
    name: input.subject.name,
    url: absoluteUrl(subjectUrl),
    description: cleanString(input.subject.description),
  })
}

function buildCollectionItemListSchema(input: CollectionPageInput): SchemaObject | null {
  const url = absoluteUrl(input.url) || SITE_ORIGIN

  if (!input.items?.length) {
    return null
  }

  return {
    '@type': 'ItemList',
    '@id': schemaId(url, 'itemlist'),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) =>
      stripEmpty({
        '@type': 'ListItem',
        position: index + 1,
        item: stripEmpty({
          '@type': 'Product',
          '@id': schemaId(item.url, 'product'),
          name: cleanString(item.name),
          url: absoluteUrl(item.url),
          image:
            typeof item.image === 'string'
              ? absoluteUrl(item.image)
              : absoluteUrl(item.image?.url || undefined),
          brand: input.subject?.type === 'Brand'
            ? {
              '@id': schemaId(input.subject.url || input.url, 'brand'),
            }
            : item.brandName
              ? {
                '@type': 'Brand',
                name: item.brandName,
              }
              : undefined,
        }),
      }),
    ),
  }
}

export function buildRelatedItemListSchema(input: {
  url: string
  id?: string
  name?: string
  itemType?: RelatedItemInput['type']
  items?: RelatedItemInput[] | null
}): SchemaObject | null {
  const items = input.items?.filter((item) => absoluteUrl(item.url)) || []

  if (!items.length) {
    return null
  }

  const url = absoluteUrl(input.url) || SITE_ORIGIN
  const itemType = input.itemType || 'Thing'

  return stripEmpty({
    '@type': 'ItemList',
    '@id': schemaId(url, input.id || 'related-itemlist'),
    name: cleanString(input.name),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const type = item.type || itemType
      const itemUrl = absoluteUrl(item.url) || SITE_ORIGIN
      const itemIdSuffix =
        type === 'Product'
          ? 'richSnippet'
          : type === 'BlogPosting' || type === 'Article'
            ? 'richSnippet'
            : 'webpage'

      return stripEmpty({
        '@type': 'ListItem',
        position: index + 1,
        url: itemUrl,
        item: stripEmpty({
          '@type': type,
          '@id': schemaId(itemUrl, itemIdSuffix),
          name: cleanString(item.name),
          headline:
            type === 'BlogPosting' || type === 'Article'
              ? cleanString(item.name)
              : undefined,
          description: cleanString(item.description),
          url: itemUrl,
          image:
            typeof item.image === 'string'
              ? absoluteUrl(item.image)
              : absoluteUrl(item.image?.url || undefined),
          datePublished: cleanString(item.datePublished),
          dateModified: cleanString(item.dateModified),
        }),
      })
    }),
  })
}

export function buildCollectionPageSchema(input: CollectionPageInput): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN
  const itemList = buildCollectionItemListSchema(input)
  const subject = buildCollectionSubjectSchema(input)

  return stripEmpty({
    '@type': 'CollectionPage',
    '@id': schemaId(url, 'webpage'),
    url,
    name: input.name,
    description: cleanString(input.description),
    isPartOf: {
      '@id': schemaId(SITE_ORIGIN, 'website'),
    },
    inLanguage: DEFAULT_LANGUAGE,
    about: subject
      ? {
        '@id': subject['@id'] as string,
      }
      : undefined,
    breadcrumb: input.breadcrumb
      ? {
        '@id': schemaId(url, 'breadcrumb'),
      }
      : undefined,
    mainEntity: itemList
      ? {
        '@id': schemaId(url, 'itemlist'),
      }
      : undefined,
  })
}

function getArticleSchemaLanguage(): string {
  return 'vi'
}

function getDefaultArticleAuthorUrl(): string {
  return absoluteUrl('/author/mfparis/') || SITE_ORIGIN
}

function getArticleAuthorName(input: BlogPostingInput): string {
  return cleanString(input.authorName) || 'Marais de France'
}

function getArticleAuthorUrl(input: BlogPostingInput): string {
  return absoluteUrl(input.authorUrl || getDefaultArticleAuthorUrl()) || getDefaultArticleAuthorUrl()
}

function getArticleImageId(input: BlogPostingInput): string | undefined {
  if (!input.image) {
    return undefined
  }

  const imageUrl =
    typeof input.image === 'string'
      ? absoluteUrl(input.image)
      : absoluteUrl(input.image.url)

  return imageUrl || undefined
}

function buildRankMathArticleImageObject(input: BlogPostingInput): SchemaObject | undefined {
  const image = buildImageObject(input.image, getArticleImageId(input))

  if (!image) {
    return undefined
  }

  return stripEmpty({
    ...image,
    contentUrl: typeof image.url === 'string' ? image.url : undefined,
    inLanguage: getArticleSchemaLanguage(),
  })
}

function buildRankMathArticleAuthorSchema(input: BlogPostingInput): SchemaObject {
  const authorUrl = getArticleAuthorUrl(input)

  return stripEmpty({
    '@type': 'Person',
    '@id': authorUrl,
    name: getArticleAuthorName(input),
    url: authorUrl,
    image: buildImageObject(input.authorImage || MF_PARIS_LOGO_URL, schemaId(authorUrl, 'author-image')),
    description:
      'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.',
    sameAs: input.authorSameAs?.length ? input.authorSameAs.map(absoluteUrl).filter(isString) : MF_PARIS_SAME_AS,
  })
}

function buildRankMathPublisherSchema(input?: OrganizationInput): SchemaObject {
  const organization = buildDefaultOrganizationInput({
    organization: input,
  })
  const logo = buildImageObject(organization.logo || MF_PARIS_LOGO_URL, schemaId(SITE_ORIGIN, 'logo'))

  return stripEmpty({
    '@type': ['Organization', 'Person'],
    '@id': schemaId(SITE_ORIGIN, 'person'),
    name: organization.name || 'Marais de France',
    alternateName: organization.alternateName,
    legalName: organization.legalName,
    url: SITE_ORIGIN,
    email: organization.email,
    address: typeof organization.address === 'string' ? organization.address : organization.address || undefined,
    logo,
    telephone: organization.telephone,
    image: logo
      ? {
        '@id': logo['@id'] as string,
      }
      : undefined,
  })
}

function buildRankMathWebSiteSchema(): SchemaObject {
  return {
    '@type': 'WebSite',
    '@id': schemaId(SITE_ORIGIN, 'website'),
    url: SITE_ORIGIN,
    name: 'Marais de France',
    publisher: {
      '@id': schemaId(SITE_ORIGIN, 'person'),
    },
    inLanguage: getArticleSchemaLanguage(),
  }
}

function buildRankMathBreadcrumbListSchema(url: string, items: BreadcrumbItem[]): SchemaObject | null {
  const normalizedItems = items
    .filter((item) => cleanString(item.name))
    .map((item, index) =>
      stripEmpty({
        '@type': 'ListItem',
        position: String(index + 1),
        item: stripEmpty({
          '@id': absoluteUrl(item.url || undefined),
          name: item.name,
        }),
      }),
    )

  if (normalizedItems.length < 2) {
    return null
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': schemaId(url, 'breadcrumb'),
    itemListElement: normalizedItems,
  }
}

function buildRankMathArticleWebPageSchema(
  page: WebPageInput,
  article: BlogPostingInput,
  breadcrumb: SchemaObject | null,
): SchemaObject {
  const url = absoluteUrl(page.url) || SITE_ORIGIN
  const imageId = getArticleImageId(article)

  return stripEmpty({
    '@type': 'WebPage',
    '@id': schemaId(url, 'webpage'),
    url,
    name: page.name,
    description: cleanString(page.description),
    datePublished: cleanString(page.datePublished || article.datePublished),
    dateModified: cleanString(page.dateModified || article.dateModified),
    isPartOf: {
      '@id': schemaId(SITE_ORIGIN, 'website'),
    },
    primaryImageOfPage: imageId
      ? {
        '@id': imageId,
      }
      : undefined,
    inLanguage: getArticleSchemaLanguage(),
    breadcrumb: breadcrumb
      ? {
        '@id': breadcrumb['@id'] as string,
      }
      : undefined,
  })
}

export function buildBlogPostingSchema(input: BlogPostingInput): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN
  const imageId = getArticleImageId(input)
  const authorUrl = getArticleAuthorUrl(input)

  return stripEmpty({
    '@type': 'BlogPosting',
    headline: input.headline,
    keywords: Array.isArray(input.keywords)
      ? input.keywords.filter(Boolean).join(',')
      : cleanString(input.keywords),
    datePublished: cleanString(input.datePublished),
    dateModified: cleanString(input.dateModified),
    articleSection: cleanString(input.articleSection),
    author: {
      '@id': authorUrl,
      name: getArticleAuthorName(input),
    },
    publisher: {
      '@id': schemaId(SITE_ORIGIN, 'person'),
    },
    reviewedBy: input.reviewerName
      ? stripEmpty({
        '@type': 'Person',
        name: cleanString(input.reviewerName),
        url: absoluteUrl(input.reviewerUrl || undefined),
      })
      : undefined,
    dateReviewed: cleanString(input.dateReviewed),
    description: cleanString(input.description),
    name: cleanString(input.name) || input.headline,
    subjectOf: input.faq ? [buildFAQPageSchema(input.faq, url)] : undefined,
    '@id': schemaId(url, 'richSnippet'),
    isPartOf: {
      '@id': schemaId(url, 'webpage'),
    },
    image: imageId
      ? {
        '@id': imageId,
      }
      : undefined,
    wordCount: input.wordCount || undefined,
    inLanguage: getArticleSchemaLanguage(),
    mainEntityOfPage: {
      '@id': schemaId(url, 'webpage'),
    },
  })
}

export function buildPersonSchema(input: PersonInput): SchemaObject {
  const url = absoluteUrl(input.url || '/about') || SITE_ORIGIN

  return stripEmpty({
    '@type': 'Person',
    '@id': schemaId(url, 'person'),
    name: input.name,
    url,
    image: buildImageObject(input.image, schemaId(url, 'person-image')),
    jobTitle: cleanString(input.jobTitle),
    description: cleanString(input.description),
    worksFor: {
      '@id': schemaId(SITE_ORIGIN, 'organization'),
    },
    sameAs: input.sameAs?.map(absoluteUrl).filter(isString),
  })
}

export function buildProfilePageSchema(input: PersonInput): SchemaObject {
  const url = absoluteUrl(input.url || '/about') || SITE_ORIGIN

  return buildWebPageSchema({
    url,
    type: 'ProfilePage',
    name: input.name,
    description: input.description,
    mainEntity: {
      '@id': schemaId(url, 'person'),
    },
    breadcrumbId: schemaId(url, 'breadcrumb'),
  })
}

export function buildMerchantReturnPolicySchema(input: MerchantReturnPolicyInput = {}): SchemaObject {
  return stripEmpty({
    '@type': 'MerchantReturnPolicy',
    applicableCountry: cleanString(input.applicableCountry) || 'VN',
    returnPolicyCategory:
      cleanString(input.returnPolicyCategory) ||
      'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: input.merchantReturnDays || 7,
    returnMethod: cleanString(input.returnMethod),
    returnFees: cleanString(input.returnFees),
  })
}

export function buildShippingServiceSchema(input: ShippingServiceInput = {}): SchemaObject {
  return stripEmpty({
    '@type': 'ShippingService',
    name: 'Giao hàng toàn quốc MF Paris',
    description: 'Giao hàng toàn quốc qua đối tác vận chuyển.',
    shippingConditions: {
      '@type': 'ShippingConditions',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'VN',
      },
    },
  })
}

export function buildOfferShippingDetailsSchema(input: OfferShippingDetailsInput = {}): SchemaObject {
  return stripEmpty({
    '@type': 'OfferShippingDetails',
    shippingRate: input.shippingRate
      ? {
        '@type': 'MonetaryAmount',
        value: input.shippingRate,
        currency: cleanString(input.currency) || DEFAULT_CURRENCY,
      }
      : undefined,
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: cleanString(input.shippingDestinationCountry) || 'VN',
    },
    deliveryTime:
      input.deliveryMinDays !== undefined || input.deliveryMaxDays !== undefined
        ? {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: input.deliveryMinDays || 1,
            maxValue: input.deliveryMaxDays || 5,
            unitCode: 'DAY',
          },
        }
        : undefined,
  })
}

export function buildLocalBusinessSchema(input: LocalBusinessInput): SchemaObject {
  const url = absoluteUrl(input.url) || SITE_ORIGIN

  return stripEmpty({
    '@type': 'Store',
    '@id': schemaId(url, 'store'),
    name: cleanString(input.name) || DEFAULT_SITE_NAME,
    url,
    image: buildImageObject(input.image || input.logo, schemaId(url, 'store-image')),
    logo: buildImageObject(input.logo, schemaId(url, 'store-logo')),
    telephone: cleanString(input.telephone),
    email: cleanString(input.email),
    address: typeof input.address === 'string' ? input.address : input.address || undefined,
    geo: input.geo
      ? {
        '@type': 'GeoCoordinates',
        latitude: input.geo.latitude,
        longitude: input.geo.longitude,
      }
      : undefined,
    openingHours: input.openingHours,
    areaServed: 'VN',
    priceRange: cleanString(input.priceRange),
    sameAs: input.sameAs?.map(absoluteUrl).filter(isString),
  })
}

export function buildFAQPageSchema(input: FAQInput, url: string): SchemaObject | null {
  const questions = input.questions
    .filter((item) => cleanString(item.question) && cleanString(item.answer))
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))

  if (!questions.length) {
    return null
  }

  return {
    '@type': 'FAQPage',
    '@id': schemaId(url, 'faq'),
    mainEntity: questions,
  }
}

export function buildVideoObjectSchema(input: VideoInput, url?: string): SchemaObject | null {
  if (!cleanString(input.name) || !cleanString(input.description) || !cleanString(input.uploadDate)) {
    return null
  }

  return stripEmpty({
    '@type': 'VideoObject',
    '@id': url ? schemaId(url, 'video') : undefined,
    name: input.name,
    description: input.description,
    thumbnailUrl: Array.isArray(input.thumbnailUrl)
      ? input.thumbnailUrl.map(absoluteUrl).filter(isString)
      : absoluteUrl(input.thumbnailUrl),
    uploadDate: input.uploadDate,
    contentUrl: absoluteUrl(input.contentUrl || undefined),
    embedUrl: absoluteUrl(input.embedUrl || undefined),
    duration: cleanString(input.duration),
  })
}

function buildDefaultOrganizationInput(input?: {
  logo?: ImageInput | string | null
  organization?: OrganizationInput
}): OrganizationInput {
  return {
    name: 'Marais de France',
    alternateName: [
      'MF Paris',
      'MFParis',
      'MARAIS DE FRANCE - MF PARIS',
      'mfparis.vn',
    ],
    legalName: 'HỘ KINH DOANH MARAIS DE FRANCE',
    url: SITE_ORIGIN,
    logo: input?.organization?.logo || input?.logo || MF_PARIS_LOGO_URL,
    telephone: '+84792979299',
    email: 'mfparisvn@gmail.com',
    address: MF_PARIS_POSTAL_ADDRESS,
    taxID: '058095006998',
    vatID: '058095006998',
    foundingDate: '2018',
    identifier: MF_PARIS_BUSINESS_IDENTIFIER,
    contactPoint: MF_PARIS_CONTACT_POINTS,
    sameAs: MF_PARIS_SAME_AS,
    returnPolicy: {
      applicableCountry: 'VN',
      merchantReturnDays: 7,
      returnPolicyCategory:
        'https://schema.org/MerchantReturnFiniteReturnWindow',
      returnFees:
        'https://schema.org/ReturnFeesCustomerResponsibility',
    },
    shippingService: {
      name: 'Giao hàng toàn quốc MF Paris',
      areaServed: 'VN',
      description:
        'Giao hàng toàn quốc qua đối tác vận chuyển. Nội thành TP.HCM 1-2 ngày làm việc, tỉnh thành khác 2-5 ngày làm việc.',
    },
    ...(input?.organization || {}),
  }
}

export function getMfParisLocalBusinessInput(): LocalBusinessInput {
  return {
    name: 'Marais de France',
    url: SITE_ORIGIN,
    logo: MF_PARIS_LOGO_URL,
    image: MF_PARIS_DEFAULT_OG_IMAGE,
    telephone: '+84792979299',
    email: 'mfparisvn@gmail.com',
    address: MF_PARIS_POSTAL_ADDRESS,
    geo: {
      latitude: 10.8240504,
      longitude: 106.6789258,
    },
    openingHours: ['Mo-Su 08:00-22:00'],
    priceRange: '$$',
    sameAs: MF_PARIS_SAME_AS,
  }
}

function buildSiteIdentitySchemaNodes(input?: {
  logo?: ImageInput | string | null
  organization?: OrganizationInput
}): SchemaObject[] {
  return [
    buildOrganizationSchema(buildDefaultOrganizationInput(input)),
    buildWebSiteSchema('Marais de France'),
  ]
}

export function buildHomeSchemaGraph(input?: {
  title?: string
  description?: string
  logo?: ImageInput | string | null
  organization?: OrganizationInput
  localBusiness?: LocalBusinessInput | null
}): SchemaObject {
  return buildSchemaGraph([
    ...buildSiteIdentitySchemaNodes(input),
    input?.localBusiness ? buildLocalBusinessSchema(input.localBusiness) : null,
    buildWebPageSchema({
      url: '/',
      name: input?.title || DEFAULT_SITE_NAME,
      description: input?.description,
      type: 'WebPage',
    }),
  ])
}

export function buildProductPageSchemaGraph(input: {
  page: WebPageInput
  breadcrumb: BreadcrumbItem[]
  product: ProductInput
  productGroup?: ProductGroupInput | null
  organization?: OrganizationInput
}): SchemaObject {
  const breadcrumb = buildBreadcrumbListSchema(input.page.url, input.breadcrumb)

  return buildSchemaGraph([
    ...buildSiteIdentitySchemaNodes({
      organization: input.organization,
    }),
    buildWebPageSchema({
      ...input.page,
      breadcrumbId: breadcrumb ? schemaId(input.page.url, 'breadcrumb') : undefined,
      mainEntity: {
        '@id': schemaId(input.page.url, input.productGroup ? 'productgroup' : 'product'),
      },
    }),
    breadcrumb,
    input.productGroup ? buildProductGroupSchema(input.productGroup) : buildProductSchema(input.product),
  ])
}

export function buildCollectionPageSchemaGraph(input: {
  page: CollectionPageInput
  organization?: OrganizationInput
}): SchemaObject {
  const breadcrumb = input.page.breadcrumb
    ? buildBreadcrumbListSchema(input.page.url, input.page.breadcrumb)
    : null

  return buildSchemaGraph([
    ...buildSiteIdentitySchemaNodes({
      organization: input.organization,
    }),
    buildCollectionSubjectSchema(input.page),
    buildCollectionPageSchema(input.page),
    buildCollectionItemListSchema(input.page),
    breadcrumb,
  ])
}

export function buildBlogPostingSchemaGraph(input: {
  page: WebPageInput
  article: BlogPostingInput
  breadcrumb: BreadcrumbItem[]
  organization?: OrganizationInput
  relatedItems?: RelatedItemInput[] | null
}): SchemaObject {
  const breadcrumb = buildRankMathBreadcrumbListSchema(input.page.url, input.breadcrumb)

  return buildSchemaGraph([
    buildRankMathPublisherSchema(input.organization),
    buildRankMathWebSiteSchema(),
    buildRankMathArticleImageObject(input.article),
    breadcrumb,
    buildRankMathArticleWebPageSchema(input.page, input.article, breadcrumb),
    buildRankMathArticleAuthorSchema(input.article),
    buildBlogPostingSchema(input.article),
    buildRelatedItemListSchema({
      url: input.page.url,
      id: 'related-posts',
      name: 'Bài viết liên quan',
      itemType: 'BlogPosting',
      items: input.relatedItems,
    }),
  ])
}

export function buildStaticPageSchemaGraph(input: {
  page: WebPageInput
  breadcrumb?: BreadcrumbItem[]
  organization?: OrganizationInput
  faq?: FAQInput | null
  video?: VideoInput | null
  localBusiness?: LocalBusinessInput | null
}): SchemaObject {
  const breadcrumb = input.breadcrumb?.length
    ? buildBreadcrumbListSchema(input.page.url, input.breadcrumb)
    : null

  return buildSchemaGraph([
    ...buildSiteIdentitySchemaNodes({
      organization: input.organization,
    }),
    buildWebPageSchema({
      ...input.page,
      breadcrumbId: breadcrumb ? schemaId(input.page.url, 'breadcrumb') : undefined,
    }),
    breadcrumb,
    input.localBusiness ? buildLocalBusinessSchema(input.localBusiness) : null,
    input.faq ? buildFAQPageSchema(input.faq, input.page.url) : null,
    input.video ? buildVideoObjectSchema(input.video, input.page.url) : null,
  ])
}

export function buildSiteIdentitySchemaGraph(input?: {
  logo?: ImageInput | string | null
  organization?: OrganizationInput
}): SchemaObject {
  return buildSchemaGraph(buildSiteIdentitySchemaNodes(input))
}

