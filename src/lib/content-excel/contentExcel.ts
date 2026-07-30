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

export type ContentExcelCollection = 'products' | 'posts'
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

export function parseCsvList(value: string | null | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getCollections(only: ContentExcelOnly = 'all'): ContentExcelCollection[] {
  if (only === 'products') return ['products']
  if (only === 'posts') return ['posts']

  return ['products', 'posts']
}

function selectedIdsFor(input: ExportInput, collection: ContentExcelCollection) {
  return collection === 'products' ? input.productIds || [] : input.postIds || []
}

function selectedSlugsFor(input: ExportInput, collection: ContentExcelCollection) {
  return collection === 'products' ? input.productSlugs || [] : input.postSlugs || []
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
  const details: Array<{ id: string; fields: string[]; status: 'changed' | 'updated' | 'skipped' | 'failed'; error?: string }> = []
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

      for (const [field, cell] of Object.entries(row)) {
        if (shouldSkipImportField(field, includeReadOnly)) continue
        if (!(field in originalRecord)) continue

        const nextValue = parseCellValue(cell, originalRecord[field])

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
  if (only === 'products' || only === 'posts') {
    return {
      [only]: rows,
    }
  }

  return {
    products: rows.filter((row) => row.__collection === 'products'),
    posts: rows.filter((row) => row.__collection === 'posts'),
  }
}
