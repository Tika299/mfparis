import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import postgres from 'postgres'

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)

function getArg(name: string, fallback = '') {
  const found = args.find((arg) => arg.startsWith(name + '='))
  return found ? found.split('=').slice(1).join('=') : fallback
}

function hasFlag(name: string) {
  return args.includes(name)
}

const DRY_RUN = !hasFlag('--yes')
const ONLY = getArg('--only', 'all')
const WP_ID = Number(getArg('--wp-id', '0')) || 0
const SLUG = getArg('--slug', '')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const DEFAULT_DATA_DIR = path.resolve(__dirname, 'export')
const DATA_DIR = path.resolve(getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || DEFAULT_DATA_DIR))

const COLLECTIONS = {
  products: {
    collection: 'products',
    table: 'products',
    files: ['products-with-variations.json', 'products.json', 'payload_products_import.json'],
    label: 'products',
  },
  posts: {
    collection: 'posts',
    table: 'posts',
    files: ['posts.json'],
    label: 'posts',
  },
  brands: {
    collection: 'brands',
    table: 'brands',
    files: ['brands.merged.json', 'brands.json'],
    label: 'brands',
  },
  categories: {
    collection: 'categories',
    table: 'categories',
    files: ['product-categories.merged.json', 'product-categories.json'],
    label: 'categories',
  },
  'post-categories': {
    collection: 'post-categories',
    table: 'post_categories',
    files: ['post-categories.merged.json', 'post-categories.json'],
    label: 'post-categories',
  },
} as const

function normalizeImportedTimestamp(value: unknown, isGmt = false): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const withTimezone =
    isGmt && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized + 'Z' : normalized
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

  return { createdAt, updatedAt }
}

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

function stripHTML(html: unknown): string {
  return typeof html === 'string'
    ? html.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

function getRendered(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && typeof (value as AnyRecord).rendered === 'string') {
    return (value as AnyRecord).rendered
  }
  return ''
}

function getItemSlug(item: AnyRecord) {
  const raw = item.slug || item.permalink || item.name || getRendered(item.title) || item.title || ''
  const slug = String(raw).split('/').filter(Boolean).pop() || raw
  return formatSlug(String(slug))
}

function resolveDataFile(files: readonly string[]) {
  for (const file of files) {
    const fullPath = path.resolve(DATA_DIR, file)
    if (fs.existsSync(fullPath)) return fullPath
  }
  return ''
}

function readJSON(file: string): AnyRecord[] {
  const raw = fs.readFileSync(file, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : parsed.docs || parsed.data || []
}

async function findPayloadDoc(payload: any, collection: string, item: AnyRecord) {
  const wpId = Number(item.id || item.wpId || item.wp_id) || 0

  if (wpId) {
    const byWpId = await payload.find({
      collection,
      where: { wpId: { equals: wpId } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })
    if (byWpId.docs[0]) return byWpId.docs[0]
  }

  const slug = getItemSlug(item)
  if (!slug) return null

  const bySlug = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return bySlug.docs[0] || null
}

async function updateSqlDates(sql: any, table: string, id: string | number, dates: { createdAt?: string; updatedAt?: string }) {
  const sets: string[] = []
  const params: any[] = []

  if (dates.createdAt) {
    params.push(dates.createdAt)
    sets.push('"created_at" = $' + params.length)
  }

  if (dates.updatedAt) {
    params.push(dates.updatedAt)
    sets.push('"updated_at" = $' + params.length)
  }

  if (!sets.length) return

  params.push(id)
  await sql.unsafe('UPDATE "' + table + '" SET ' + sets.join(', ') + ' WHERE "id" = $' + params.length, params)
}

async function repairCollection(payload: any, sql: any | null, key: keyof typeof COLLECTIONS) {
  const config = COLLECTIONS[key]
  const file = resolveDataFile(config.files)

  if (!file) {
    console.log('Skip ' + config.label + ': data file not found')
    return
  }

  let items = readJSON(file)
  if (WP_ID) items = items.filter((item) => Number(item.id || item.wpId || item.wp_id) === WP_ID)
  if (SLUG) items = items.filter((item) => getItemSlug(item) === SLUG)
  if (LIMIT) items = items.slice(0, LIMIT)

  let scanned = 0
  let updated = 0
  let missingDate = 0
  let missingDoc = 0
  let failed = 0

  console.log('\\nRepair dates ' + config.label + ': ' + items.length)
  console.log('Data file: ' + file)

  for (const item of items) {
    scanned += 1
    const dates = getImportedTimestamps(item)

    if (!dates.createdAt && !dates.updatedAt) {
      missingDate += 1
      continue
    }

    try {
      const doc = await findPayloadDoc(payload, config.collection, item)

      if (!doc?.id) {
        missingDoc += 1
        continue
      }

      const label = item.name || stripHTML(getRendered(item.title)) || item.slug || item.id || doc.id

      if (DRY_RUN) {
        console.log('   dry update ' + config.collection + ' #' + doc.id + ': ' + label)
        console.log('      createdAt=' + (dates.createdAt || '(keep)'))
        console.log('      updatedAt=' + (dates.updatedAt || '(keep)'))
      } else if (sql) {
        await updateSqlDates(sql, config.table, doc.id, dates)
      }

      updated += 1
    } catch (error: any) {
      failed += 1
      console.error('   Failed ' + config.collection + ' item ' + (item.id || item.slug) + ': ' + (error?.message || error))
    }
  }

  console.log('Done ' + config.label + ': scanned=' + scanned + ', updated=' + updated + ', missingDate=' + missingDate + ', missingDoc=' + missingDoc + ', failed=' + failed)
}

async function run() {
  console.log('Repair imported createdAt/updatedAt from old WordPress/WooCommerce export')
  console.log('Data dir: ' + DATA_DIR)
  console.log('Dry run: ' + (DRY_RUN ? 'yes' : 'no'))
  console.log('Only: ' + ONLY)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const selected =
    ONLY === 'all'
      ? Object.keys(COLLECTIONS)
      : ONLY.split(',').map((item) => item.trim()).filter(Boolean)

  const connectionString = process.env.DATABASE_URL
  if (!DRY_RUN && !connectionString) {
    throw new Error('DATABASE_URL is missing.')
  }

  const sql = DRY_RUN ? null : postgres(connectionString!, { max: 1 })

  try {
    for (const key of selected) {
      if (!(key in COLLECTIONS)) {
        console.warn('Skip unknown collection key: ' + key)
        continue
      }
      await repairCollection(payload, sql, key as keyof typeof COLLECTIONS)
    }
  } finally {
    if (sql) await sql.end()
  }
}

run().catch((error) => {
  console.error('Repair imported dates failed:', error)
  process.exit(1)
})
