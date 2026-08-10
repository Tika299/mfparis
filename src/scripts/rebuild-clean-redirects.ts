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
}

type CollectionConfig = {
  collection: CollectionName
  label: string
  routePrefix: string
  files: string[]
  legacyPrefixes: string[]
  rootAlias: boolean
}

type RedirectCandidate = {
  from: string
  to: string
  reason: string
  priority: number
}

type Stats = {
  currentRedirects: number
  deletedRedirects: number
  scannedDocs: number
  sourceMatched: number
  candidates: number
  duplicateSame: number
  duplicateConflicts: number
  skippedSelf: number
  skippedInvalid: number
  created: number
  failed: number
}

const args = process.argv.slice(2)
const argSet = new Set(args)

function getArg(name: string, fallback = ''): string {
  const found = args.find((arg) => arg.startsWith(name + '='))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = argSet.has('--yes')
const DELETE_EXISTING = argSet.has('--delete-existing')
const INCLUDE_LEGACY = !argSet.has('--no-legacy')
const INCLUDE_SILO = !argSet.has('--no-silo')
const PAGE_SIZE = Math.max(50, Number(getArg('--page-size', '300')) || 300)
const ONLY = getArg('--only', 'all')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const projectRoot = process.cwd()
dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local'), override: false })

const DATA_DIR = path.resolve(
  getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || path.join(projectRoot, 'src/scripts/export')),
)

const REPORT_DIR = path.join(projectRoot, 'src/scripts/reports')
const REPORT_FILE = path.join(REPORT_DIR, 'rebuild-clean-redirects.csv')
const CONFLICT_FILE = path.join(REPORT_DIR, 'rebuild-clean-redirect-conflicts.csv')

const configs: CollectionConfig[] = [
  {
    collection: 'products',
    label: 'Products',
    routePrefix: '/products',
    files: ['products-with-variations.json', 'products.json', 'payload_products_import.json'],
    legacyPrefixes: ['/san-pham'],
    rootAlias: true,
  },
  {
    collection: 'posts',
    label: 'Posts',
    routePrefix: '/blog',
    files: ['posts.json'],
    legacyPrefixes: [],
    rootAlias: true,
  },
  {
    collection: 'brands',
    label: 'Brands',
    routePrefix: '/brands',
    files: ['brands.merged.json', 'brands.json'],
    legacyPrefixes: ['/thuong-hieu'],
    rootAlias: false,
  },
  {
    collection: 'categories',
    label: 'Product categories',
    routePrefix: '/categories',
    files: ['product-categories.merged.json', 'product-categories.json'],
    legacyPrefixes: ['/danh-muc', '/danh-muc-san-pham'],
    rootAlias: true,
  },
  {
    collection: 'post-categories',
    label: 'Post categories',
    routePrefix: '/blog/category',
    files: ['post-categories.merged.json', 'post-categories.json'],
    legacyPrefixes: ['/category', '/danh-muc-bai-viet'],
    rootAlias: false,
  },
]

const reservedRootSlugs = new Set([
  'admin',
  'api',
  'blog',
  'brands',
  'cart',
  'categories',
  'checkout',
  'contact',
  'gio-hang',
  'products',
  'search',
  'sitemap.xml',
])

const stats: Stats = {
  currentRedirects: 0,
  deletedRedirects: 0,
  scannedDocs: 0,
  sourceMatched: 0,
  candidates: 0,
  duplicateSame: 0,
  duplicateConflicts: 0,
  skippedSelf: 0,
  skippedInvalid: 0,
  created: 0,
  failed: 0,
}

const candidates = new Map<string, RedirectCandidate>()
const reportRows: string[][] = []
const conflictRows: string[][] = []

function shouldRun(collection: CollectionName): boolean {
  return ONLY.includes('all') || ONLY.includes(collection)
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"'
  return text
}

function writeCsv(filePath: string, rows: string[][]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n', 'utf8')
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getRendered(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const rendered = (value as AnyRecord).rendered
    if (typeof rendered === 'string') return rendered
  }
  return ''
}

function formatSlug(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/([^0-9a-z\-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeSlug(value: unknown): string {
  const slug = formatSlug(value)
  if (!slug) return ''
  return slug.length > 150 ? slug.slice(0, 150).replace(/-+$/g, '') : slug
}

function normalizePath(value: unknown): string {
  let text = String(value || '').trim()
  if (!text) return ''

  try {
    if (/^https?:\/\//i.test(text)) {
      const url = new URL(text)
      text = url.pathname
    }
  } catch {
    return ''
  }

  text = '/' + text.replace(/^\/+/, '').replace(/\/+$/, '')
  return text === '/' ? '/' : text
}

function buildPath(prefix: string, slug: string): string {
  return normalizePath(prefix.replace(/\/+$/g, '') + '/' + slug)
}

function getWpId(doc: AnyRecord): number {
  const value = Number(doc.wpId ?? doc.wordpressId ?? doc.wp_id)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function readJsonArray(filePath: string): AnyRecord[] {
  if (!fs.existsSync(filePath)) return []
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed?.docs)) return parsed.docs
  if (Array.isArray(parsed?.data)) return parsed.data
  return []
}

function readSourceMap(config: CollectionConfig): Map<number, SourceItem> {
  const map = new Map<number, SourceItem>()

  for (const fileName of config.files) {
    const rows = readJsonArray(path.join(DATA_DIR, fileName))
    for (const row of rows) {
      const id = Number(row.id ?? row.wpId ?? row.wordpressId ?? row.wp_id)
      if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue

      const rawTitle = stripHtml(getRendered(row.title) || row.title || row.name || '')
      const slug = normalizeSlug(row.slug || row.post_name || row.name || rawTitle)
      if (!slug) continue

      map.set(id, { id, slug })
    }
  }

  return map
}

function addCandidate(from: string, to: string, reason: string, priority: number): void {
  const normalizedFrom = normalizePath(from)
  const normalizedTo = normalizePath(to)

  if (!normalizedFrom || !normalizedTo) {
    stats.skippedInvalid += 1
    return
  }

  if (normalizedFrom === normalizedTo) {
    stats.skippedSelf += 1
    return
  }

  const current = candidates.get(normalizedFrom)
  if (!current) {
    candidates.set(normalizedFrom, {
      from: normalizedFrom,
      to: normalizedTo,
      reason,
      priority,
    })
    reportRows.push(['candidate', normalizedFrom, normalizedTo, reason, String(priority)])
    return
  }

  if (current.to === normalizedTo) {
    stats.duplicateSame += 1
    return
  }

  stats.duplicateConflicts += 1
  conflictRows.push([
    normalizedFrom,
    current.to,
    normalizedTo,
    current.reason,
    reason,
    String(current.priority),
    String(priority),
  ])

  if (priority < current.priority) {
    candidates.set(normalizedFrom, {
      from: normalizedFrom,
      to: normalizedTo,
      reason,
      priority,
    })
  }
}

function addAliasesForSlug(config: CollectionConfig, slug: string, target: string, reasonPrefix: string): void {
  const cleanSlug = normalizeSlug(slug)
  if (!cleanSlug) return

  addCandidate(buildPath(config.routePrefix, cleanSlug), target, reasonPrefix + ' same-route alias', 15)

  if (!INCLUDE_LEGACY) return

  for (const prefix of config.legacyPrefixes) {
    addCandidate(buildPath(prefix, cleanSlug), target, reasonPrefix + ' legacy prefix ' + prefix, 30)
  }

  if (config.rootAlias && !reservedRootSlugs.has(cleanSlug)) {
    addCandidate('/' + cleanSlug, target, reasonPrefix + ' legacy root alias', 40)
  }

  if (config.collection === 'brands') {
    addCandidate('/thuong-hieu/' + cleanSlug + '/san-pham', target, reasonPrefix + ' legacy brand products', 30)
  }
}

async function countRedirects(payload: any): Promise<number> {
  const result = await payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    pagination: true,
    overrideAccess: true,
  })

  return result.totalDocs || 0
}

async function deleteAllRedirects(payload: any): Promise<void> {
  while (true) {
    const result = await payload.find({
      collection: 'redirects',
      depth: 0,
      limit: PAGE_SIZE,
      pagination: false,
      overrideAccess: true,
      select: { id: true },
    })

    if (result.docs.length === 0) return

    for (const redirect of result.docs) {
      await payload.delete({
        collection: 'redirects',
        id: redirect.id,
        overrideAccess: true,
      })
      stats.deletedRedirects += 1
    }
  }
}

async function buildCollectionCandidates(payload: any, config: CollectionConfig): Promise<void> {
  if (!shouldRun(config.collection)) return

  const sourceMap = readSourceMap(config)
  console.log('\n' + config.label)
  console.log('Source rows:', sourceMap.size)

  let page = 1
  let totalPages = 1

  do {
    const result = await payload.find({
      collection: config.collection,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      select: {
        slug: true,
        wpId: true,
        wordpressId: true,
        wp_id: true,
        title: true,
        name: true,
      },
    })

    totalPages = result.totalPages || 1

    for (const doc of result.docs as AnyRecord[]) {
      stats.scannedDocs += 1

      const currentSlug = normalizeSlug(doc.slug)
      if (!currentSlug) {
        stats.skippedInvalid += 1
        continue
      }

      const target = buildPath(config.routePrefix, currentSlug)
      const wpId = getWpId(doc)
      const source = wpId ? sourceMap.get(wpId) : undefined
      const sourceSlug = source?.slug ? normalizeSlug(source.slug) : ''

      if (sourceSlug) {
        stats.sourceMatched += 1
        addAliasesForSlug(config, sourceSlug, target, config.collection + ' wp source')
      }

      if (!sourceSlug || sourceSlug !== currentSlug) {
        addAliasesForSlug(config, currentSlug, target, config.collection + ' current')
      }
    }

    page += 1
  } while (page <= totalPages)
}

function parseRedirectPairsFromText(text: unknown): Array<[string, string]> {
  const value = String(text || '').trim()
  if (!value || !value.includes('/')) return []

  const pairs: Array<[string, string]> = []
  const arrowPatterns = [
    /((?:https?:\/\/[^\s]+)|(?:\/[\w%\-.~!$&'()*+,;=:@\/]+))\s*(?:->|→|=>|sang|to)\s*((?:https?:\/\/[^\s]+)|(?:\/[\w%\-.~!$&'()*+,;=:@\/]+))/giu,
    /301\s*:?\s*((?:https?:\/\/[^\s]+)|(?:\/[\w%\-.~!$&'()*+,;=:@\/]+))\s*(?:->|→|=>)\s*((?:https?:\/\/[^\s]+)|(?:\/[\w%\-.~!$&'()*+,;=:@\/]+))/giu,
  ]

  for (const pattern of arrowPatterns) {
    for (const match of value.matchAll(pattern)) {
      pairs.push([match[1], match[2]])
    }
  }

  return pairs
}

function readSiloRedirects(): void {
  if (!INCLUDE_SILO) return

  const filePath = path.join(projectRoot, 'src/scripts/silo-phase-1-3-data.json')
  if (!fs.existsSync(filePath)) return

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const groups = [parsed.productCategories, parsed.blogCategories, parsed.redirects]

  let added = 0
  for (const group of groups) {
    if (!Array.isArray(group)) continue

    for (const row of group) {
      if (!row || typeof row !== 'object') continue

      for (const [key, value] of Object.entries(row)) {
        if (!String(key).toLowerCase().includes('redirect')) continue

        for (const [from, to] of parseRedirectPairsFromText(value)) {
          addCandidate(from, to, 'silo explicit redirect', 5)
          added += 1
        }
      }
    }
  }

  console.log('\nSilo redirects parsed:', added)
}

async function createRedirects(payload: any): Promise<void> {
  for (const candidate of candidates.values()) {
    try {
      await payload.create({
        collection: 'redirects',
        overrideAccess: true,
        data: {
          active: true,
          from: candidate.from,
          to: candidate.to,
          type: '301',
        },
      })
      stats.created += 1
    } catch (error: unknown) {
      stats.failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error('create failed', candidate.from, '->', candidate.to, message)
      reportRows.push(['failed', candidate.from, candidate.to, candidate.reason, message])
    }
  }
}

async function main(): Promise<void> {
  const payload = await getPayload({ config: configPromise })

  console.log('Clean redirect rebuild')
  console.log('Data dir:', DATA_DIR)
  console.log('Dry run:', YES ? 'no' : 'yes')
  console.log('Delete existing:', DELETE_EXISTING ? 'yes' : 'no')
  console.log('Include legacy aliases:', INCLUDE_LEGACY ? 'yes' : 'no')
  console.log('Include silo redirects:', INCLUDE_SILO ? 'yes' : 'no')
  console.log('Scope:', ONLY.join(', '))

  stats.currentRedirects = await countRedirects(payload)

  reportRows.push(['status', 'from', 'to', 'reason', 'priority_or_message'])
  conflictRows.push(['from', 'keptTo', 'conflictTo', 'keptReason', 'conflictReason', 'keptPriority', 'conflictPriority'])

  for (const config of configs) {
    await buildCollectionCandidates(payload, config)
  }

  readSiloRedirects()

  stats.candidates = candidates.size

  writeCsv(REPORT_FILE, reportRows)
  writeCsv(CONFLICT_FILE, conflictRows)

  console.log('\nPreview summary:')
  console.log(JSON.stringify(stats, null, 2))
  console.log('Would delete redirects:', DELETE_EXISTING ? stats.currentRedirects : 0)
  console.log('Would create redirects:', stats.candidates)
  console.log('Report:', REPORT_FILE)
  console.log('Conflicts:', CONFLICT_FILE)

  if (!YES) {
    console.log('\nDry-run xong. Neu dung, chay lai voi --yes --delete-existing de xoa redirect cu va tao lai.')
    return
  }

  if (DELETE_EXISTING) {
    console.log('\nDeleting existing redirects...')
    await deleteAllRedirects(payload)
    console.log('Deleted redirects:', stats.deletedRedirects)
  }

  console.log('\nCreating clean redirects...')
  await createRedirects(payload)

  writeCsv(REPORT_FILE, reportRows)
  writeCsv(CONFLICT_FILE, conflictRows)

  console.log('\nDone.')
  console.log(JSON.stringify(stats, null, 2))
  console.log('Report:', REPORT_FILE)
  console.log('Conflicts:', CONFLICT_FILE)
}

main().catch((error: unknown) => {
  console.error('Clean redirect rebuild failed:', error)
  process.exit(1)
})
