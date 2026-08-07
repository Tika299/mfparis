import type { Payload } from 'payload'

import {
  createCsv,
  createExcelXmlWorkbook,
  parseCsv,
  parseExcelXmlWorkbook,
  valueToCell,
  type WorkbookRow,
  type WorkbookSheets,
} from './workbook'

export type ContentExcelCollection =
  | 'products'
  | 'posts'
  | 'brands'
  | 'categories'
  | 'post-categories'
export type ContentExcelOnly = ContentExcelCollection | 'all'
export type ContentExcelExportFormat = 'xls' | 'csv'
export type ContentExcelExportProfile = 'full' | 'google-sheets'

type AnyRecord = Record<string, any>

type ExportInput = {
  format?: ContentExcelExportFormat
  includeContent?: boolean
  payload: Payload
  only?: ContentExcelOnly
  profile?: ContentExcelExportProfile
  productIds?: string[]
  productSlugs?: string[]
  postIds?: string[]
  postSlugs?: string[]
  limit?: number
  pageSize?: number
}

type ImportInput = {
  format?: ContentExcelExportFormat
  payload: Payload
  workbookXml: string
  only?: ContentExcelOnly
  dryRun?: boolean
  includeReadOnly?: boolean
}

const PROTECTED_FIELDS = new Set(['__collection', 'id', 'createdAt', 'updatedAt'])
const READONLY_FIELDS = new Set(['averageRating', 'reviewCount', 'searchKeywords'])

const COLLECTIONS: ContentExcelCollection[] = [
  'products',
  'posts',
  'brands',
  'categories',
  'post-categories',
]

const HTML_FIELDS: Record<ContentExcelCollection, string[]> = {
  products: ['description'],
  posts: ['content'],
  brands: ['description'],
  categories: ['description'],
  'post-categories': ['description'],
}

const UPLOAD_FIELDS: Partial<Record<ContentExcelCollection, string[]>> = {
  posts: ['thumbnail'],
  brands: ['logo'],
  categories: ['image'],
}

const ARRAY_UPLOAD_FIELDS: Partial<
  Record<ContentExcelCollection, Record<string, string>>
> = {
  products: {
    images: 'image',
  },
}

export function parseCsvList(value: string | null | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getCollections(only: ContentExcelOnly = 'all'): ContentExcelCollection[] {
  if (only !== 'all') return [only]

  return COLLECTIONS
}

function selectedIdsFor(input: ExportInput, collection: ContentExcelCollection) {
  if (collection === 'products') return input.productIds || []
  if (collection === 'posts') return input.postIds || []

  return []
}

function selectedSlugsFor(input: ExportInput, collection: ContentExcelCollection) {
  if (collection === 'products') return input.productSlugs || []
  if (collection === 'posts') return input.postSlugs || []

  return []
}

function whereFor(input: ExportInput, collection: ContentExcelCollection) {
  const ids = selectedIdsFor(input, collection)
  const slugs = selectedSlugsFor(input, collection)
  const or: AnyRecord[] = []

  if (ids.length > 0) {
    or.push({
      id: {
        in: ids,
      },
    })
  }

  if (slugs.length > 0) {
    or.push({
      slug: {
        in: slugs,
      },
    })
  }

  if (or.length === 0) return undefined
  if (or.length === 1) return or[0]

  return { or }
}

function preferredHeaders(collection: ContentExcelCollection) {
  if (collection === 'products') {
    return [
      '__collection',
      'id',
      'title',
      'slug',
      'sku',
      'status',
      'wpId',
      'sourceUrl',
      'brand',
      'categories',
      'price',
      'productType',
      'shortDescription',
      'description',
      'seoTitle',
      'seoDescription',
      'faq',
      'images',
      'variants',
      'productAttributes',
      'specifications',
      'displayLocation',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'posts') {
    return [
      '__collection',
      'id',
      'title',
      'slug',
      'wpId',
      'sourceUrl',
      'categories',
      'authorProfile',
      'thumbnail',
      'excerpt',
      'content',
      'seo',
      'faq',
      'reviewer',
      'viewCount',
      'rating',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'brands') {
    return [
      '__collection',
      'id',
      'name',
      'slug',
      'wpId',
      'sourceUrl',
      'logo',
      'description',
      'isFeatured',
      'importNotes',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'categories') {
    return [
      '__collection',
      'id',
      'name',
      'slug',
      'wpId',
      'sourceUrl',
      'parent',
      'image',
      'description',
      'siloLabel',
      'indexPolicy',
      'canonicalTarget',
      'importNotes',
      'createdAt',
      'updatedAt',
    ]
  }

  return [
    '__collection',
    'id',
    'title',
    'slug',
    'wpId',
    'sourceUrl',
    'parent',
    'description',
    'siloLabel',
    'indexPolicy',
    'canonicalTarget',
    'importNotes',
    'createdAt',
    'updatedAt',
  ]
}

function googleSheetsHeaders(collection: ContentExcelCollection, includeContent: boolean) {
  if (collection === 'products') {
    return [
      '__collection',
      'id',
      'title',
      'slug',
      'sku',
      'status',
      'wpId',
      'sourceUrl',
      'brand',
      'categories',
      'price',
      'productType',
      'shortDescription',
      ...(includeContent ? ['description'] : []),
      'seoTitle',
      'seoDescription',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'posts') {
    return [
      '__collection',
      'id',
      'title',
      'slug',
      'wpId',
      'sourceUrl',
      'categories',
      'authorProfile',
      'thumbnail',
      'excerpt',
      ...(includeContent ? ['content'] : []),
      'seo',
      'viewCount',
      'rating',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'brands') {
    return [
      '__collection',
      'id',
      'name',
      'slug',
      'wpId',
      'sourceUrl',
      'logo',
      ...(includeContent ? ['description'] : []),
      'isFeatured',
      'createdAt',
      'updatedAt',
    ]
  }

  if (collection === 'categories') {
    return [
      '__collection',
      'id',
      'name',
      'slug',
      'wpId',
      'sourceUrl',
      'parent',
      'image',
      ...(includeContent ? ['description'] : []),
      'siloLabel',
      'indexPolicy',
      'canonicalTarget',
      'createdAt',
      'updatedAt',
    ]
  }

  return [
    '__collection',
    'id',
    'title',
    'slug',
    'wpId',
    'sourceUrl',
    'parent',
    ...(includeContent ? ['description'] : []),
    'siloLabel',
    'indexPolicy',
    'canonicalTarget',
    'createdAt',
    'updatedAt',
  ]
}

function getExportHeaders(
  collection: ContentExcelCollection,
  profile: ContentExcelExportProfile,
  includeContent: boolean,
) {
  if (profile === 'google-sheets') {
    return googleSheetsHeaders(collection, includeContent)
  }

  return preferredHeaders(collection)
}

function buildRows(
  collection: ContentExcelCollection,
  docs: AnyRecord[],
  profile: ContentExcelExportProfile = 'full',
  includeContent = true,
) {
  const preferred = getExportHeaders(collection, profile, includeContent)
  const headers = new Set<string>(preferred)

  if (profile === 'full') {
    for (const doc of docs) {
      Object.keys(doc).forEach((key) => headers.add(key))
    }
  }

  const orderedHeaders = [
    ...preferred,
    ...Array.from(headers)
      .filter((header) => !preferred.includes(header))
      .sort(),
  ]

  return docs.map((doc) => {
    const row: WorkbookRow = {}

    for (const header of orderedHeaders) {
      row[header] = header === '__collection' ? collection : valueToCell(doc[header])
    }

    return row
  })
}

async function fetchAllDocs(input: ExportInput, collection: ContentExcelCollection) {
  const docs: AnyRecord[] = []
  let page = 1
  const pageSize = Math.max(1, Math.min(500, Number(input.pageSize || 100)))
  const limit = Math.max(0, Number(input.limit || 0))
  const where = whereFor(input, collection)

  while (true) {
    const result = await input.payload.find({
      collection,
      depth: 0,
      limit: pageSize,
      page,
      overrideAccess: true,
      ...(where ? { where } : {}),
    })

    docs.push(...(result.docs || []))

    if (limit && docs.length >= limit) {
      return docs.slice(0, limit)
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return docs
}

export async function exportContentExcel(input: ExportInput) {
  const sheets: WorkbookSheets = {}
  const counts: Record<string, number> = {}
  const profile = input.profile || 'full'
  const includeContent = input.includeContent ?? profile === 'full'

  for (const collection of getCollections(input.only)) {
    const docs = await fetchAllDocs(input, collection)
    sheets[collection] = buildRows(collection, docs, profile, includeContent)
    counts[collection] = docs.length
  }

  if (input.format === 'csv') {
    const collections = getCollections(input.only)
    const rows =
      collections.length === 1
        ? sheets[collections[0]] || []
        : collections.flatMap((collection) => sheets[collection] || [])

    return {
      counts,
      csv: createCsv(rows),
      workbookXml: '',
    }
  }

  return {
    counts,
    csv: '',
    workbookXml: createExcelXmlWorkbook(sheets),
  }
}

function looksLikeJson(value: string) {
  const trimmed = value.trim()

  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

function parseCellValue(cell: string, originalValue: unknown) {
  const value = cell ?? ''

  if (Array.isArray(originalValue) || (originalValue && typeof originalValue === 'object')) {
    if (!value.trim()) return Array.isArray(originalValue) ? [] : null
    return JSON.parse(value)
  }

  if (typeof originalValue === 'number') {
    if (!value.trim()) return null
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) throw new Error('Gia tri khong phai number: ' + value)
    return numberValue
  }

  if (typeof originalValue === 'boolean') {
    return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase())
  }

  if (originalValue === null || originalValue === undefined) {
    if (looksLikeJson(value)) return JSON.parse(value)
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return value
}

function stableJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function shouldSkipImportField(field: string, includeReadOnly: boolean) {
  if (PROTECTED_FIELDS.has(field)) return true
  if (!includeReadOnly && READONLY_FIELDS.has(field)) return true

  return false
}

function isHtmlField(collection: ContentExcelCollection, field: string) {
  return (HTML_FIELDS[collection] || []).includes(field)
}

function isUploadField(collection: ContentExcelCollection, field: string) {
  return (UPLOAD_FIELDS[collection] || []).includes(field)
}

function getArrayUploadChildField(collection: ContentExcelCollection, field: string) {
  return ARRAY_UPLOAD_FIELDS[collection]?.[field] || null
}

function extractGoogleDriveId(url: string) {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/i,
    /drive\.google\.com\/open\?id=([^&#]+)/i,
    /drive\.google\.com\/uc\?[^#]*\bid=([^&#]+)/i,
    /docs\.google\.com\/(?:uc|document|spreadsheets|presentation)\/d\/([^/?#]+)/i,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return decodeURIComponent(match[1])
  }

  return ''
}

function normalizeDownloadUrl(url: string) {
  const driveId = extractGoogleDriveId(url)

  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`
  }

  return url
}

function isImportableImageUrl(value: string) {
  const trimmed = value.trim()

  if (!/^https?:\/\//i.test(trimmed)) return false
  if (/\/api\/media\/file\//i.test(trimmed)) return false
  if (extractGoogleDriveId(trimmed)) return true

  try {
    const url = new URL(trimmed)
    return /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(url.pathname)
  } catch {
    return false
  }
}

function splitUrlList(value: string) {
  return String(value || '')
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes('avif')) return '.avif'
  if (mimeType.includes('gif')) return '.gif'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg'
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('svg')) return '.svg'
  if (mimeType.includes('webp')) return '.webp'

  return '.jpg'
}

function slugifyFilenamePart(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/u, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getFilenameFromDisposition(value: string | null) {
  if (!value) return ''

  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/"/g, ''))

  const match = value.match(/filename="?([^";]+)"?/i)
  if (match?.[1]) return match[1]

  return ''
}

function getFilenameFromUrl(url: string, mimeType: string) {
  const driveId = extractGoogleDriveId(url)

  if (driveId) {
    return `drive-${driveId}${mimeToExtension(mimeType)}`
  }

  try {
    const parsed = new URL(url)
    const basename = parsed.pathname.split('/').filter(Boolean).pop() || ''

    if (basename) return decodeURIComponent(basename)
  } catch {
    // keep fallback below
  }

  return `content-image-${Date.now()}${mimeToExtension(mimeType)}`
}

function normalizeFilename(filename: string, mimeType: string) {
  const extension = /\.[a-z0-9]{2,5}$/i.test(filename)
    ? filename.match(/\.[a-z0-9]{2,5}$/i)?.[0] || mimeToExtension(mimeType)
    : mimeToExtension(mimeType)
  const stem = filename.replace(/\.[a-z0-9]{2,5}$/i, '')
  const safeStem = slugifyFilenamePart(stem) || 'content-image'

  return `${safeStem}${extension.toLowerCase()}`
}

async function findExistingMedia(payload: Payload, sourceUrl: string) {
  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      sourceUrl: {
        equals: sourceUrl,
      },
    },
  })

  return result.docs?.[0] as AnyRecord | undefined
}

async function importRemoteImage({
  alt,
  payload,
  sourceUrl,
}: {
  alt: string
  payload: Payload
  sourceUrl: string
}) {
  const existing = await findExistingMedia(payload, sourceUrl)

  if (existing?.id) {
    return {
      created: false,
      id: existing.id,
      url: existing.url || `/api/media/file/${existing.filename}`,
    }
  }

  const downloadUrl = normalizeDownloadUrl(sourceUrl)
  const response = await fetch(downloadUrl)

  if (!response.ok) {
    throw new Error(`Cannot download image ${sourceUrl}: HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'

  if (!contentType.startsWith('image/')) {
    throw new Error(`Downloaded file is not an image: ${sourceUrl}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filename = normalizeFilename(
    getFilenameFromDisposition(response.headers.get('content-disposition')) ||
      getFilenameFromUrl(sourceUrl, contentType),
    contentType,
  )
  const title = alt || titleFromFilename(filename) || filename

  const media = (await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: {
      alt: title,
      title,
      sourceFilename: filename,
      sourceUrl,
      importedFrom: 'manual',
    },
    file: {
      data: buffer,
      name: filename,
      mimetype: contentType,
      size: buffer.length,
    },
  })) as AnyRecord

  return {
    created: true,
    id: media.id,
    url: media.url || `/api/media/file/${media.filename || filename}`,
  }
}

function getImageAltNearAttribute(html: string, index: number) {
  const tagStart = html.lastIndexOf('<img', index)
  const tagEnd = html.indexOf('>', index)

  if (tagStart < 0 || tagEnd < index) {
    return ''
  }

  const tag = html.slice(tagStart, tagEnd + 1)
  const match = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i)

  return match?.[1] || match?.[2] || ''
}

async function transformHtmlImages({
  dryRun,
  html,
  payload,
  stats,
}: {
  dryRun: boolean
  html: string
  payload: Payload
  stats: ImportMediaStats
}) {
  if (!html || !/<img\b/i.test(html)) {
    return html
  }

  const replacements: Array<{ from: string; to: string }> = []
  const attributePattern = /\b(src|data-src)\s*=\s*(["'])(https?:\/\/[^"']+)\2/gi
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(html))) {
    const sourceUrl = match[3]

    if (!isImportableImageUrl(sourceUrl)) continue

    stats.mediaDetected += 1

    if (dryRun) {
      continue
    }

    const media = await importRemoteImage({
      alt: getImageAltNearAttribute(html, match.index),
      payload,
      sourceUrl,
    })

    if (media.created) stats.mediaCreated += 1
    else stats.mediaReused += 1

    replacements.push({
      from: match[0],
      to: `${match[1]}=${match[2]}${media.url}${match[2]}`,
    })
  }

  let nextHtml = html

  for (const replacement of replacements) {
    nextHtml = nextHtml.replace(replacement.from, replacement.to)
  }

  return nextHtml
}

type ImportMediaStats = {
  mediaCreated: number
  mediaDetected: number
  mediaReused: number
}

async function transformUploadCell({
  cell,
  dryRun,
  payload,
  title,
  stats,
}: {
  cell: string
  dryRun: boolean
  payload: Payload
  title: string
  stats: ImportMediaStats
}) {
  const value = String(cell || '').trim()

  if (!isImportableImageUrl(value)) {
    return null
  }

  stats.mediaDetected += 1

  if (dryRun) {
    return `__would_import_media__:${value}`
  }

  const media = await importRemoteImage({
    alt: title,
    payload,
    sourceUrl: value,
  })

  if (media.created) stats.mediaCreated += 1
  else stats.mediaReused += 1

  return media.id
}

async function transformArrayUploadCell({
  cell,
  childField,
  dryRun,
  payload,
  title,
  stats,
}: {
  cell: string
  childField: string
  dryRun: boolean
  payload: Payload
  title: string
  stats: ImportMediaStats
}) {
  const value = String(cell || '').trim()

  if (!value) {
    return []
  }

  if (looksLikeJson(value)) {
    const parsed = JSON.parse(value)

    if (!Array.isArray(parsed)) {
      return parsed
    }

    const nextRows = []

    for (const row of parsed) {
      if (!row || typeof row !== 'object') {
        nextRows.push(row)
        continue
      }

      const source = String(row[childField] || '').trim()

      if (!isImportableImageUrl(source)) {
        nextRows.push(row)
        continue
      }

      const mediaId = await transformUploadCell({
        cell: source,
        dryRun,
        payload,
        stats,
        title,
      })

      nextRows.push({
        ...row,
        [childField]: mediaId,
      })
    }

    return nextRows
  }

  const urls = splitUrlList(value).filter(isImportableImageUrl)

  if (urls.length === 0) {
    return null
  }

  const rows = []

  for (const url of urls) {
    const mediaId = await transformUploadCell({
      cell: url,
      dryRun,
      payload,
      stats,
      title,
    })

    rows.push({
      [childField]: mediaId,
    })
  }

  return rows
}

async function importRows({
  payload,
  collection,
  rows,
  dryRun,
  includeReadOnly,
}: {
  payload: Payload
  collection: ContentExcelCollection
  rows: WorkbookRow[]
  dryRun: boolean
  includeReadOnly: boolean
}) {
  const details: Array<{
    id: string
    fields: string[]
    status: 'changed' | 'updated' | 'skipped' | 'failed'
    error?: string
  }> = []
  const mediaStats: ImportMediaStats = {
    mediaCreated: 0,
    mediaDetected: 0,
    mediaReused: 0,
  }
  let scanned = 0
  let changed = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    scanned += 1
    const id = row.id

    if (!id) {
      skipped += 1
      continue
    }

    try {
      const original = await payload.findByID({
        collection,
        id,
        depth: 0,
        overrideAccess: true,
      })
      const originalRecord = original as AnyRecord
      const data: AnyRecord = {}
      const rowTitle = row.title || row.name || originalRecord.title || originalRecord.name || ''

      for (const [field, cell] of Object.entries(row)) {
        if (shouldSkipImportField(field, includeReadOnly)) continue
        if (!(field in originalRecord)) continue

        const arrayUploadChildField = getArrayUploadChildField(collection, field)
        let nextValue: unknown

        if (isHtmlField(collection, field)) {
          nextValue = await transformHtmlImages({
            dryRun,
            html: cell,
            payload,
            stats: mediaStats,
          })
        } else if (isUploadField(collection, field)) {
          nextValue =
            (await transformUploadCell({
              cell,
              dryRun,
              payload,
              stats: mediaStats,
              title: rowTitle,
            })) ?? parseCellValue(cell, originalRecord[field])
        } else if (arrayUploadChildField) {
          nextValue =
            (await transformArrayUploadCell({
              cell,
              childField: arrayUploadChildField,
              dryRun,
              payload,
              stats: mediaStats,
              title: rowTitle,
            })) ?? parseCellValue(cell, originalRecord[field])
        } else {
          nextValue = parseCellValue(cell, originalRecord[field])
        }

        if (stableJson(nextValue) !== stableJson(originalRecord[field])) {
          data[field] = nextValue
        }
      }

      const fields = Object.keys(data)

      if (fields.length === 0) {
        skipped += 1
        details.push({ id, fields: [], status: 'skipped' })
        continue
      }

      changed += 1

      if (!dryRun) {
        await payload.update({
          collection,
          id,
          depth: 0,
          overrideAccess: true,
          data,
        })
        updated += 1
        details.push({ id, fields, status: 'updated' })
      } else {
        details.push({ id, fields, status: 'changed' })
      }
    } catch (error) {
      failed += 1
      details.push({
        id,
        fields: [],
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    changed,
    details: details.slice(0, 100),
    failed,
    ...mediaStats,
    scanned,
    skipped,
    updated,
  }
}

export async function importContentExcel(input: ImportInput) {
  const sheets =
    input.format === 'csv'
      ? rowsToSheets(parseCsv(input.workbookXml), input.only || 'all')
      : parseExcelXmlWorkbook(input.workbookXml)
  const result: Record<string, Awaited<ReturnType<typeof importRows>>> = {}

  for (const collection of getCollections(input.only)) {
    result[collection] = await importRows({
      payload: input.payload,
      collection,
      rows: sheets[collection] || [],
      dryRun: Boolean(input.dryRun),
      includeReadOnly: Boolean(input.includeReadOnly),
    })
  }

  return result
}

function rowsToSheets(rows: WorkbookRow[], only: ContentExcelOnly): WorkbookSheets {
  if (only !== 'all') {
    return {
      [only]: rows,
    }
  }

  return {
    products: rows.filter((row) => row.__collection === 'products'),
    posts: rows.filter((row) => row.__collection === 'posts'),
    brands: rows.filter((row) => row.__collection === 'brands'),
    categories: rows.filter((row) => row.__collection === 'categories'),
    'post-categories': rows.filter((row) => row.__collection === 'post-categories'),
  }
}
