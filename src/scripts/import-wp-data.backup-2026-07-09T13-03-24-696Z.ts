import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import pLimit from 'p-limit'
import { lexicalToHtml } from '@/lib/html/contentHtml'
import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type AnyRecord = Record<string, any>
type ID = string | number

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)

const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const hasFlag = (name: string) => args.includes(name)

const ONLY = getArg('--only', 'all')
const UPDATE_EXISTING = hasFlag('--update')
const SKIP_MEDIA = hasFlag('--skip-media')
const DRY_RUN = hasFlag('--dry-run')
const USE_PLACEHOLDER_FEATURED = hasFlag('--placeholder-featured')
const DISABLE_FALLBACK_BRAND = hasFlag('--no-fallback-brand')

const MEDIA_CONCURRENCY = Math.max(1, Number(getArg('--media-concurrency', '2')) || 2)
const ITEM_LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const ITEM_OFFSET = Math.max(0, Number(getArg('--offset', '0')) || 0)

const mediaLimit = pLimit(MEDIA_CONCURRENCY)

const WP_BASE_URL = 'https://mfparis.vn'
const DATA_DIR = path.resolve(
  getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || 'D:\\new'),
)

const DATA_FILES = {
  brands: 'brands.merged.json',
  brandsFallback: 'brands.json',
  productCategories: 'product-categories.json',
  postCategories: 'post-categories.json',
  productsRaw: 'products.json',
  productsPrepared: 'payload_products_import.json',
  posts: 'posts.json',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

const allowedDisplayLocations = new Set([
  'best-seller',
  'combo',
  'new-arrival',
  'flash-sale',
])

const formatSlug = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

const makeSafeSlug = (value: string, fallbackId?: string | number): string => {
  let slug = formatSlug(value)

  if (!slug) {
    slug = `item-${fallbackId || Date.now()}`
  }

  if (slug.length > 150) {
    slug = slug.slice(0, 150).replace(/-+$/g, '')
  }

  return slug || `item-${fallbackId || Date.now()}`
}

const stripHTML = (html: unknown) =>
  typeof html === 'string'
    ? html
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    : ''

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const optionalNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

const withoutUndefined = (object: AnyRecord) => {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  )
}

function resolveDataFile(filename: string, fallback?: string) {
  const primary = path.resolve(DATA_DIR, filename)

  if (fs.existsSync(primary)) {
    return primary
  }

  if (fallback) {
    const fallbackPath = path.resolve(DATA_DIR, fallback)

    if (fs.existsSync(fallbackPath)) {
      return fallbackPath
    }
  }

  return primary
}

const applySlice = <T>(items: T[]) => {
  const offsetItems = ITEM_OFFSET > 0 ? items.slice(ITEM_OFFSET) : items
  return ITEM_LIMIT > 0 ? offsetItems.slice(0, ITEM_LIMIT) : offsetItems
}

function readJSON<T = AnyRecord>(filename: string, fallback?: string): T[] {
  const filePath = resolveDataFile(filename, fallback)

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Không tìm thấy file: ${filePath}`)
    return []
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)

  if (!Array.isArray(data)) {
    console.warn(`⚠️ File không phải array JSON: ${filePath}`)
    return []
  }

  return applySlice(data)
}

function getRendered(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const record = value as AnyRecord

    if (typeof record.rendered === 'string') {
      return record.rendered
    }
  }

  return ''
}

function normalizeHtml(value: unknown): string {
  if (typeof value === 'string') {
    return sanitizeWordPressHtml(value)
  }

  if (value && typeof value === 'object') {
    const rendered = getRendered(value)

    if (rendered) {
      return sanitizeWordPressHtml(rendered)
    }

    return sanitizeWordPressHtml(lexicalToHtml(value))
  }

  return ''
}

function getRankMathMeta(item: AnyRecord, key: string) {
  if (!Array.isArray(item.meta_data)) {
    return ''
  }

  const found = item.meta_data.find((meta: AnyRecord) => meta.key === key)
  return typeof found?.value === 'string' ? found.value : ''
}

async function findBySlug(payload: any, collection: string, slug: string) {
  const result = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    pagination: false,
  })

  return result.docs[0] || null
}

async function findOne(payload: any, collection: string, where: AnyRecord) {
  const result = await payload.find({
    collection,
    where,
    limit: 1,
    pagination: false,
  })

  return result.docs[0] || null
}

async function createOrUpdateBySlug(
  payload: any,
  collection: string,
  slug: string,
  data: AnyRecord,
) {
  const existing = await findBySlug(payload, collection, slug)

  if (existing?.id && !UPDATE_EXISTING) {
    return { id: existing.id, action: 'skip' as const }
  }

  if (DRY_RUN) {
    return {
      id: existing?.id || `dry-${collection}-${slug}`,
      action: existing?.id ? ('dry-update' as const) : ('dry-create' as const),
    }
  }

  if (existing?.id) {
    const updated = await payload.update({
      collection,
      id: existing.id,
      data,
      overrideAccess: true,
    })

    return { id: updated.id, action: 'update' as const }
  }

  const created = await payload.create({
    collection,
    data,
    overrideAccess: true,
  })

  return { id: created.id, action: 'create' as const }
}

function getImageUrl(image: unknown): string {
  if (!image || typeof image !== 'object') {
    return ''
  }

  const record = image as AnyRecord
  return record.src || record.thumbnail || record.url || ''
}

function getImageAlt(image: unknown, fallback: string): string {
  if (!image || typeof image !== 'object') {
    return fallback
  }

  const record = image as AnyRecord
  return record.alt || record.name || record.title || fallback
}

function getFilenameFromUrl(url: string, fallback = 'wp-media') {
  try {
    const parsed = new URL(url, WP_BASE_URL)
    const basename = path.basename(parsed.pathname)
    return basename || `${fallback}.jpg`
  } catch {
    return `${fallback}.jpg`
  }
}

function getMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase()

  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.avif') return 'image/avif'

  return 'image/jpeg'
}

async function uploadMedia(payload: any, url: string, alt: string) {
  if (!url || SKIP_MEDIA) {
    return null
  }

  return mediaLimit(async () => {
    const normalizedUrl = new URL(url, WP_BASE_URL).toString()
    const filename = getFilenameFromUrl(normalizedUrl, makeSafeSlug(alt || 'wp-media'))

    const existing = await findOne(payload, 'media', {
      filename: { equals: filename },
    })

    if (existing?.id) {
      return existing.id
    }

    if (DRY_RUN) {
      return `dry-media-${filename}`
    }

    const response = await fetch(normalizedUrl, {
      headers: { 'user-agent': USER_AGENT },
    })

    if (!response.ok) {
      throw new Error(`Không tải được ảnh ${normalizedUrl}: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || filename,
      },
      file: {
        data: buffer,
        name: filename,
        mimetype: getMimeType(filename),
        size: buffer.length,
      },
      overrideAccess: true,
    })

    return media.id
  })
}

async function fetchWPFeaturedMediaUrl(mediaId: unknown) {
  const id = Number(mediaId)

  if (!Number.isFinite(id) || id <= 0 || SKIP_MEDIA) {
    return ''
  }

  try {
    const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/media/${id}`, {
      headers: { 'user-agent': USER_AGENT },
    })

    if (!response.ok) {
      return ''
    }

    const media = (await response.json()) as AnyRecord

    return (
      media.source_url ||
      media.guid?.rendered ||
      media.media_details?.sizes?.full?.source_url ||
      ''
    )
  } catch {
    return ''
  }
}

async function createPlaceholderMedia(payload: any) {
  const filename = 'mfparis-placeholder-featured.png'

  const existing = await findOne(payload, 'media', {
    filename: { equals: filename },
  })

  if (existing?.id) {
    return existing.id
  }

  if (DRY_RUN) {
    return 'dry-placeholder-media'
  }

  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
  const buffer = Buffer.from(pngBase64, 'base64')

  const media = await payload.create({
    collection: 'media',
    data: {
      alt: 'MF Paris Placeholder',
    },
    file: {
      data: buffer,
      name: filename,
      mimetype: 'image/png',
      size: buffer.length,
    },
    overrideAccess: true,
  })

  return media.id
}

async function getFallbackBrand(payload: any) {
  if (DISABLE_FALLBACK_BRAND) {
    return undefined
  }

  const slug = 'mf-paris'

  const result = await createOrUpdateBySlug(payload, 'brands', slug, {
    name: 'MF Paris',
    slug,
    description: '<p>Thương hiệu tạm dùng cho dữ liệu import chưa map được brand.</p>',
    isFeatured: false,
  })

  return result.id
}

async function importBrands(payload: any) {
  const brandsData = readJSON<AnyRecord>(
    DATA_FILES.brands,
    DATA_FILES.brandsFallback,
  )
  const brandMap = new Map<number, ID>()

  console.log(`\n📦 Import Brands: ${brandsData.length}`)

  for (const item of brandsData) {
    try {
      const slug = makeSafeSlug(item.slug || item.name || `brand-${item.id}`, item.id)
      const imageUrl = getImageUrl(item.image)
      const logo = imageUrl ? await uploadMedia(payload, imageUrl, item.name || slug) : null

      const result = await createOrUpdateBySlug(payload, 'brands', slug, {
        name: item.name || slug,
        slug,
        description: normalizeHtml(item.description),
        logo: logo || undefined,
        isFeatured: Boolean(item.count && Number(item.count) > 0),
      })

      if (item.id) {
        brandMap.set(Number(item.id), result.id)
      }

      console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Brand: ${item.name || slug}`)
    } catch (error: any) {
      console.error(`   ❌ Brand lỗi: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  await getFallbackBrand(payload)

  return brandMap
}

async function importProductCategories(payload: any) {
  const categoriesData = readJSON<AnyRecord>(DATA_FILES.productCategories)
  const categoryMap = new Map<number, ID>()
  const pendingParents: Array<{ id: number; parent: number }> = []

  console.log(`\n📦 Import Product Categories: ${categoriesData.length}`)

  for (const item of categoriesData) {
    try {
      const slug = makeSafeSlug(item.slug || item.name || `category-${item.id}`, item.id)
      const imageUrl = getImageUrl(item.image)
      const image = imageUrl ? await uploadMedia(payload, imageUrl, item.name || slug) : null

      const result = await createOrUpdateBySlug(payload, 'categories', slug, {
        name: item.name || slug,
        slug,
        description: normalizeHtml(item.description),
        image: image || undefined,
      })

      if (item.id) {
        categoryMap.set(Number(item.id), result.id)
      }

      if (item.id && item.parent) {
        pendingParents.push({ id: Number(item.id), parent: Number(item.parent) })
      }

      console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Category: ${item.name || slug}`)
    } catch (error: any) {
      console.error(`   ❌ Category lỗi: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  if (!DRY_RUN) {
    for (const item of pendingParents) {
      const currentId = categoryMap.get(item.id)
      const parentId = categoryMap.get(item.parent)

      if (!currentId || !parentId) {
        continue
      }

      await payload.update({
        collection: 'categories',
        id: currentId,
        data: { parent: parentId },
        overrideAccess: true,
      })
    }
  }

  return categoryMap
}

async function importPostCategories(payload: any) {
  const categoriesData = readJSON<AnyRecord>(DATA_FILES.postCategories)
  const categoryMap = new Map<number, ID>()

  console.log(`\n📦 Import Post Categories: ${categoriesData.length}`)

  for (const item of categoriesData) {
    try {
      const slug = makeSafeSlug(item.slug || item.name || `post-category-${item.id}`, item.id)

      const result = await createOrUpdateBySlug(payload, 'post-categories', slug, {
        title: item.name || slug,
        slug,
        description: stripHTML(item.description),
      })

      if (item.id) {
        categoryMap.set(Number(item.id), result.id)
      }

      console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Post Category: ${item.name || slug}`)
    } catch (error: any) {
      console.error(`   ❌ Post Category lỗi: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  return categoryMap
}

function mapBySlug(items: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()

  for (const item of items) {
    if (item.slug) {
      map.set(String(item.slug), item)
    }
  }

  return map
}

async function resolveBrandIds(payload: any, rawProduct: AnyRecord, brandMap: Map<number, ID>) {
  const brands = Array.isArray(rawProduct.brands) ? rawProduct.brands : []

  for (const brand of brands) {
    const byId = brandMap.get(Number(brand.id))

    if (byId) {
      return byId
    }

    const slug = makeSafeSlug(brand.slug || brand.name || `brand-${brand.id}`, brand.id)
    const existing = await findBySlug(payload, 'brands', slug)

    if (existing?.id) {
      return existing.id
    }

    const result = await createOrUpdateBySlug(payload, 'brands', slug, {
      name: brand.name || slug,
      slug,
      description: '',
    })

    return result.id
  }

  return getFallbackBrand(payload)
}

async function resolveCategoryIds(
  payload: any,
  rawProduct: AnyRecord,
  categoryMap: Map<number, ID>,
) {
  const categories = Array.isArray(rawProduct.categories) ? rawProduct.categories : []
  const ids: ID[] = []

  for (const category of categories) {
    const byId = categoryMap.get(Number(category.id))

    if (byId) {
      ids.push(byId)
      continue
    }

    const slug = makeSafeSlug(category.slug || category.name || `category-${category.id}`, category.id)
    const existing = await findBySlug(payload, 'categories', slug)

    if (existing?.id) {
      ids.push(existing.id)
      continue
    }

    const result = await createOrUpdateBySlug(payload, 'categories', slug, {
      name: category.name || slug,
      slug,
      description: '',
    })

    ids.push(result.id)
  }

  return Array.from(new Set(ids))
}

function normalizeSpecifications(rawProduct: AnyRecord, preparedProduct?: AnyRecord) {
  if (Array.isArray(preparedProduct?.specifications)) {
    return preparedProduct.specifications.filter(Boolean)
  }

  const attributes = Array.isArray(rawProduct.attributes) ? rawProduct.attributes : []

  return attributes
    .map((attribute: AnyRecord) => ({
      label: attribute.name || attribute.slug || '',
      value: Array.isArray(attribute.options)
        ? attribute.options.join(', ')
        : String(attribute.option || attribute.value || ''),
    }))
    .filter((item: AnyRecord) => item.label && item.value)
}

function normalizeVariants(preparedProduct?: AnyRecord) {
  const variants = Array.isArray(preparedProduct?.variants)
    ? preparedProduct.variants
    : []

  return variants
    .map((variant: AnyRecord, index: number) =>
      withoutUndefined({
        name: variant.name || `Variant ${index + 1}`,
        sku: variant.sku || '',
        isDefault: Boolean(variant.isDefault || index === 0),
        basePrice: toNumber(variant.basePrice || variant.price || variant.regularPrice, 0),
        salePrice: optionalNumber(variant.salePrice),
        stock: toNumber(variant.stock, 0),
        isActive: variant.isActive !== false,
      }),
    )
    .filter((variant: AnyRecord) => variant.name && variant.basePrice > 0)
}

function normalizePrice(rawProduct: AnyRecord, preparedProduct?: AnyRecord, variants: AnyRecord[] = []) {
  if (variants.length > 0) {
    const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0]

    return withoutUndefined({
      basePrice: toNumber(defaultVariant.basePrice, 0),
      salePrice: optionalNumber(defaultVariant.salePrice),
      stock: variants.reduce((total, variant) => total + toNumber(variant.stock, 0), 0),
    })
  }

  const preparedPrice = preparedProduct?.price || {}

  return withoutUndefined({
    basePrice: toNumber(
      preparedPrice.basePrice ||
        rawProduct.regular_price ||
        rawProduct.price,
      0,
    ),
    salePrice: optionalNumber(preparedPrice.salePrice || rawProduct.sale_price),
    stock: toNumber(
      preparedPrice.stock ??
        rawProduct.stock_quantity ??
        (rawProduct.stock_status === 'instock' ? 1 : 0),
      0,
    ),
  })
}

function normalizeDisplayLocation(preparedProduct?: AnyRecord) {
  const value = preparedProduct?.displayLocation

  if (!Array.isArray(value)) {
    return undefined
  }

  const locations = value.filter((item) => allowedDisplayLocations.has(item))

  return locations.length ? locations : undefined
}

async function normalizeProductImages(payload: any, rawProduct: AnyRecord) {
  const images = Array.isArray(rawProduct.images) ? rawProduct.images : []
  const uploaded: Array<{ image: ID }> = []

  for (const image of images) {
    const url = getImageUrl(image)
    const mediaId = url ? await uploadMedia(payload, url, getImageAlt(image, rawProduct.name)) : null

    if (mediaId) {
      uploaded.push({ image: mediaId })
    }
  }

  return uploaded
}

async function importProducts(
  payload: any,
  brandMap = new Map<number, ID>(),
  categoryMap = new Map<number, ID>(),
) {
  const rawProducts = readJSON<AnyRecord>(DATA_FILES.productsRaw)
  const preparedBySlug = mapBySlug(readJSON<AnyRecord>(DATA_FILES.productsPrepared))

  console.log(`\n📦 Import Products: ${rawProducts.length}`)

  for (const rawProduct of rawProducts) {
    const name = rawProduct.name || rawProduct.title || rawProduct.slug || `Product ${rawProduct.id}`

    try {
      const slug = makeSafeSlug(rawProduct.slug || name, rawProduct.id)
      const preparedProduct = preparedBySlug.get(slug)
      const brandId = await resolveBrandIds(payload, rawProduct, brandMap)
      const categoryIds = await resolveCategoryIds(payload, rawProduct, categoryMap)
      const variants = normalizeVariants(preparedProduct)
      const productType =
        preparedProduct?.productType === 'variable' || rawProduct.type === 'variable'
          ? 'variable'
          : 'simple'

      const productData = withoutUndefined({
        title: preparedProduct?.title || name,
        sku: preparedProduct?.sku || rawProduct.sku || '',
        slug,
        brand: brandId,
        categories: categoryIds,
        productType,
        price: normalizePrice(rawProduct, preparedProduct, variants),
        shortDescription: stripHTML(rawProduct.short_description || preparedProduct?.shortDescription || ''),
        specifications: normalizeSpecifications(rawProduct, preparedProduct),
        description: normalizeHtml(rawProduct.description || preparedProduct?.description || ''),
        isCombo: Boolean(preparedProduct?.isCombo),
        comboItems: Array.isArray(preparedProduct?.comboItems) ? preparedProduct.comboItems : [],
        variants: productType === 'variable' && variants.length ? variants : undefined,
        images: await normalizeProductImages(payload, rawProduct),
        seoTitle: getRankMathMeta(rawProduct, 'rank_math_title') || undefined,
        seoDescription:
          getRankMathMeta(rawProduct, 'rank_math_description') ||
          stripHTML(rawProduct.short_description) ||
          undefined,
        status:
          preparedProduct?.status === 'published' || rawProduct.status === 'publish'
            ? 'published'
            : 'draft',
        displayLocation: normalizeDisplayLocation(preparedProduct),
      })

      if (!productData.images?.length) {
        delete productData.images
      }

      const result = await createOrUpdateBySlug(payload, 'products', slug, productData)

      console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Product: ${name}`)
    } catch (error: any) {
      console.error(`   ❌ Product lỗi: ${name} - ${error.message}`)
    }
  }
}

async function resolvePostCategoryIds(
  payload: any,
  post: AnyRecord,
  postCategoryMap: Map<number, ID>,
) {
  const categoryIds: ID[] = []

  for (const wpCategoryId of Array.isArray(post.categories) ? post.categories : []) {
    const byId = postCategoryMap.get(Number(wpCategoryId))

    if (byId) {
      categoryIds.push(byId)
      continue
    }

    const category = readJSON<AnyRecord>(DATA_FILES.postCategories).find(
      (item) => Number(item.id) === Number(wpCategoryId),
    )

    if (!category) {
      continue
    }

    const slug = makeSafeSlug(category.slug || category.name || `post-category-${category.id}`, category.id)
    const existing = await findBySlug(payload, 'post-categories', slug)

    if (existing?.id) {
      categoryIds.push(existing.id)
    }
  }

  return Array.from(new Set(categoryIds))
}

async function importPosts(payload: any, postCategoryMap = new Map<number, ID>()) {
  const postsData = readJSON<AnyRecord>(DATA_FILES.posts)

  console.log(`\n📦 Import Posts: ${postsData.length}`)

  let placeholderMediaId: ID | null = null

  if (USE_PLACEHOLDER_FEATURED || SKIP_MEDIA) {
    placeholderMediaId = await createPlaceholderMedia(payload)
  }

  for (const item of postsData) {
    const title = stripHTML(getRendered(item.title) || item.title || item.slug || `Post ${item.id}`)

    try {
      const slug = makeSafeSlug(item.slug || title, item.id)
      const categories = await resolvePostCategoryIds(payload, item, postCategoryMap)
      const featuredImageUrl = await fetchWPFeaturedMediaUrl(item.featured_media)
      const featuredImageId =
        (featuredImageUrl ? await uploadMedia(payload, featuredImageUrl, title) : null) ||
        placeholderMediaId

      if (!featuredImageId) {
        console.warn(`   ⚠️ Bỏ qua post vì thiếu thumbnail required: ${title}`)
        continue
      }

      const result = await createOrUpdateBySlug(payload, 'posts', slug, {
        title,
        slug,
        thumbnail: featuredImageId,
        categories,
        content: normalizeHtml(item.content),
        excerpt: stripHTML(getRendered(item.excerpt) || item.excerpt || ''),
        seo: withoutUndefined({
          metaTitle: title || undefined,
          metaDescription: stripHTML(getRendered(item.excerpt) || '').slice(0, 160) || undefined,
        }),
      })

      console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Post: ${title}`)
    } catch (error: any) {
      console.error(`   ❌ Post lỗi: ${title} - ${error.message}`)
    }
  }
}

async function run() {
  console.log(`📂 Data dir: ${DATA_DIR}`)
  console.log(`🎯 Mode: ${ONLY}`)
  console.log(`🧪 Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`🖼️ Skip media: ${SKIP_MEDIA ? 'yes' : 'no'}`)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  let brandMap = new Map<number, ID>()
  let productCategoryMap = new Map<number, ID>()
  let postCategoryMap = new Map<number, ID>()

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'brands') {
    brandMap = await importBrands(payload)
  }

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'product-categories') {
    productCategoryMap = await importProductCategories(payload)
  }

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'post-categories') {
    postCategoryMap = await importPostCategories(payload)
  }

  if (ONLY === 'all' || ONLY === 'products') {
    if (!brandMap.size) {
      brandMap = await importBrands(payload)
    }

    if (!productCategoryMap.size) {
      productCategoryMap = await importProductCategories(payload)
    }

    await importProducts(payload, brandMap, productCategoryMap)
  }

  if (ONLY === 'all' || ONLY === 'posts') {
    if (!postCategoryMap.size) {
      postCategoryMap = await importPostCategories(payload)
    }

    await importPosts(payload, postCategoryMap)
  }

  console.log('\n✅ Import hoàn tất.')
  process.exit(0)
}

run().catch((error) => {
  console.error('❌ Import thất bại:', error)
  process.exit(1)
})
