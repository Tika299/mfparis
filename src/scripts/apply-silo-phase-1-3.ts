import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import data from './silo-phase-1-3-data.json'

import {
  normalizeRedirectDestination,
  normalizeRedirectSource,
} from '@/utilities/redirects'

type AnyRecord = Record<string, any>
type CollectionSlug = 'categories' | 'post-categories'
type ContentCollectionSlug = 'products' | 'posts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const ALL_PRIORITIES = args.includes('--all-priorities')
const APPLY_REDIRECTS = args.includes('--apply-redirects')
const UPDATE_SLUGS = args.includes('--update-slugs')
const ONLY = getArg('--only', 'all')
const priorities = new Set(
  (getArg('--priority', ALL_PRIORITIES ? 'P0,P1,P2,P3' : 'P0,P1') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
)

function getArg(name: string, fallback = '') {
  const found = args.find((arg) => arg.startsWith(name + '='))
  return found ? found.split('=').slice(1).join('=') : fallback
}

function compact(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeSlug(value: unknown, fallback = ''): string {
  let slug = compact(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/[^0-9a-z\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) slug = fallback
  return slug
}

function relationID(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as AnyRecord).id
    return typeof id === 'string' || typeof id === 'number' ? String(id) : ''
  }
  return ''
}

function relationPayloadID(value: string): string | number {
  return /^\d+$/.test(value) ? Number(value) : value
}

function isSelectedPriority(row: AnyRecord): boolean {
  const priority = compact(row['Ưu tiên'])
  return priorities.has(priority)
}

function isRemovedTarget(value: unknown): boolean {
  const text = compact(value).toLowerCase()
  return !text || text.includes('không còn') || text === 'none'
}

function mapTaxonomyType(value: unknown): string {
  const text = compact(value).toLowerCase()
  if (text.includes('collection')) return 'collection'
  if (text.includes('hỗ trợ')) return 'support'
  if (text.includes('trung gian')) return 'temporary-node'
  if (text.includes('facet')) return 'facet'
  if (text.includes('loại bỏ')) return 'removed'
  return 'category'
}

function mapSeoIndex(value: unknown): string {
  const text = compact(value).toLowerCase()
  if (text.includes('sau khi chuyển')) return 'noindex-after-move'
  if (text.includes('có điều kiện')) return 'conditional-index'
  if (text.includes('noindex tạm')) return 'noindex-temporary'
  if (text.includes('noindex')) return 'noindex'
  return 'index'
}

function mapRedirectStatus(value: unknown): string | undefined {
  const text = compact(value).toLowerCase()
  if (!text) return undefined
  if (text.includes('410')) return '410-noindex'
  if (text.includes('301')) return '301'
  if (text.includes('giữ/noindex')) return 'keep-noindex'
  if (text.includes('giữ/đánh giá')) return 'review'
  if (text.includes('noindex')) return 'noindex'
  if (text.includes('giữ')) return 'keep'
  return undefined
}

function normalizePathname(value: unknown): string {
  const raw = compact(value)
  if (!raw) return ''
  const withoutArrow = raw.replace(/^301\s*[→>-]+\s*/i, '').trim()
  try {
    const url = new URL(withoutArrow)
    return url.pathname.endsWith('/') ? url.pathname : url.pathname + '/'
  } catch {
    const pathname = withoutArrow.startsWith('/') ? withoutArrow : '/' + withoutArrow
    return pathname.endsWith('/') ? pathname : pathname + '/'
  }
}

function extractRedirectTarget(value: unknown): string {
  const text = compact(value)
  const match = text.match(/301\s*[→>-]+\s*(\S+)/i)
  return normalizePathname(match ? match[1] : text)
}

const categoryRedirectTargets = new Set(
  ((data as AnyRecord).productCategories || [])
    .map((row: AnyRecord) =>
      normalizePathname(row['Slug đích'] || row['Slug hiện tại']),
    )
    .filter(Boolean),
)

function normalizeSiloRedirectTarget(pathname: string): string {
  const normalizedPathname = normalizePathname(pathname)

  if (!normalizedPathname || normalizedPathname === '/') {
    return normalizedPathname
  }

  if (
    normalizedPathname.startsWith('/brands/') ||
    normalizedPathname.startsWith('/blog/') ||
    normalizedPathname.startsWith('/categories/') ||
    normalizedPathname.startsWith('/products/') ||
    normalizedPathname.startsWith('/search')
  ) {
    return normalizedPathname
  }

  if (categoryRedirectTargets.has(normalizedPathname)) {
    return normalizePathname('/categories' + normalizedPathname)
  }

  return normalizedPathname
}

function normalizeRedirectFrom(value: unknown): string {
  return normalizeRedirectSource(normalizePathname(value)) || ''
}

function normalizeRedirectTo(value: unknown): string {
  const target = normalizeSiloRedirectTarget(extractRedirectTarget(value))
  return normalizeRedirectDestination(target) || ''
}

function buildNotes(row: AnyRecord): string {
  return [
    compact(row['Lý do']),
    compact(row['Ghi chú triển khai']),
    compact(row['Redirect / xử lý URL']),
    compact(row['Redirect / ghi chú URL']),
  ]
    .filter(Boolean)
    .join('\n')
}

async function findOne(payload: any, collection: string, where: AnyRecord) {
  const result = await payload.find({
    collection,
    where,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0] || null
}

async function getAllDocs(payload: any, collection: string) {
  const docs: AnyRecord[] = []
  let page = 1
  let totalPages = 1

  do {
    const result = await payload.find({
      collection,
      depth: 1,
      limit: 500,
      page,
      pagination: true,
      overrideAccess: true,
    })

    docs.push(...result.docs)
    totalPages = result.totalPages || 1
    page += 1
  } while (page <= totalPages)

  return docs
}

function buildDocMaps(docs: AnyRecord[]) {
  const byWpId = new Map<string, AnyRecord>()
  const bySlug = new Map<string, AnyRecord>()
  const byName = new Map<string, AnyRecord>()

  for (const doc of docs) {
    if (doc.wpId) byWpId.set(String(doc.wpId), doc)
    if (doc.slug) bySlug.set(normalizeSlug(doc.slug), doc)
    for (const name of [doc.name, doc.title, doc.displayName]) {
      const normalized = normalizeSlug(name)
      if (normalized && !byName.has(normalized)) byName.set(normalized, doc)
    }
  }

  return { byWpId, bySlug, byName }
}

function findMappedDoc(row: AnyRecord, maps: ReturnType<typeof buildDocMaps>, titleKey: string) {
  const wpId = row.ID || row.id
  const currentSlug = normalizeSlug(row['Slug hiện tại'] || row['Slug đề xuất'])
  const targetSlug = normalizeSlug(row['Slug đích'] || row['Slug đề xuất'])
  const currentName = normalizeSlug(row[titleKey] || row['Danh mục hiện tại'])
  const targetName = normalizeSlug(row['Tên đích'])

  return (
    (wpId ? maps.byWpId.get(String(wpId)) : null) ||
    maps.bySlug.get(currentSlug) ||
    maps.bySlug.get(targetSlug) ||
    maps.byName.get(currentName) ||
    maps.byName.get(targetName) ||
    null
  )
}

function findTargetDoc(row: AnyRecord, maps: ReturnType<typeof buildDocMaps>) {
  const targetSlug = normalizeSlug(row['Slug đích'] || row['Slug đề xuất'])
  const targetName = normalizeSlug(row['Tên đích'])
  return maps.bySlug.get(targetSlug) || maps.byName.get(targetName) || null
}

function findParentDoc(row: AnyRecord, maps: ReturnType<typeof buildDocMaps>) {
  const parentLabel = compact(row['Cha đích'])
  if (!parentLabel) return null
  return maps.byName.get(normalizeSlug(parentLabel)) || maps.bySlug.get(normalizeSlug(parentLabel)) || null
}

function buildCategoryPatch(row: AnyRecord, collection: CollectionSlug, maps: ReturnType<typeof buildDocMaps>) {
  const nameField = collection === 'categories' ? 'name' : 'title'
  const targetName = compact(row['Tên đích'])
  const targetSlug = normalizeSlug(row['Slug đích'] || row['Slug đề xuất'])
  const parent = findParentDoc(row, maps)
  const patch: AnyRecord = {
    displayName: isRemovedTarget(targetName) ? undefined : targetName,
    taxonomyType: mapTaxonomyType(row['Loại taxonomy']),
    seoIndex: mapSeoIndex(row['Index đích'] || row.Index),
    siloParentLabel: compact(row['Cha đích']) || undefined,
    menuPlacement: compact(row.Menu) || undefined,
    implementationPriority: compact(row['Ưu tiên']) || undefined,
    implementationStatus: 'planned',
    siloAction: compact(row['Hành động']) || undefined,
    redirectStatus: mapRedirectStatus(row['Mã xử lý'] || row['Redirect / xử lý URL'] || row['Redirect / ghi chú URL']),
    siloNotes: buildNotes(row) || undefined,
    sourceUrl: compact(row['URL hiện tại']) || undefined,
    importNotes: buildNotes(row) || undefined,
  }

  if (!isRemovedTarget(targetName)) {
    patch[nameField] = targetName
  }

  if (UPDATE_SLUGS && targetSlug && !isRemovedTarget(targetName)) {
    patch.slug = targetSlug
  }

  if (parent?.id) {
    patch.parent = parent.id
  } else if (!compact(row['Cha đích'])) {
    patch.parent = null
  }

  const redirectTarget = normalizeSiloRedirectTarget(
    extractRedirectTarget(row['Redirect / xử lý URL'] || row['Redirect / ghi chú URL']),
  )
  if (redirectTarget && redirectTarget !== '/') patch.redirectTo = redirectTarget

  return patch
}

function cleanPatch(patch: AnyRecord): AnyRecord {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))
}

function idsEqual(left: unknown[], right: string[]) {
  const a = left.map(String).sort()
  const b = right.map(String).sort()
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function isMergeAction(row: AnyRecord) {
  return compact(row['Hành động']).toUpperCase().includes('GỘP')
}

async function moveAssignments(
  payload: any,
  contentCollection: ContentCollectionSlug,
  fieldName: 'categories',
  sourceID: string | number,
  targetID: string | number,
) {
  let page = 1
  let totalPages = 1
  let updated = 0

  do {
    const result = await payload.find({
      collection: contentCollection,
      depth: 1,
      limit: 100,
      page,
      pagination: true,
      overrideAccess: true,
      where: { [fieldName]: { contains: sourceID } },
    })

    totalPages = result.totalPages || 1

    for (const doc of result.docs) {
      const current = Array.isArray(doc[fieldName]) ? doc[fieldName].map(relationID).filter(Boolean) : []
      const next = Array.from(new Set(current.filter((id: string) => id !== String(sourceID)).concat(String(targetID))))
      if (idsEqual(current, next)) continue

      console.log('   move ' + contentCollection + ' #' + doc.id + ': ' + sourceID + ' -> ' + targetID)

      if (YES) {
        await payload.update({
          collection: contentCollection,
          id: doc.id,
          overrideAccess: true,
          data: { [fieldName]: next.map(relationPayloadID) },
        })
      }

      updated += 1
    }

    page += 1
  } while (page <= totalPages)

  return updated
}

async function applyCategoryRows(payload: any, collection: CollectionSlug, rows: AnyRecord[]) {
  const nameKey = collection === 'categories' ? 'Tên hiện tại' : 'Danh mục hiện tại'
  const contentCollection: ContentCollectionSlug = collection === 'categories' ? 'products' : 'posts'
  const docs = await getAllDocs(payload, collection)
  const maps = buildDocMaps(docs)
  let matched = 0
  let updated = 0
  let missing = 0
  let movedAssignments = 0

  for (const row of rows.filter(isSelectedPriority)) {
    const doc = findMappedDoc(row, maps, nameKey)
    if (!doc?.id) {
      missing += 1
      console.warn('missing ' + collection + ': ' + compact(row[nameKey]) + ' / ' + compact(row['Slug hiện tại'] || row['Slug đề xuất']))
      continue
    }

    matched += 1
    const patch = buildCategoryPatch(row, collection, maps)
    console.log((YES ? 'update ' : 'dry-run ') + collection + ' #' + doc.id + ': ' + compact(row[nameKey]) + ' -> ' + compact(row['Tên đích']))

    if (YES) {
      const cleanData = cleanPatch(patch)
      await payload.update({
        collection,
        id: doc.id,
        overrideAccess: true,
        data: cleanData,
      })
      updated += 1
    }

    if (isMergeAction(row)) {
      const target = findTargetDoc(row, maps)
      if (target?.id && String(target.id) !== String(doc.id)) {
        movedAssignments += await moveAssignments(payload, contentCollection, 'categories', doc.id, target.id)
      } else {
        console.warn('   merge target missing/same for ' + compact(row[nameKey]) + ' -> ' + compact(row['Tên đích']))
      }
    }
  }

  return { collection, matched, updated, missing, movedAssignments }
}

async function applyRedirectPreview(payload: any, rows: AnyRecord[]) {
  let candidates = 0
  let created = 0
  let skipped = 0
  let conflicts = 0

  for (const row of rows.filter(isSelectedPriority)) {
    const status = compact(row['Mã xử lý'])
    if (!status.includes('301')) continue

    const from = normalizeRedirectFrom(row['URL hiện tại'])
    const to = normalizeRedirectTo(row['URL đích / xử lý'])
    if (!from || !to || to === '/') continue
    candidates += 1

    const existing = await findOne(payload, 'redirects', { from: { equals: from } })

    if (existing?.id) {
      if (normalizeRedirectDestination(existing.to) === to) {
        skipped += 1
      } else {
        conflicts += 1
        console.warn('redirect conflict: ' + from + ' existing=' + existing.to + ' expected=' + to)
      }
      continue
    }

    console.log((APPLY_REDIRECTS && YES ? 'create redirect ' : 'preview redirect ') + from + ' -> ' + to)

    if (APPLY_REDIRECTS && YES) {
      await payload.create({
        collection: 'redirects',
        overrideAccess: true,
        data: { active: true, from, to, type: '301' },
      })
      created += 1
    }
  }

  return { candidates, created, skipped, conflicts, applyRedirects: APPLY_REDIRECTS && YES }
}

async function main() {
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const results: AnyRecord[] = []

  console.log('Silo phase 1-3')
  console.log('Dry run:', !YES)
  console.log('Priorities:', Array.from(priorities).join(', '))
  console.log('Update slugs:', UPDATE_SLUGS)
  console.log('Apply redirects:', APPLY_REDIRECTS && YES)

  if (ONLY === 'all' || ONLY === 'categories' || ONLY === 'products') {
    results.push(await applyCategoryRows(payload, 'categories', (data as AnyRecord).productCategories || []))
  }

  if (ONLY === 'all' || ONLY === 'post-categories' || ONLY === 'blog') {
    results.push(await applyCategoryRows(payload, 'post-categories', (data as AnyRecord).blogCategories || []))
  }

  if (ONLY === 'all' || ONLY === 'redirects') {
    results.push({ redirects: await applyRedirectPreview(payload, (data as AnyRecord).redirects || []) })
  }

  console.log('\nDone.')
  for (const result of results) {
    console.log(JSON.stringify(result, null, 2))
  }

  if (!YES) {
    console.log('\nRun with --yes to write taxonomy/category changes.')
  }

  if (!APPLY_REDIRECTS) {
    console.log('Redirects are preview-only. Use --apply-redirects --yes after GSC review.')
  }
}

main().catch((error) => {
  console.error('Silo phase 1-3 failed:', error)
  process.exit(1)
})
