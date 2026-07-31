import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

type AnyRecord = Record<string, any>
type CollectionName = 'products' | 'posts' | 'brands' | 'categories' | 'post-categories'

type SourceItem = {
  id: number
  slug: string
  name?: string
  title?: string
}

type ReportConfig = {
  collection: CollectionName
  label: string
  routePrefix: string
  files: string[]
}

type MismatchRow = {
  collection: CollectionName
  id: string | number
  wpId: number
  title: string
  currentSlug: string
  sourceSlug: string
  currentUrl: string
  sourceUrl: string
  adminUrl: string
}

const args = process.argv.slice(2)

function getArg(name: string, fallback = ''): string {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const ONLY = getArg('--only', 'all')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const WP_ID = Number(getArg('--wp-id', '0')) || 0
const PAGE_SIZE = Math.max(20, Number(getArg('--page-size', '200')) || 200)

const projectRoot = process.cwd()
dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local'), override: false })

const DATA_DIR = path.resolve(
  getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || path.join(projectRoot, 'src/scripts/export')),
)
const REPORT_DIR = path.resolve(projectRoot, 'src/scripts/reports')
const REPORT_PATH = path.join(REPORT_DIR, 'slug-mismatches.csv')

const reportConfigs: ReportConfig[] = [
  {
    collection: 'products',
    label: 'Products',
    routePrefix: '/products',
    files: ['products-with-variations.json', 'products.json', 'payload_products_import.json'],
  },
  {
    collection: 'posts',
    label: 'Posts',
    routePrefix: '/blog',
    files: ['posts.json'],
  },
  {
    collection: 'brands',
    label: 'Brands',
    routePrefix: '/brands',
    files: ['brands.merged.json', 'brands.json'],
  },
  {
    collection: 'categories',
    label: 'Product categories',
    routePrefix: '/categories',
    files: ['product-categories.merged.json', 'product-categories.json'],
  },
  {
    collection: 'post-categories',
    label: 'Post categories',
    routePrefix: '/blog/category',
    files: ['post-categories.merged.json', 'post-categories.json'],
  },
]

function shouldRun(collection: CollectionName): boolean {
  return ONLY.includes('all') || ONLY.includes(collection)
}

function getRendered(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const rendered = (value as AnyRecord).rendered
    if (typeof rendered === 'string') return rendered
  }
  return ''
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatSlug(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeSafeSlug(value: unknown, fallbackId?: string | number): string {
  let slug = formatSlug(String(value || ''))
  if (!slug) slug = `item-${fallbackId || Date.now()}`
  if (slug.length > 150) slug = slug.slice(0, 150).replace(/-+$/g, '')
  return slug || `item-${fallbackId || Date.now()}`
}

function normalizePath(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  let pathname = trimmed

  try {
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname
  } catch {
    return ''
  }

  pathname = '/' + pathname.replace(/^\/+/, '').replace(/\/+$/g, '')
  return pathname === '/' ? '/' : pathname
}

function buildPath(prefix: string, slug: string): string {
  return normalizePath(`${prefix}/${slug}`)
}

function readJsonArray(filePath: string): AnyRecord[] {
  if (!fs.existsSync(filePath)) return []
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed?.docs)) return parsed.docs
  if (Array.isArray(parsed?.data)) return parsed.data
  return []
}

function readSourceMap(config: ReportConfig): Map<number, SourceItem> {
  const map = new Map<number, SourceItem>()

  for (const fileName of config.files) {
    const rows = readJsonArray(path.join(DATA_DIR, fileName))

    for (const row of rows) {
      const id = Number(row.id ?? row.wpId ?? row.wordpressId)
      if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue

      const rawTitle = stripHtml(getRendered(row.title) || row.title || row.name || '')
      const name = stripHtml(String(row.name || rawTitle || ''))
      const slug = makeSafeSlug(row.slug || row.post_name || row.name || rawTitle, id)

      map.set(id, { id, slug, name, title: rawTitle || name })
    }
  }

  return map
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text
  return '"' + text.replace(/"/g, '""') + '"'
}

async function collectCollection(payload: any, config: ReportConfig): Promise<MismatchRow[]> {
  const sourceMap = readSourceMap(config)
  const rows: MismatchRow[] = []
  let page = 1
  let totalPages = 1
  let scanned = 0
  let matched = 0

  console.log(`\n=== ${config.label} (${config.collection}) ===`)
  console.log('Source rows:', sourceMap.size)

  do {
    const where = WP_ID ? { wpId: { equals: WP_ID } } : undefined
    const result = await payload.find({
      collection: config.collection,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      select: {
        title: true,
        name: true,
        slug: true,
        wpId: true,
      },
      ...(where ? { where } : {}),
    })

    totalPages = result.totalPages || 1

    for (const doc of result.docs as AnyRecord[]) {
      scanned += 1
      const wpId = Number(doc.wpId)
      if (!Number.isFinite(wpId) || wpId <= 0) continue

      const source = sourceMap.get(wpId)
      if (!source) continue
      matched += 1

      const currentSlug = makeSafeSlug(doc.slug, doc.id)
      const sourceSlug = makeSafeSlug(source.slug, wpId)

      if (currentSlug === sourceSlug) continue

      rows.push({
        collection: config.collection,
        id: doc.id,
        wpId,
        title: stripHtml(String(doc.title || doc.name || source.title || source.name || '')),
        currentSlug,
        sourceSlug,
        currentUrl: buildPath(config.routePrefix, currentSlug),
        sourceUrl: buildPath(config.routePrefix, sourceSlug),
        adminUrl: `/admin/collections/${config.collection}/${doc.id}`,
      })

      if (LIMIT > 0 && rows.length >= LIMIT) break
    }

    if (LIMIT > 0 && rows.length >= LIMIT) break
    page += 1
  } while (page <= totalPages)

  console.log('Scanned:', scanned)
  console.log('Matched:', matched)
  console.log('Mismatches:', rows.length)

  return rows
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const configs = reportConfigs.filter((config) => shouldRun(config.collection))
  const rows: MismatchRow[] = []

  console.log('Slug mismatch report')
  console.log('Data dir:', DATA_DIR)
  console.log('Only:', configs.map((item) => item.collection).join(', '))
  if (WP_ID) console.log('WP ID:', WP_ID)
  if (LIMIT) console.log('Limit:', LIMIT)

  for (const config of configs) {
    rows.push(...(await collectCollection(payload, config)))
  }

  rows.sort((a, b) =>
    a.collection.localeCompare(b.collection) || String(a.title).localeCompare(String(b.title)),
  )

  fs.mkdirSync(REPORT_DIR, { recursive: true })

  const headers = [
    'collection',
    'id',
    'wpId',
    'title',
    'currentSlug',
    'sourceSlug',
    'currentUrl',
    'sourceUrl',
    'adminUrl',
  ] as const

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')

  fs.writeFileSync(REPORT_PATH, csv, 'utf8')

  console.log('\n=== TOTAL ===')
  console.log('Mismatch rows:', rows.length)
  console.log('Report:', REPORT_PATH)

  if (rows.length > 0) {
    console.table(rows.slice(0, 20).map((row) => ({
      collection: row.collection,
      id: row.id,
      wpId: row.wpId,
      currentSlug: row.currentSlug,
      sourceSlug: row.sourceSlug,
      adminUrl: row.adminUrl,
    })))
  }
}

main().catch((error) => {
  console.error('[report-slug-mismatches] Fatal error:', error)
  process.exit(1)
})
