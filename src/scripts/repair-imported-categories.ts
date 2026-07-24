import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { getPayload } from 'payload'

import { buildProductSearchKeywords } from '@/utilities/searchKeywords'

type AnyRecord = Record<string, any>
type ID = string | number

type RepairTarget = {
  collection: 'products' | 'posts'
  categoryCollection: 'categories' | 'post-categories'
  label: string
  sourceFiles: string[]
  categoryFiles: string[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const defaultDataDir = path.resolve(__dirname, 'export')

function getArg(name: string, fallback = '') {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

function hasFlag(name: string) {
  return args.includes(name)
}

const YES = hasFlag('--yes')
const ONLY = getArg('--only', 'all')
const DATA_DIR = path.resolve(getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || defaultDataDir))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const WP_ID = Number(getArg('--wp-id', '0')) || 0
const SLUG = getArg('--slug', '')
const ALLOW_EMPTY = hasFlag('--allow-empty')

const targets: Record<string, RepairTarget> = {
  products: {
    collection: 'products',
    categoryCollection: 'categories',
    label: 'products',
    sourceFiles: ['products-with-variations.json', 'products.json', 'payload_products_import.json'],
    categoryFiles: ['product-categories.merged.json', 'product-categories.json'],
  },
  posts: {
    collection: 'posts',
    categoryCollection: 'post-categories',
    label: 'posts',
    sourceFiles: ['posts.json'],
    categoryFiles: ['post-categories.merged.json', 'post-categories.json'],
  },
}

function normalizeSlug(value: unknown, fallbackId?: string | number): string {
  let slug = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/[^0-9a-z\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    slug = `item-${fallbackId || Date.now()}`
  }

  return slug
}

function compact(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getRendered(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as AnyRecord).rendered === 'string') {
    return (value as AnyRecord).rendered
  }
  return ''
}

function stripHTML(value: unknown): string {
  return String(value || '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveDataFile(files: string[]) {
  for (const file of files) {
    const fullPath = path.resolve(DATA_DIR, file)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }

  return ''
}

function readJSON(file: string): AnyRecord[] {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))

  if (Array.isArray(parsed)) {
    return parsed
  }

  if (Array.isArray(parsed?.docs)) {
    return parsed.docs
  }

  if (Array.isArray(parsed?.data)) {
    return parsed.data
  }

  return []
}

function getSourceTitle(item: AnyRecord, collection: RepairTarget['collection']) {
  if (collection === 'posts') {
    return stripHTML(getRendered(item.title) || item.title || item.slug || item.id)
  }

  return compact(item.name || item.title || item.slug || item.id)
}

function getSourceSlug(item: AnyRecord, collection: RepairTarget['collection']) {
  const title = getSourceTitle(item, collection)
  return normalizeSlug(item.slug || title, item.id)
}

function getCurrentIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return String(item)
      }

      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as AnyRecord).id
        return typeof id === 'string' || typeof id === 'number' ? String(id) : ''
      }

      return ''
    })
    .filter(Boolean)
}

function sameIds(left: ID[], right: string[]) {
  const a = left.map(String).sort()
  const b = right.map(String).sort()

  return a.length === b.length && a.every((value, index) => value === b[index])
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

async function buildCategoryMap(payload: any, target: RepairTarget) {
  const map = new Map<string, ID>()
  const file = resolveDataFile(target.categoryFiles)
  const sourceCategories = file ? readJSON(file) : []

  console.log(`Category map ${target.categoryCollection}: ${sourceCategories.length}`)

  for (const item of sourceCategories) {
    const wpId = Number(item.id || item.wpId || item.wp_id) || 0
    const title = compact(item.name || item.title || item.slug || item.id)
    const slug = normalizeSlug(item.slug || title, item.id)

    let doc = wpId
      ? await findOne(payload, target.categoryCollection, { wpId: { equals: wpId } })
      : null

    if (!doc?.id && slug) {
      doc = await findOne(payload, target.categoryCollection, { slug: { equals: slug } })
    }

    if (!doc?.id) {
      continue
    }

    if (wpId) {
      map.set(String(wpId), doc.id)
    }

    if (slug) {
      map.set(`slug:${slug}`, doc.id)
    }
  }

  return map
}

async function findImportedDoc(payload: any, target: RepairTarget, item: AnyRecord) {
  const wpId = Number(item.id || item.wpId || item.wp_id) || 0

  if (wpId) {
    const byWpId = await findOne(payload, target.collection, { wpId: { equals: wpId } })
    if (byWpId?.id) return byWpId

    if (target.collection === 'products') {
      const bySku = await findOne(payload, target.collection, { sku: { equals: String(wpId) } })
      if (bySku?.id) return bySku
    }
  }

  const slug = getSourceSlug(item, target.collection)
  if (!slug) {
    return null
  }

  return findOne(payload, target.collection, { slug: { equals: slug } })
}

function getSourceCategoryItems(target: RepairTarget, item: AnyRecord): AnyRecord[] {
  if (target.collection === 'posts') {
    return (Array.isArray(item.categories) ? item.categories : [])
      .map((id) => ({ id }))
      .filter((category) => Number(category.id) > 0)
  }

  return Array.isArray(item.categories) ? item.categories : []
}

function resolveCategoryIds(
  target: RepairTarget,
  item: AnyRecord,
  categoryMap: Map<string, ID>,
) {
  const ids: ID[] = []

  for (const category of getSourceCategoryItems(target, item)) {
    const wpId = Number(category.id || category.wpId || category.wp_id) || 0
    const slug = normalizeSlug(category.slug || category.name || category.title || '', wpId || undefined)
    const byId = wpId ? categoryMap.get(String(wpId)) : undefined
    const bySlug = slug ? categoryMap.get(`slug:${slug}`) : undefined
    const nextId = byId || bySlug

    if (nextId) {
      ids.push(nextId)
    }
  }

  return Array.from(new Set(ids.map(String))).map((id) => {
    const original = ids.find((value) => String(value) === id)
    return original || id
  })
}

async function refreshProductSearchKeywords(payload: any, productId: ID) {
  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 2,
    overrideAccess: true,
  })
  const searchKeywords = buildProductSearchKeywords(product)

  await payload.update({
    collection: 'products',
    id: productId,
    data: { searchKeywords },
    depth: 0,
    overrideAccess: true,
  })
}

async function repairTarget(payload: any, target: RepairTarget) {
  const sourceFile = resolveDataFile(target.sourceFiles)

  if (!sourceFile) {
    console.log(`Skip ${target.label}: source file not found`)
    return
  }

  const categoryMap = await buildCategoryMap(payload, target)
  let sourceItems = readJSON(sourceFile)

  if (WP_ID) {
    sourceItems = sourceItems.filter((item) => Number(item.id || item.wpId || item.wp_id) === WP_ID)
  }

  if (SLUG) {
    sourceItems = sourceItems.filter((item) => getSourceSlug(item, target.collection) === SLUG)
  }

  if (LIMIT) {
    sourceItems = sourceItems.slice(0, LIMIT)
  }

  let scanned = 0
  let changed = 0
  let updated = 0
  let alreadyOk = 0
  let missingDoc = 0
  let missingCategories = 0
  let failed = 0

  console.log(`\nRepair ${target.label} categories`)
  console.log(`Data file: ${sourceFile}`)
  console.log(`Items: ${sourceItems.length}`)

  for (const item of sourceItems) {
    scanned += 1

    try {
      const nextCategoryIds = resolveCategoryIds(target, item, categoryMap)
      const title = getSourceTitle(item, target.collection)

      if (!nextCategoryIds.length && !ALLOW_EMPTY) {
        missingCategories += 1
        continue
      }

      const doc = await findImportedDoc(payload, target, item)

      if (!doc?.id) {
        missingDoc += 1
        console.log(`   missing ${target.collection}: wpId=${item.id || ''} ${title}`)
        continue
      }

      const currentIds = getCurrentIds(doc.categories)

      if (sameIds(nextCategoryIds, currentIds)) {
        alreadyOk += 1
        continue
      }

      changed += 1
      console.log(
        `${YES ? '   update' : '   dry-update'} ${target.collection} #${doc.id}: ${title} ` +
          `[${currentIds.join(',') || '-'}] -> [${nextCategoryIds.map(String).join(',') || '-'}]`,
      )

      if (YES) {
        await payload.update({
          collection: target.collection,
          id: doc.id,
          data: {
            categories: nextCategoryIds,
          },
          depth: 0,
          overrideAccess: true,
        })

        if (target.collection === 'products') {
          await refreshProductSearchKeywords(payload, doc.id)
        }

        updated += 1
      }
    } catch (error) {
      failed += 1
      console.warn(
        `   failed ${target.collection} wpId=${item.id || ''}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  console.log(`Done ${target.label}`)
  console.log(`Scanned: ${scanned}`)
  console.log(YES ? `Updated: ${updated}` : `Would update: ${changed}`)
  console.log(`Already OK: ${alreadyOk}`)
  console.log(`Missing mapped categories: ${missingCategories}`)
  console.log(`Missing docs: ${missingDoc}`)
  console.log(`Failed: ${failed}`)
}

async function run() {
  console.log('Repair imported categories from WordPress/WooCommerce export')
  console.log(`Data dir: ${DATA_DIR}`)
  console.log(`Dry run: ${YES ? 'no' : 'yes'}`)
  console.log(`Only: ${ONLY}`)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const selected =
    ONLY === 'all'
      ? ['products', 'posts']
      : ONLY.split(',').map((item) => item.trim()).filter(Boolean)

  for (const key of selected) {
    const target = targets[key]

    if (!target) {
      console.warn(`Skip unknown target: ${key}`)
      continue
    }

    await repairTarget(payload, target)
  }

  if (!YES) {
    console.log('\nRun with --yes to write changes.')
  }
}

run().catch((error) => {
  console.error('Repair imported categories failed:', error)
  process.exit(1)
})
