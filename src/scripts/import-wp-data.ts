import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import pLimit from 'p-limit'
import sharp from 'sharp'
import { lexicalToHtml } from '@/lib/html/contentHtml'
import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type AnyRecord = Record<string, any>
type ID = string | number

type MediaRef = {
  id: ID
  url: string
  filename: string
}

type ImportMaps = {
  attributes: Map<number | string, ID>
  attributeValues: Map<string, ID>
  brands: Map<number, ID>
  productCategories: Map<number, ID>
  postCategories: Map<number, ID>
}

type HtmlMediaContext = {
  altFallback: string
  importedFrom?: 'wordpress' | 'woocommerce'
  preferredMediaByFilename?: Map<string, MediaRef>
}

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
const IMPORT_STOCK_QUANTITY = Math.max(0, Number(getArg('--import-stock', '99')) || 99)

const MEDIA_CONCURRENCY = Math.max(1, Number(getArg('--media-concurrency', '3')) || 3)
const ITEM_LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const ITEM_OFFSET = Math.max(0, Number(getArg('--offset', '0')) || 0)

const mediaLimit = pLimit(MEDIA_CONCURRENCY)

const WP_BASE_URL = getArg('--wp-base-url', process.env.WP_BASE_URL || 'https://mfparis.vn')
const DEFAULT_DATA_DIR = path.resolve(__dirname, 'export')
const DATA_DIR = path.resolve(
  getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || DEFAULT_DATA_DIR),
)

const DATA_FILES = {
  brands: 'brands.merged.json',
  brandsFallback: 'brands.json',
  productCategories: 'product-categories.merged.json',
  productCategoriesFallback: 'product-categories.json',
  postCategories: 'post-categories.merged.json',
  postCategoriesFallback: 'post-categories.json',
  productAttributes: 'product-attributes-with-terms.json',
  productsRaw: 'products-with-variations.json',
  productsRawFallback: 'products.json',
  productsPrepared: 'payload_products_import.json',
  posts: 'posts.json',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

const allowedDisplayLocations = new Set(['best-seller', 'combo', 'new-arrival', 'flash-sale'])
const mediaBySourceUrl = new Map<string, MediaRef>()
const mediaByFilename = new Map<string, MediaRef>()

function formatSlug(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Ä‘Ä]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeSafeSlug(value: string, fallbackId?: string | number): string {
  let slug = formatSlug(value)

  if (!slug) {
    slug = `item-${fallbackId || Date.now()}`
  }

  if (slug.length > 150) {
    slug = slug.slice(0, 150).replace(/-+$/g, '')
  }

  return slug || `item-${fallbackId || Date.now()}`
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#215;/g, 'x')
}

function stripHTML(html: unknown): string {
  return typeof html === 'string'
    ? decodeBasicEntities(html)
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizePayloadTextarea(value: unknown): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

function buildPlainHtmlFallback(html: string): string {
  const text = normalizePayloadTextarea(stripHTML(html))

  return text ? `<p>${escapeHtmlText(text)}</p>` : ''
}

function isContentValidationError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error
        ? String((error as AnyRecord).message || '')
        : String(error || '')

  const payloadErrors =
    typeof error === 'object' && error
      ? JSON.stringify((error as AnyRecord).data || (error as AnyRecord).errors || '')
      : ''

  return /Nội dung bài viết|Ná»™i dung bÃ i viáº¿t|content/i.test(
    `${message} ${payloadErrors}`,
  )
}

function toNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function optionalNumber(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function withoutUndefined(object: AnyRecord) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}

function normalizeImportedTimestamp(value: unknown, isGmt = false): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  const normalized = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T')
  const withTimezone =
    isGmt && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)
      ? `${normalized}Z`
      : normalized
  const date = new Date(withTimezone)

  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

function getImportedTimestamps(item: AnyRecord) {
  const createdAt =
    normalizeImportedTimestamp(item.date_created_gmt, true) ||
    normalizeImportedTimestamp(item.date_gmt, true) ||
    normalizeImportedTimestamp(item.date_created) ||
    normalizeImportedTimestamp(item.date)
  const updatedAt =
    normalizeImportedTimestamp(item.date_modified_gmt, true) ||
    normalizeImportedTimestamp(item.modified_gmt, true) ||
    normalizeImportedTimestamp(item.date_modified) ||
    normalizeImportedTimestamp(item.modified) ||
    normalizeImportedTimestamp(item.updated_at) ||
    createdAt

  return withoutUndefined({
    createdAt,
    updatedAt,
  })
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

function applyItemSlice<T>(items: T[]) {
  const offsetItems = ITEM_OFFSET > 0 ? items.slice(ITEM_OFFSET) : items
  return ITEM_LIMIT > 0 ? offsetItems.slice(0, ITEM_LIMIT) : offsetItems
}

function readJSON<T = AnyRecord>(
  filename: string,
  fallback?: string,
  options: { slice?: boolean } = {},
): T[] {
  const filePath = resolveDataFile(filename, fallback)

  if (!fs.existsSync(filePath)) {
    console.warn(`Missing data file: ${filePath}`)
    return []
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  if (!Array.isArray(data)) {
    console.warn(`Data file is not a JSON array: ${filePath}`)
    return []
  }

  return options.slice ? applyItemSlice(data) : data
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

function getRawHtml(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const rendered = getRendered(value)
    return rendered || lexicalToHtml(value)
  }

  return ''
}

function normalizeHtmlOnly(value: unknown): string {
  return sanitizeWordPressHtml(getRawHtml(value))
}

function getRankMathMeta(item: AnyRecord, key: string) {
  if (!Array.isArray(item.meta_data)) {
    return ''
  }

  const found = item.meta_data.find((meta: AnyRecord) => meta.key === key)
  return typeof found?.value === 'string' ? found.value : ''
}

async function findOne(payload: any, collection: string, where: AnyRecord) {
  const result = await payload.find({
    collection,
    where,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0] || null
}

async function findBySlug(payload: any, collection: string, slug: string) {
  return findOne(payload, collection, { slug: { equals: slug } })
}

async function createOrUpdateBySlug(payload: any, collection: string, slug: string, data: AnyRecord) {
  const existing = await findBySlug(payload, collection, slug)

  if (existing?.id && !UPDATE_EXISTING) {
    return { id: existing.id, doc: existing, action: 'skip' as const }
  }

  if (DRY_RUN) {
    return {
      id: existing?.id || `dry-${collection}-${slug}`,
      doc: { ...(existing || {}), id: existing?.id || `dry-${collection}-${slug}`, ...data },
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

    return { id: updated.id, doc: updated, action: 'update' as const }
  }

  const created = await payload.create({
    collection,
    data,
    overrideAccess: true,
  })

  return { id: created.id, doc: created, action: 'create' as const }
}

function getImageUrl(image: unknown): string {
  if (!image || typeof image !== 'object') {
    return ''
  }

  const record = image as AnyRecord
  return record.src || record.source_url || record.thumbnail || record.url || ''
}

function getImageAlt(image: unknown, fallback: string): string {
  if (!image || typeof image !== 'object') {
    return fallback
  }

  const record = image as AnyRecord
  return stripHTML(record.alt || record.name || record.title || fallback)
}

function getImageCaption(image: unknown): string {
  if (!image || typeof image !== 'object') {
    return ''
  }

  const record = image as AnyRecord
  return stripHTML(record.caption || record.description || '')
}

const MAX_IMPORT_FILENAME_LENGTH = 110
const MAX_IMPORT_FILENAME_STEM_LENGTH = 72

function safeDecodeUriPart(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function shortStableHash(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function normalizeImportFilename(basename: string, fallback: string, source = '') {
  const cleanBasename = safeDecodeUriPart(String(basename || '')).replace(/[\\/]+/g, '-')
  const extFromBasename = path.extname(cleanBasename).toLowerCase()
  const ext = /^\.(jpe?g|png|gif|webp|avif|svg)$/i.test(extFromBasename)
    ? extFromBasename
    : '.jpg'
  const stemSource = extFromBasename
    ? cleanBasename.slice(0, -extFromBasename.length)
    : cleanBasename
  const stemFallback = makeSafeSlug(fallback || 'wp-media')
  const stem = makeSafeSlug(stemSource || stemFallback)
  const hash = shortStableHash(source || cleanBasename || stemFallback)
  const maxStemLength = Math.min(
    MAX_IMPORT_FILENAME_STEM_LENGTH,
    MAX_IMPORT_FILENAME_LENGTH - ext.length - hash.length - 1,
  )
  const shortStem = stem.slice(0, Math.max(16, maxStemLength)).replace(/-+$/g, '') || stemFallback

  return `${shortStem}-${hash}${ext}`
}

function getFilenameFromUrl(url: string, fallback = 'wp-media') {
  try {
    const parsed = new URL(url, WP_BASE_URL)
    const basename = path.basename(parsed.pathname)
    return normalizeImportFilename(basename, fallback, parsed.toString())
  } catch {
    return normalizeImportFilename('', fallback, url)
  }
}

function normalizeFilenameKey(value: string): string {
  const filename = getFilenameFromUrl(value).toLowerCase()
  return filename
    .replace(/\?.*$/g, '')
    .replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '')
}

function getMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.svg') return 'image/svg+xml'
  return 'image/jpeg'
}

const MAX_IMPORT_IMAGE_DIMENSION = 2400
const MAX_IMPORT_IMAGE_PIXELS = 12_000_000
const MAX_IMPORT_IMAGE_BYTES = 8 * 1024 * 1024

type PreparedImportImage = {
  buffer: Buffer
  filename: string
  mimetype: string
}

function replaceFileExtension(filename: string, extension: string) {
  const currentExtension = path.extname(filename)
  const stem = currentExtension ? filename.slice(0, -currentExtension.length) : filename

  return `${stem}${extension}`
}

async function prepareImportImageBuffer(
  buffer: Buffer,
  filename: string,
  sourceUrl: string,
): Promise<PreparedImportImage | null> {
  const extension = path.extname(filename).toLowerCase()

  if (extension === '.svg') {
    return {
      buffer,
      filename,
      mimetype: getMimeType(filename),
    }
  }

  try {
    const image = sharp(buffer, {
      failOn: 'none',
      limitInputPixels: false,
    }).rotate()

    const metadata = await image.metadata()
    const width = Number(metadata.width || 0)
    const height = Number(metadata.height || 0)
    const pixels = width * height
    const shouldNormalize =
      width > MAX_IMPORT_IMAGE_DIMENSION ||
      height > MAX_IMPORT_IMAGE_DIMENSION ||
      pixels > MAX_IMPORT_IMAGE_PIXELS ||
      buffer.length > MAX_IMPORT_IMAGE_BYTES ||
      extension === '.avif' ||
      extension === '.heic' ||
      extension === '.heif'

    if (!shouldNormalize) {
      return {
        buffer,
        filename,
        mimetype: getMimeType(filename),
      }
    }

    const normalizedBuffer = await image
      .resize({
        width: MAX_IMPORT_IMAGE_DIMENSION,
        height: MAX_IMPORT_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 4,
      })
      .toBuffer()

    const normalizedFilename = replaceFileExtension(filename, '.webp')

    console.warn(
      `   Media warning: normalized large image ${sourceUrl} -> ${normalizedFilename}`,
    )

    return {
      buffer: normalizedBuffer,
      filename: normalizedFilename,
      mimetype: 'image/webp',
    }
  } catch (error: any) {
    console.warn(`   Media warning: skip invalid image ${sourceUrl} - ${error?.message || error}`)
    return null
  }
}

function getPayloadMediaUrl(doc: AnyRecord, fallbackFilename: string) {
  return doc.url || `/api/media/file/${doc.filename || fallbackFilename}`
}

function rememberMedia(ref: MediaRef, sourceUrl?: string) {
  if (sourceUrl) {
    mediaBySourceUrl.set(new URL(sourceUrl, WP_BASE_URL).toString(), ref)
  }

  mediaByFilename.set(normalizeFilenameKey(ref.filename), ref)
}

async function findExistingMedia(payload: any, normalizedUrl: string, filename: string) {
  const cachedByUrl = mediaBySourceUrl.get(normalizedUrl)
  if (cachedByUrl) return cachedByUrl

  const filenameKey = normalizeFilenameKey(filename)
  const cachedByFilename = mediaByFilename.get(filenameKey)
  if (cachedByFilename) return cachedByFilename

  const sourceUrlExisting = await findOne(payload, 'media', {
    sourceUrl: { equals: normalizedUrl },
  })

  if (sourceUrlExisting?.id) {
    const ref = {
      id: sourceUrlExisting.id,
      url: getPayloadMediaUrl(sourceUrlExisting, filename),
      filename: sourceUrlExisting.filename || filename,
    }
    rememberMedia(ref, normalizedUrl)
    return ref
  }

  const sourceFilenameExisting = await findOne(payload, 'media', {
    sourceFilename: { equals: filename },
  })

  if (sourceFilenameExisting?.id) {
    const ref = {
      id: sourceFilenameExisting.id,
      url: getPayloadMediaUrl(sourceFilenameExisting, filename),
      filename: sourceFilenameExisting.filename || filename,
    }
    rememberMedia(ref, normalizedUrl)
    return ref
  }

  const filenameExisting = await findOne(payload, 'media', {
    filename: { equals: filename },
  })

  if (filenameExisting?.id) {
    const ref = {
      id: filenameExisting.id,
      url: getPayloadMediaUrl(filenameExisting, filename),
      filename: filenameExisting.filename || filename,
    }
    rememberMedia(ref, normalizedUrl)
    return ref
  }

  return null
}

async function uploadMedia(
  payload: any,
  url: string,
  alt: string,
  options: {
    caption?: string
    title?: string
    wpId?: number
    importedFrom?: 'wordpress' | 'woocommerce'
    preferredMediaByFilename?: Map<string, MediaRef>
  } = {},
): Promise<MediaRef | null> {
  if (!url || SKIP_MEDIA) {
    return null
  }

  return mediaLimit(async () => {
    const normalizedUrl = new URL(url, WP_BASE_URL).toString()
    const filename = getFilenameFromUrl(normalizedUrl, makeSafeSlug(alt || 'wp-media'))
    const filenameKey = normalizeFilenameKey(filename)
    const preferred = options.preferredMediaByFilename?.get(filenameKey)

    if (preferred) {
      mediaBySourceUrl.set(normalizedUrl, preferred)
      return preferred
    }

    if (options.wpId) {
      const existingByWpId = await findOne(payload, 'media', {
        wpId: { equals: options.wpId },
      })

      if (existingByWpId?.id) {
        const ref = {
          id: existingByWpId.id,
          url: getPayloadMediaUrl(existingByWpId, filename),
          filename: existingByWpId.filename || filename,
        }

        rememberMedia(ref, normalizedUrl)
        return ref
      }
    }

    const existing = await findExistingMedia(payload, normalizedUrl, filename)

    if (existing) {
      return existing
    }

    const dryRef = {
      id: `dry-media-${filename}`,
      url: `/api/media/file/${filename}`,
      filename,
    }

    if (DRY_RUN) {
      rememberMedia(dryRef, normalizedUrl)
      return dryRef
    }

    let response: Awaited<ReturnType<typeof fetch>>

    try {
      response = await fetch(normalizedUrl, {
        headers: { 'user-agent': USER_AGENT },
      })
    } catch (error: any) {
      console.warn(`   Media warning: skip image ${normalizedUrl} - ${error?.message || error}`)
      return null
    }

    if (!response.ok) {
      console.warn(`   Media warning: skip image ${normalizedUrl} - HTTP ${response.status}`)
      return null
    }

    let downloadedBuffer: Buffer

    try {
      downloadedBuffer = Buffer.from(await response.arrayBuffer())
    } catch (error: any) {
      console.warn(`   Media warning: cannot read image ${normalizedUrl} - ${error?.message || error}`)
      return null
    }

    const preparedImage = await prepareImportImageBuffer(
      downloadedBuffer,
      filename,
      normalizedUrl,
    )

    if (!preparedImage) {
      return null
    }

    let media: any

    try {
      media = await payload.create({
        collection: 'media',
        data: withoutUndefined({
          alt: alt || filename,
          title: options.title || alt || filename,
          caption: options.caption || undefined,
          wpId: options.wpId || undefined,
          sourceUrl: normalizedUrl,
          sourceFilename: filename,
          importedFrom: options.importedFrom || 'wordpress',
        }),
        file: {
          data: preparedImage.buffer,
          name: preparedImage.filename,
          mimetype: preparedImage.mimetype,
          size: preparedImage.buffer.length,
        },
        overrideAccess: true,
      })
    } catch (error: any) {
      console.warn(`   Media warning: cannot create media ${filename} - ${error?.message || error}`)
      return null
    }

    const ref = {
      id: media.id,
      url: getPayloadMediaUrl(media, filename),
      filename: media.filename || preparedImage.filename,
    }

    rememberMedia(ref, normalizedUrl)
    return ref
  })
}

function extractAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'))
  return match?.[1] || ''
}

function removeAttribute(tag: string, attribute: string) {
  return tag.replace(new RegExp(`\\s${attribute}=["'][^"']*["']`, 'gi'), '')
}

function setAttribute(tag: string, attribute: string, value: string) {
  const escapedValue = value.replace(/"/g, '&quot;')
  const attributePattern = new RegExp(`(\\s${attribute}=)["'][^"']*["']`, 'i')

  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, `$1"${escapedValue}"`)
  }

  return tag.replace(/\/?>$/, (ending) => ` ${attribute}="${escapedValue}"${ending}`)
}

function isImportableImageUrl(url: string) {
  if (!url || url.startsWith('data:') || url.startsWith('#')) {
    return false
  }

  if (url.includes('/themes/woodmart/images/lazy.svg')) {
    return false
  }

  return (
    /wp-content\/uploads/i.test(url) ||
    /\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i.test(url)
  )
}

function srcsetUrls(value: string) {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
}

function extractImageUrlsFromHtml(html: string) {
  const urls = new Set<string>()
  const imgTags = html.match(/<img\b[^>]*>/gi) || []

  for (const tag of imgTags) {
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
      const value = extractAttribute(tag, attr)
      if (isImportableImageUrl(value)) {
        urls.add(value)
      }
    }

    for (const attr of ['srcset', 'data-srcset']) {
      for (const url of srcsetUrls(extractAttribute(tag, attr))) {
        if (isImportableImageUrl(url)) {
          urls.add(url)
        }
      }
    }
  }

  return Array.from(urls)
}

function replaceAllLiteral(value: string, from: string, to: string) {
  return value.split(from).join(to)
}

function getReplacementUrl(replacements: Map<string, string>, sourceUrl: string) {
  if (!sourceUrl) {
    return ''
  }

  const direct = replacements.get(sourceUrl)
  if (direct) {
    return direct
  }

  try {
    return replacements.get(new URL(sourceUrl, WP_BASE_URL).toString()) || ''
  } catch {
    return ''
  }
}

function getBestImageReplacement(tag: string, replacements: Map<string, string>) {
  for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
    const replacement = getReplacementUrl(replacements, extractAttribute(tag, attr))
    if (replacement) {
      return replacement
    }
  }

  for (const attr of ['data-srcset', 'srcset']) {
    for (const url of srcsetUrls(extractAttribute(tag, attr))) {
      const replacement = getReplacementUrl(replacements, url)
      if (replacement) {
        return replacement
      }
    }
  }

  return ''
}

function rewriteImageTagsWithMediaUrls(html: string, replacements: Map<string, string>) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const replacement = getBestImageReplacement(tag, replacements)

    if (!replacement) {
      return tag
    }

    let nextTag = tag
    nextTag = setAttribute(nextTag, 'src', replacement)
    nextTag = removeAttribute(nextTag, 'srcset')
    nextTag = removeAttribute(nextTag, 'data-src')
    nextTag = removeAttribute(nextTag, 'data-lazy-src')
    nextTag = removeAttribute(nextTag, 'data-original')
    nextTag = removeAttribute(nextTag, 'data-srcset')
    nextTag = removeAttribute(nextTag, 'data-lazy-srcset')

    return nextTag
  })
}

async function normalizeHtmlWithMedia(
  payload: any,
  value: unknown,
  context: HtmlMediaContext,
) {
  const rawHtml = getRawHtml(value)
  let html = rawHtml

  if (!html || SKIP_MEDIA) {
    return sanitizeWordPressHtml(html)
  }

  const urls = extractImageUrlsFromHtml(rawHtml)
  const replacements = new Map<string, string>()

  for (const sourceUrl of urls) {
    const alt = context.altFallback || getFilenameFromUrl(sourceUrl)
    const media = await uploadMedia(payload, sourceUrl, alt, {
      importedFrom: context.importedFrom || 'wordpress',
      preferredMediaByFilename: context.preferredMediaByFilename,
    })

    if (media?.url) {
      replacements.set(sourceUrl, media.url)
      replacements.set(new URL(sourceUrl, WP_BASE_URL).toString(), media.url)
    }
  }

  html = rewriteImageTagsWithMediaUrls(rawHtml, replacements)

  for (const [from, to] of replacements) {
    html = replaceAllLiteral(html, from, to)
  }

  return sanitizeWordPressHtml(html)
}

async function fetchWPFeaturedMedia(mediaId: unknown) {
  const id = Number(mediaId)

  if (!Number.isFinite(id) || id <= 0 || SKIP_MEDIA) {
    return null
  }

  try {
    const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/media/${id}`, {
      headers: { 'user-agent': USER_AGENT },
    })

    if (!response.ok) {
      return null
    }

    const media = (await response.json()) as AnyRecord
    const url =
      media.source_url ||
      media.guid?.rendered ||
      media.media_details?.sizes?.full?.source_url ||
      ''

    if (!url) {
      return null
    }

    return {
      url,
      alt: media.alt_text || stripHTML(media.title?.rendered || ''),
      caption: stripHTML(media.caption?.rendered || ''),
      title: stripHTML(media.title?.rendered || ''),
      wpId: id,
    }
  } catch {
    return null
  }
}

async function createPlaceholderMedia(payload: any) {
  const filename = 'mfparis-placeholder-featured.png'
  const existing = await findOne(payload, 'media', { filename: { equals: filename } })

  if (existing?.id) {
    return existing.id
  }

  if (DRY_RUN) {
    return 'dry-placeholder-media'
  }

  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  )

  const media = await payload.create({
    collection: 'media',
    data: {
      alt: 'MF Paris Placeholder',
      title: 'MF Paris Placeholder',
      sourceFilename: filename,
      importedFrom: 'manual',
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

  const result = await createOrUpdateBySlug(payload, 'brands', 'mf-paris', {
    name: 'MF Paris',
    slug: 'mf-paris',
    description: '<p>Thuong hieu tam dung cho du lieu import chua map duoc brand.</p>',
    isFeatured: false,
  })

  return result.id
}

async function createOrUpdateAttribute(payload: any, item: AnyRecord) {
  const wooAttributeId = Number(item.id)
  const taxonomySlug = String(item.slug || '')
  const slug = makeSafeSlug(taxonomySlug.replace(/^pa_/, '') || item.name || `attribute-${item.id}`, item.id)
  const existing =
    (Number.isFinite(wooAttributeId)
      ? await findOne(payload, 'attributes', { wooAttributeId: { equals: wooAttributeId } })
      : null) || (await findBySlug(payload, 'attributes', slug))

  const variantOption = taxonomySlug === 'pa_dung-tich' || taxonomySlug === 'pa_mau' || item.has_archives === true

  const data = withoutUndefined({
    name: item.name || slug,
    slug,
    description: stripHTML(item.description || ''),
    scope: taxonomySlug.includes('huong') || taxonomySlug.includes('nong-do') ? 'fragrance' : 'general',
    valueType: item.type === 'number' || item.type === 'range' ? item.type : 'multi_select',
    filterable: true,
    comparable: true,
    variantOption,
    allowsMultiple: true,
    displayStyle: taxonomySlug === 'pa_mau' ? 'color' : 'checkbox',
    sortOrder: toNumber(item.menu_order || item.order, 0),
    isActive: true,
    wooAttributeId: Number.isFinite(wooAttributeId) ? wooAttributeId : undefined,
    wooTaxonomySlug: taxonomySlug || undefined,
  })

  if (existing?.id && !UPDATE_EXISTING) {
    return { id: existing.id, action: 'skip' as const }
  }

  if (DRY_RUN) {
    return {
      id: existing?.id || `dry-attribute-${slug}`,
      action: existing?.id ? ('dry-update' as const) : ('dry-create' as const),
    }
  }

  if (existing?.id) {
    const updated = await payload.update({
      collection: 'attributes',
      id: existing.id,
      data,
      overrideAccess: true,
    })
    return { id: updated.id, action: 'update' as const }
  }

  const created = await payload.create({
    collection: 'attributes',
    data,
    overrideAccess: true,
  })
  return { id: created.id, action: 'create' as const }
}

function attributeValueKey(attributeId: ID, slug: string) {
  return `${attributeId}:${slug}`
}

async function createOrUpdateAttributeValue(
  payload: any,
  attributeId: ID,
  taxonomySlug: string,
  term: AnyRecord,
) {
  const wooTermId = Number(term.id)
  const slug = makeSafeSlug(term.slug || term.name || `term-${term.id}`, term.id)
  const existing = await findOne(payload, 'attribute-values', {
    and: [{ attribute: { equals: attributeId } }, { slug: { equals: slug } }],
  })

  const data = withoutUndefined({
    attribute: attributeId,
    label: term.name || slug,
    slug,
    description: stripHTML(term.description || ''),
    sortOrder: toNumber(term.menu_order, 0),
    isActive: true,
    wooTermId: Number.isFinite(wooTermId) ? wooTermId : undefined,
    wooTaxonomySlug: taxonomySlug || undefined,
  })

  if (existing?.id && !UPDATE_EXISTING) {
    return { id: existing.id, action: 'skip' as const }
  }

  if (DRY_RUN) {
    return {
      id: existing?.id || `dry-attribute-value-${slug}`,
      action: existing?.id ? ('dry-update' as const) : ('dry-create' as const),
    }
  }

  if (existing?.id) {
    const updated = await payload.update({
      collection: 'attribute-values',
      id: existing.id,
      data,
      overrideAccess: true,
    })
    return { id: updated.id, action: 'update' as const }
  }

  const created = await payload.create({
    collection: 'attribute-values',
    data,
    overrideAccess: true,
  })
  return { id: created.id, action: 'create' as const }
}

async function importAttributes(payload: any) {
  const data = readJSON<AnyRecord>(DATA_FILES.productAttributes)
  const attributeMap = new Map<number | string, ID>()
  const attributeValueMap = new Map<string, ID>()

  console.log(`\nImport attributes: ${data.length}`)

  for (const item of data) {
    try {
      const attribute = await createOrUpdateAttribute(payload, item)
      const taxonomySlug = String(item.slug || '')

      if (item.id) attributeMap.set(Number(item.id), attribute.id)
      if (taxonomySlug) attributeMap.set(taxonomySlug, attribute.id)
      attributeMap.set(makeSafeSlug(taxonomySlug.replace(/^pa_/, '') || item.name || '', item.id), attribute.id)

      for (const term of Array.isArray(item.terms) ? item.terms : []) {
        const value = await createOrUpdateAttributeValue(payload, attribute.id, taxonomySlug, term)
        const termSlug = makeSafeSlug(term.slug || term.name || `term-${term.id}`, term.id)

        attributeValueMap.set(attributeValueKey(attribute.id, termSlug), value.id)
        if (term.id) attributeValueMap.set(attributeValueKey(attribute.id, String(term.id)), value.id)
        if (term.name) attributeValueMap.set(attributeValueKey(attribute.id, String(term.name).toLowerCase()), value.id)
      }

      console.log(`   ${attribute.action} attribute: ${item.name || item.slug}`)
    } catch (error: any) {
      console.error(`   Attribute error: ${item.name || item.id} - ${error.message}`)
    }
  }

  return { attributeMap, attributeValueMap }
}

function mapBySlug(items: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()
  for (const item of items) {
    if (item.slug) map.set(String(item.slug), item)
  }
  return map
}

async function importBrands(payload: any) {
  const brandsData = readJSON<AnyRecord>(DATA_FILES.brands, DATA_FILES.brandsFallback)
  const brandMap = new Map<number, ID>()

  console.log(`\nImport brands: ${brandsData.length}`)

  for (const item of brandsData) {
    try {
      const slug = makeSafeSlug(item.slug || item.name || `brand-${item.id}`, item.id)
      const imageUrl = getImageUrl(item.image)
      const logo = imageUrl
        ? await uploadMedia(payload, imageUrl, item.name || slug, {
            title: item.name || slug,
            caption: getImageCaption(item.image),
            wpId: Number(item.image?.id) || undefined,
            importedFrom: 'woocommerce',
          })
        : null

      const description = await normalizeHtmlWithMedia(payload, item.description, {
        altFallback: item.name || slug,
        importedFrom: 'wordpress',
      })

      const result = await createOrUpdateBySlug(payload, 'brands', slug, {
        name: item.name || slug,
        slug,
        description,
        logo: logo?.id || undefined,
        isFeatured: Boolean(item.count && Number(item.count) > 0),
        wpId: Number(item.id) || undefined,
        sourceUrl: item.link || item._links?.self?.[0]?.href || undefined,
      })

      if (item.id) brandMap.set(Number(item.id), result.id)
      console.log(`   ${result.action} brand: ${item.name || slug}`)
    } catch (error: any) {
      console.error(`   Brand error: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  await getFallbackBrand(payload)
  return brandMap
}

async function importProductCategories(payload: any) {
  const categoriesData = readJSON<AnyRecord>(
    DATA_FILES.productCategories,
    DATA_FILES.productCategoriesFallback,
  )
  const categoryMap = new Map<number, ID>()
  const pendingParents: Array<{ id: number; parent: number }> = []

  console.log(`\nImport product categories: ${categoriesData.length}`)

  for (const item of categoriesData) {
    try {
      const slug = makeSafeSlug(item.slug || item.name || `category-${item.id}`, item.id)
      const imageUrl = getImageUrl(item.image)
      const image = imageUrl
        ? await uploadMedia(payload, imageUrl, item.name || slug, {
            title: item.name || slug,
            caption: getImageCaption(item.image),
            wpId: Number(item.image?.id) || undefined,
            importedFrom: 'woocommerce',
          })
        : null

      const description = await normalizeHtmlWithMedia(payload, item.description, {
        altFallback: item.name || slug,
        importedFrom: 'wordpress',
      })

      const result = await createOrUpdateBySlug(payload, 'categories', slug, {
        name: item.name || slug,
        slug,
        description,
        image: image?.id || undefined,
        wpId: Number(item.id) || undefined,
        sourceUrl: item.link || item._links?.self?.[0]?.href || undefined,
      })

      if (item.id) categoryMap.set(Number(item.id), result.id)
      if (item.id && item.parent) pendingParents.push({ id: Number(item.id), parent: Number(item.parent) })

      console.log(`   ${result.action} category: ${item.name || slug}`)
    } catch (error: any) {
      console.error(`   Category error: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  if (!DRY_RUN) {
    for (const item of pendingParents) {
      const currentId = categoryMap.get(item.id)
      const parentId = categoryMap.get(item.parent)
      if (!currentId || !parentId) continue

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
  const categoriesData = readJSON<AnyRecord>(DATA_FILES.postCategories, DATA_FILES.postCategoriesFallback)
  const categoryMap = new Map<number, ID>()

  console.log(`\nImport post categories: ${categoriesData.length}`)

  for (const item of categoriesData) {
    try {
      const title = stripHTML(item.name || item.title || `post-category-${item.id}`)
      const slug = makeSafeSlug(item.slug || title, item.id)
      const description = await normalizeHtmlWithMedia(payload, item.description, {
        altFallback: title || slug,
        importedFrom: 'wordpress',
      })

      const result = await createOrUpdateBySlug(payload, 'post-categories', slug, {
        title,
        slug,
        description,
        wpId: Number(item.id) || undefined,
        sourceUrl: item.link || item._links?.self?.[0]?.href || undefined,
      })

      if (item.id) categoryMap.set(Number(item.id), result.id)
      console.log(`   ${result.action} post category: ${title}`)
    } catch (error: any) {
      console.error(`   Post category error: ${item.name || item.slug || item.id} - ${error.message}`)
    }
  }

  return categoryMap
}

function resolveAttribute(payloadMaps: ImportMaps, attribute: AnyRecord) {
  const keys = [
    attribute.id,
    Number(attribute.id),
    attribute.slug,
    attribute.taxonomy,
    makeSafeSlug(String(attribute.slug || '').replace(/^pa_/, '') || attribute.name || ''),
  ].filter((value) => value !== undefined && value !== null && value !== '')

  for (const key of keys) {
    const found = payloadMaps.attributes.get(key)
    if (found) return found
  }

  return null
}

function resolveAttributeValue(payloadMaps: ImportMaps, attributeId: ID, rawValue: unknown) {
  const raw = String(rawValue || '').trim()
  const keys = [
    raw,
    raw.toLowerCase(),
    makeSafeSlug(raw),
  ]

  for (const key of keys) {
    const found = payloadMaps.attributeValues.get(attributeValueKey(attributeId, key))
    if (found) return found
  }

  return null
}

function normalizeProductAttributes(rawProduct: AnyRecord, payloadMaps: ImportMaps) {
  const rows: AnyRecord[] = []
  const attributes = Array.isArray(rawProduct.attributes) ? rawProduct.attributes : []

  for (const attribute of attributes) {
    const attributeId = resolveAttribute(payloadMaps, attribute)
    if (!attributeId) continue

    const options: unknown[] = Array.isArray(attribute.options)
      ? attribute.options
      : [attribute.option || attribute.value].filter(Boolean)

    const valueIds = options
      .map((option) => resolveAttributeValue(payloadMaps, attributeId, option))
      .filter(Boolean)

    rows.push(
      withoutUndefined({
        attribute: attributeId,
        values: valueIds.length ? Array.from(new Set(valueIds)) : undefined,
        textValue: valueIds.length ? undefined : options.join(', '),
      }),
    )
  }

  return rows
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

function getVariationOptionValues(variation: AnyRecord, payloadMaps: ImportMaps) {
  const attributes = Array.isArray(variation.attributes) ? variation.attributes : []
  const ids: ID[] = []

  for (const attribute of attributes) {
    const attributeId = resolveAttribute(payloadMaps, attribute)
    if (!attributeId) continue

    const value = attribute.option || attribute.value || attribute.name
    const valueId = resolveAttributeValue(payloadMaps, attributeId, value)
    if (valueId) ids.push(valueId)
  }

  return Array.from(new Set(ids))
}

async function normalizeVariants(payload: any, rawProduct: AnyRecord, payloadMaps: ImportMaps) {
  const variations = Array.isArray(rawProduct.variations_full) ? rawProduct.variations_full : []

  return (
    await Promise.all(
      variations.map(async (variation: AnyRecord, index: number) => {
        const optionText = Array.isArray(variation.attributes)
          ? variation.attributes.map((attribute: AnyRecord) => attribute.option || attribute.value).filter(Boolean).join(' / ')
          : ''
        const name = optionText || variation.name || `Variant ${index + 1}`
        const imageUrl = getImageUrl(variation.image)
        const image = imageUrl
          ? await uploadMedia(payload, imageUrl, getImageAlt(variation.image, name), {
              title: name,
              wpId: Number(variation.image?.id) || undefined,
              importedFrom: 'woocommerce',
            })
          : null

        const basePrice = toNumber(variation.regular_price || variation.price, 0)
        const salePrice = optionalNumber(variation.sale_price)

        return withoutUndefined({
          name,
          sku: variation.id ? String(variation.id) : variation.sku || '',
          wpVariationId: Number(variation.id) || undefined,
          isDefault: index === 0,
          optionValues: getVariationOptionValues(variation, payloadMaps),
          basePrice,
          salePrice,
          stock: IMPORT_STOCK_QUANTITY,
          image: image?.id || undefined,
          isActive: variation.status ? variation.status === 'publish' : true,
        })
      }),
    )
  ).filter((variant) => variant.name && variant.basePrice > 0)
}

function normalizePrice(rawProduct: AnyRecord, preparedProduct: AnyRecord | undefined, variants: AnyRecord[] = []) {
  if (variants.length > 0) {
    const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0]
    return withoutUndefined({
      basePrice: toNumber(defaultVariant.basePrice, 0),
      salePrice: optionalNumber(defaultVariant.salePrice),
      stock: IMPORT_STOCK_QUANTITY,
    })
  }

  const preparedPrice = preparedProduct?.price || {}

  return withoutUndefined({
    basePrice: toNumber(preparedPrice.basePrice || rawProduct.regular_price || rawProduct.price, 0),
    salePrice: optionalNumber(preparedPrice.salePrice || rawProduct.sale_price),
    stock: IMPORT_STOCK_QUANTITY,
  })
}

function normalizeDisplayLocation(preparedProduct?: AnyRecord) {
  const value = preparedProduct?.displayLocation
  if (!Array.isArray(value)) return undefined

  const locations = value.filter((item) => allowedDisplayLocations.has(item))
  return locations.length ? locations : undefined
}

async function normalizeProductImages(payload: any, rawProduct: AnyRecord) {
  const images = Array.isArray(rawProduct.images) ? rawProduct.images : []
  const uploaded: Array<{ image: ID }> = []
  const preferredMediaByFilename = new Map<string, MediaRef>()

  for (const image of images) {
    const url = getImageUrl(image)
    const media = url
      ? await uploadMedia(payload, url, getImageAlt(image, rawProduct.name), {
          title: getImageAlt(image, rawProduct.name),
          caption: getImageCaption(image),
          wpId: Number((image as AnyRecord).id) || undefined,
          importedFrom: 'woocommerce',
        })
      : null

    if (media) {
      uploaded.push({ image: media.id })
      preferredMediaByFilename.set(normalizeFilenameKey(url || media.filename), media)
    }
  }

  return { images: uploaded, preferredMediaByFilename }
}

async function resolveBrandId(payload: any, rawProduct: AnyRecord, maps: ImportMaps) {
  const brands = Array.isArray(rawProduct.brands) ? rawProduct.brands : []

  for (const brand of brands) {
    const byId = maps.brands.get(Number(brand.id))
    if (byId) return byId

    const slug = makeSafeSlug(brand.slug || brand.name || `brand-${brand.id}`, brand.id)
    const existing = await findBySlug(payload, 'brands', slug)
    if (existing?.id) return existing.id
  }

  return getFallbackBrand(payload)
}

async function resolveCategoryIds(payload: any, rawProduct: AnyRecord, maps: ImportMaps) {
  const categories = Array.isArray(rawProduct.categories) ? rawProduct.categories : []
  const ids: ID[] = []

  for (const category of categories) {
    const byId = maps.productCategories.get(Number(category.id))
    if (byId) {
      ids.push(byId)
      continue
    }

    const slug = makeSafeSlug(category.slug || category.name || `category-${category.id}`, category.id)
    const existing = await findBySlug(payload, 'categories', slug)
    if (existing?.id) ids.push(existing.id)
  }

  return Array.from(new Set(ids))
}

async function importProducts(payload: any, maps: ImportMaps) {
  const rawProducts = readJSON<AnyRecord>(DATA_FILES.productsRaw, DATA_FILES.productsRawFallback, {
    slice: true,
  })
  const preparedBySlug = mapBySlug(readJSON<AnyRecord>(DATA_FILES.productsPrepared))

  console.log(`\nImport products: ${rawProducts.length}`)

  for (const rawProduct of rawProducts) {
    const name = rawProduct.name || rawProduct.title || rawProduct.slug || `Product ${rawProduct.id}`

    try {
      const slug = makeSafeSlug(rawProduct.slug || name, rawProduct.id)
      const preparedProduct = preparedBySlug.get(slug)
      const brandId = await resolveBrandId(payload, rawProduct, maps)
      const categoryIds = await resolveCategoryIds(payload, rawProduct, maps)
      const productImages = await normalizeProductImages(payload, rawProduct)
      const variants = await normalizeVariants(payload, rawProduct, maps)
      const productType = variants.length || rawProduct.type === 'variable' ? 'variable' : 'simple'
      const importedTimestamps = getImportedTimestamps(rawProduct)
      const description = await normalizeHtmlWithMedia(
        payload,
        rawProduct.description || preparedProduct?.description || '',
        {
          altFallback: name,
          importedFrom: 'woocommerce',
          preferredMediaByFilename: productImages.preferredMediaByFilename,
        },
      )

      const productData = withoutUndefined({
        title: preparedProduct?.title || name,
        sku: rawProduct.id ? String(rawProduct.id) : preparedProduct?.sku || rawProduct.sku || '',
        gtin: preparedProduct?.gtin || rawProduct.gtin || undefined,
        mpn: preparedProduct?.mpn || rawProduct.mpn || undefined,
        slug,
        brand: brandId,
        categories: categoryIds,
        productType,
        price: normalizePrice(rawProduct, preparedProduct, variants),
        shortDescription: stripHTML(rawProduct.short_description || preparedProduct?.shortDescription || ''),
        specifications: normalizeSpecifications(rawProduct, preparedProduct),
        productAttributes: normalizeProductAttributes(rawProduct, maps),
        description,
        isCombo: Boolean(preparedProduct?.isCombo),
        comboItems: Array.isArray(preparedProduct?.comboItems) ? preparedProduct.comboItems : [],
        variants: productType === 'variable' && variants.length ? variants : undefined,
        images: productImages.images.length ? productImages.images : undefined,
        seoTitle: getRankMathMeta(rawProduct, 'rank_math_title') || undefined,
        seoDescription:
          getRankMathMeta(rawProduct, 'rank_math_description') ||
          stripHTML(rawProduct.short_description) ||
          undefined,
        status: preparedProduct?.status === 'published' || rawProduct.status === 'publish' ? 'published' : 'draft',
        displayLocation: normalizeDisplayLocation(preparedProduct),
        wpId: Number(rawProduct.id) || undefined,
        sourceUrl: rawProduct.permalink || undefined,
        ...importedTimestamps,
      })

      const result = await createOrUpdateBySlug(payload, 'products', slug, productData)
      console.log(`   ${result.action} product: ${name}`)
    } catch (error: any) {
      console.error(`   Product error: ${name} - ${error.message}`)
    }
  }
}

async function resolvePostCategoryIds(payload: any, post: AnyRecord, maps: ImportMaps) {
  const categoryIds: ID[] = []

  for (const wpCategoryId of Array.isArray(post.categories) ? post.categories : []) {
    const byId = maps.postCategories.get(Number(wpCategoryId))
    if (byId) {
      categoryIds.push(byId)
      continue
    }

    const existing = await findOne(payload, 'post-categories', {
      wpId: { equals: Number(wpCategoryId) },
    })

    if (existing?.id) categoryIds.push(existing.id)
  }

  return Array.from(new Set(categoryIds))
}

async function importPosts(payload: any, maps: ImportMaps) {
  const postsData = readJSON<AnyRecord>(DATA_FILES.posts, undefined, { slice: true })
  console.log(`\nImport posts: ${postsData.length}`)

  let placeholderMediaId: ID | null = null

  if (USE_PLACEHOLDER_FEATURED || SKIP_MEDIA) {
    placeholderMediaId = await createPlaceholderMedia(payload)
  }

  for (const item of postsData) {
    const title = stripHTML(getRendered(item.title) || item.title || item.slug || `Post ${item.id}`)

    try {
      const slug = makeSafeSlug(item.slug || title, item.id)
      const importedTimestamps = getImportedTimestamps(item)
      const categories = await resolvePostCategoryIds(payload, item, maps)
      const featuredMedia = await fetchWPFeaturedMedia(item.featured_media)
      const featuredImage =
        featuredMedia?.url
          ? await uploadMedia(payload, featuredMedia.url, featuredMedia.alt || title, {
              title: featuredMedia.title || title,
              caption: featuredMedia.caption,
              wpId: featuredMedia.wpId,
              importedFrom: 'wordpress',
            })
          : null
      const featuredImageId = featuredImage?.id || placeholderMediaId

      if (!featuredImageId) {
        console.warn(`   Skip post without required thumbnail: ${title}`)
        continue
      }

      const content = normalizePayloadTextarea(
        await normalizeHtmlWithMedia(payload, item.content, {
          altFallback: title,
          importedFrom: 'wordpress',
        }),
      )

      const postData = {
        title,
        slug,
        thumbnail: featuredImageId,
        categories,
        content,
        excerpt: stripHTML(getRendered(item.excerpt) || item.excerpt || ''),
        seo: withoutUndefined({
          metaTitle: title || undefined,
          metaDescription: stripHTML(getRendered(item.excerpt) || '').slice(0, 160) || undefined,
        }),
        wpId: Number(item.id) || undefined,
        sourceUrl: item.link || undefined,
      }

      let result

      try {
        result = await createOrUpdateBySlug(payload, 'posts', slug, postData)
      } catch (contentError) {
        if (!isContentValidationError(contentError)) {
          throw contentError
        }

        const fallbackContent = buildPlainHtmlFallback(content)

        console.warn(
          `   Post warning: content HTML invalid, retry plain content: ${title}`,
        )

        result = await createOrUpdateBySlug(payload, 'posts', slug, {
          ...postData,
          content: fallbackContent,
        })
      }

      console.log(`   ${result.action} post: ${title}`)
    } catch (error: any) {
      console.error(`   Post error: ${title} - ${error.message}`)
    }
  }
}

async function run() {
  console.log(`Data dir: ${DATA_DIR}`)
  console.log(`Mode: ${ONLY}`)
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Skip media: ${SKIP_MEDIA ? 'yes' : 'no'}`)
  if (ITEM_LIMIT || ITEM_OFFSET) {
    console.log(`Slice: offset=${ITEM_OFFSET}, limit=${ITEM_LIMIT} chi ap dung cho products/posts`)
  }

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const maps: ImportMaps = {
    attributes: new Map(),
    attributeValues: new Map(),
    brands: new Map(),
    productCategories: new Map(),
    postCategories: new Map(),
  }

  if (ONLY === 'all' || ONLY === 'attributes' || ONLY === 'taxonomies') {
    const result = await importAttributes(payload)
    maps.attributes = result.attributeMap
    maps.attributeValues = result.attributeValueMap
  }

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'brands') {
    maps.brands = await importBrands(payload)
  }

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'product-categories') {
    maps.productCategories = await importProductCategories(payload)
  }

  if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'post-categories') {
    maps.postCategories = await importPostCategories(payload)
  }

  if (ONLY === 'all' || ONLY === 'products') {
    if (!maps.attributes.size) {
      const result = await importAttributes(payload)
      maps.attributes = result.attributeMap
      maps.attributeValues = result.attributeValueMap
    }

    if (!maps.brands.size) maps.brands = await importBrands(payload)
    if (!maps.productCategories.size) maps.productCategories = await importProductCategories(payload)

    await importProducts(payload, maps)
  }

  if (ONLY === 'all' || ONLY === 'posts') {
    if (!maps.postCategories.size) maps.postCategories = await importPostCategories(payload)
    await importPosts(payload, maps)
  }

  console.log('\nImport completed.')
  process.exit(0)
}

run().catch((error) => {
  console.error('Import failed:', error)
  process.exit(1)
})





