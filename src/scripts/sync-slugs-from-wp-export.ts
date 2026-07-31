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

type SyncConfig = {
  collection: CollectionName
  label: string
  routePrefix: string
  files: string[]
}

type Stats = {
  scanned: number
  matched: number
  missingWpId: number
  missingSource: number
  missingSourceSlug: number
  sameSlug: number
  slugConflicts: number
  redirectConflicts: number
  redirectsCreated: number
  redirectsUpdated: number
  redirectsSame: number
  redirectsSkipped: number
  updated: number
  failed: number
}

const args = process.argv.slice(2)
const argSet = new Set(args)

function getArg(name: string, fallback = ''): string {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = argSet.has('--yes')
const FORCE_REDIRECT = argSet.has('--force-redirect')
const INCLUDE_LEGACY_ALIASES = !argSet.has('--no-legacy-aliases')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const WP_ID = Number(getArg('--wp-id', '0')) || 0
const PAGE_SIZE = Math.max(20, Number(getArg('--page-size', '200')) || 200)
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

const syncConfigs: SyncConfig[] = [
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

function normalizeSlug(value: unknown): string {
  return makeSafeSlug(String(value || ''))
}

function normalizePath(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  let pathname = trimmed

  try {
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname
    }
  } catch {
    return ''
  }

  pathname = '/' + pathname.replace(/^\/+/, '').replace(/\/+$/, '')
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

function readSourceMap(config: SyncConfig): Map<number, SourceItem> {
  const map = new Map<number, SourceItem>()

  for (const fileName of config.files) {
    const filePath = path.join(DATA_DIR, fileName)
    const rows = readJsonArray(filePath)

    if (rows.length === 0) continue

    for (const row of rows) {
      const id = Number(row.id ?? row.wpId ?? row.wordpressId)
      if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue

      const rawTitle = stripHtml(getRendered(row.title) || row.title || row.name || '')
      const name = stripHtml(String(row.name || rawTitle || ''))
      const slug = makeSafeSlug(row.slug || row.post_name || row.name || rawTitle, id)

      if (!slug) continue

      map.set(id, {
        id,
        slug,
        name,
        title: rawTitle || name,
      })
    }
  }

  return map
}

async function findOne(payload: any, collection: string, where: AnyRecord) {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where,
  })

  return result.docs[0]
}

async function upsertRedirect(
  payload: any,
  from: string,
  to: string,
  dryRunLabel: string,
  stats: Stats,
): Promise<void> {
  const normalizedFrom = normalizePath(from)
  const normalizedTo = normalizePath(to)

  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    stats.redirectsSkipped += 1
    return
  }

  const existing = await findOne(payload, 'redirects', {
    from: {
      equals: normalizedFrom,
    },
  })

  if (!existing) {
    console.log(`${YES ? 'create' : 'preview create'} redirect ${normalizedFrom} -> ${normalizedTo} (${dryRunLabel})`)

    if (YES) {
      await payload.create({
        collection: 'redirects',
        overrideAccess: true,
        data: {
          active: true,
          from: normalizedFrom,
          to: normalizedTo,
          type: '301',
        },
      })
      stats.redirectsCreated += 1
    }

    return
  }

  const existingTo = normalizePath(existing.to || '')
  if (existingTo === normalizedTo && existing.active !== false && existing.type === '301') {
    stats.redirectsSame += 1
    return
  }

  if (!FORCE_REDIRECT) {
    stats.redirectConflicts += 1
    console.warn('redirect conflict', {
      from: normalizedFrom,
      existingTo: existing.to,
      expectedTo: normalizedTo,
      hint: 'Chay lai voi --force-redirect neu muon cap nhat redirect nay.',
    })
    return
  }

  console.log(`${YES ? 'update' : 'preview update'} redirect ${normalizedFrom}: ${existing.to || '(empty)'} -> ${normalizedTo}`)

  if (YES) {
    await payload.update({
      collection: 'redirects',
      id: existing.id,
      overrideAccess: true,
      data: {
        active: true,
        to: normalizedTo,
        type: '301',
      },
    })
    stats.redirectsUpdated += 1
  }
}

function legacyAliases(config: SyncConfig, slug: string, newPath: string): Array<[string, string, string]> {
  if (!INCLUDE_LEGACY_ALIASES) return []

  if (config.collection === 'posts') {
    return [[`/${slug}`, newPath, 'legacy blog root']]
  }

  if (config.collection === 'brands') {
    return [
      [`/thuong-hieu/${slug}`, newPath, 'legacy brand'],
      [`/thuong-hieu/${slug}/san-pham`, newPath, 'legacy brand products'],
    ]
  }

  if (config.collection === 'categories') {
    return [[`/danh-muc/${slug}`, newPath, 'legacy product category']]
  }

  return []
}

function createEmptyStats(): Stats {
  return {
    scanned: 0,
    matched: 0,
    missingWpId: 0,
    missingSource: 0,
    missingSourceSlug: 0,
    sameSlug: 0,
    slugConflicts: 0,
    redirectConflicts: 0,
    redirectsCreated: 0,
    redirectsUpdated: 0,
    redirectsSame: 0,
    redirectsSkipped: 0,
    updated: 0,
    failed: 0,
  }
}

async function syncCollection(payload: any, config: SyncConfig): Promise<Stats> {
  const sourceMap = readSourceMap(config)
  const stats = createEmptyStats()

  console.log(`\n=== ${config.label} (${config.collection}) ===`)
  console.log('Source rows:', sourceMap.size)

  if (sourceMap.size === 0) {
    console.warn('Khong co source rows, bo qua collection nay.')
    return stats
  }

  let page = 1
  let totalPages = 1
  let processed = 0

  do {
    const where = WP_ID
      ? {
          wpId: {
            equals: WP_ID,
          },
        }
      : undefined

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
      if (LIMIT > 0 && processed >= LIMIT) break
      processed += 1
      stats.scanned += 1

      const wpId = Number(doc.wpId)
      if (!Number.isFinite(wpId) || wpId <= 0) {
        stats.missingWpId += 1
        continue
      }

      const source = sourceMap.get(wpId)
      if (!source) {
        stats.missingSource += 1
        continue
      }

      stats.matched += 1

      const targetSlug = normalizeSlug(source.slug)
      const currentSlug = normalizeSlug(doc.slug)

      if (!targetSlug) {
        stats.missingSourceSlug += 1
        continue
      }

      if (currentSlug === targetSlug) {
        stats.sameSlug += 1

        const canonicalPath = buildPath(config.routePrefix, targetSlug)
        for (const [from, to, label] of legacyAliases(config, targetSlug, canonicalPath)) {
          await upsertRedirect(payload, from, to, label, stats)
        }

        continue
      }

      const slugOwner = await findOne(payload, config.collection, {
        slug: {
          equals: targetSlug,
        },
      })

      if (slugOwner && String(slugOwner.id) !== String(doc.id)) {
        stats.slugConflicts += 1
        console.warn('slug conflict', {
          collection: config.collection,
          wpId,
          currentId: doc.id,
          targetSlug,
          ownerId: slugOwner.id,
          ownerTitle: slugOwner.title || slugOwner.name,
        })
        continue
      }

      const oldPath = buildPath(config.routePrefix, currentSlug)
      const newPath = buildPath(config.routePrefix, targetSlug)

      console.log(`${YES ? 'update' : 'preview update'} ${config.collection} #${doc.id} wpId=${wpId}: ${currentSlug} -> ${targetSlug}`)

      try {
        await upsertRedirect(payload, oldPath, newPath, 'current slug to old WP slug', stats)

        for (const [from, to, label] of legacyAliases(config, targetSlug, newPath)) {
          await upsertRedirect(payload, from, to, label, stats)
        }

        if (YES) {
          await payload.update({
            collection: config.collection,
            id: doc.id,
            overrideAccess: true,
            data: {
              slug: targetSlug,
            },
          })
          stats.updated += 1
        }
      } catch (error) {
        stats.failed += 1
        console.error('update failed', {
          collection: config.collection,
          id: doc.id,
          wpId,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (LIMIT > 0 && processed >= LIMIT) break
    page += 1
  } while (page <= totalPages)

  console.log('Summary:', stats)
  return stats
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const selectedConfigs = syncConfigs.filter((config) => shouldRun(config.collection))

  console.log('Sync Payload slugs from WordPress export')
  console.log('Data dir:', DATA_DIR)
  console.log('Dry run:', YES ? 'no' : 'yes')
  console.log('Only:', selectedConfigs.map((item) => item.collection).join(', '))
  console.log('Legacy aliases:', INCLUDE_LEGACY_ALIASES ? 'yes' : 'no')
  console.log('Force redirect conflicts:', FORCE_REDIRECT ? 'yes' : 'no')
  if (LIMIT > 0) console.log('Limit:', LIMIT)
  if (WP_ID > 0) console.log('WP ID:', WP_ID)

  const totals = createEmptyStats()

  for (const config of selectedConfigs) {
    const stats = await syncCollection(payload, config)
    for (const key of Object.keys(totals) as Array<keyof Stats>) {
      totals[key] += stats[key]
    }
  }

  console.log('\n=== TOTAL ===')
  console.log(totals)

  if (totals.slugConflicts > 0 || totals.redirectConflicts > 0 || totals.failed > 0) {
    process.exitCode = 1
    console.log('\nCo conflict/failed. Xem log truoc khi chay tiep voi --force-redirect.')
  }

  if (!YES) {
    console.log('\nDry-run xong. Neu dung, chay lai voi --yes de cap nhat database va tao redirect 301.')
  }
}

main().catch((error) => {
  console.error('[sync-slugs-from-wp-export] Fatal error:', error)
  process.exit(1)
})
