import { getPayload } from 'payload'
import path from 'path'
import dotenv from 'dotenv'
import { decodeHtmlEntities, sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type AnyRecord = Record<string, any>
type LegacyRootCollection =
  | 'posts'
  | 'products'
  | 'brands'
  | 'categories'
  | 'post-categories'
type LegacyRootTarget = {
  collection: LegacyRootCollection
  targetUrl: string
}
type RepairContext = {
  legacyRootTargets: Map<string, LegacyRootTarget>
  ambiguousLegacyRootSlugs: Set<string>
}
type CollectionSlug =
  | 'products'
  | 'posts'
  | 'brands'
  | 'categories'
  | 'post-categories'
  | 'attributes'
  | 'attribute-values'
  | 'blog-authors'
  | 'blog-comments'

const projectRoot = process.cwd()
dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run') || !args.includes('--yes')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const onlyArg = args.find((arg) => arg.startsWith('--only='))
const pageSizeArg = args.find((arg) => arg.startsWith('--page-size='))
const maxDocs = limitArg ? Number(limitArg.split('=')[1]) : 0
const pageSize = Math.max(1, Math.min(200, pageSizeArg ? Number(pageSizeArg.split('=')[1]) : 100))
const onlyCollections = onlyArg
  ? new Set(onlyArg.split('=')[1].split(',').map((item) => item.trim()).filter(Boolean))
  : null

const htmlEntityPattern = /(?:&(?:#x?[0-9a-f]+|[a-z][a-z0-9]+);|\$#x?[0-9a-f]+;|\$amp;|\u00a0)/i
const legacyInternalLinkPattern =
  /(?:https?:\/\/(?:www\.)?(?:mfparis\.vn|maraisdefrance\.vn))?\/thuong-hieu\/[^"' <>)]+|(?:https?:\/\/(?:www\.)?(?:mfparis\.vn|maraisdefrance\.vn))?\/shop\/?\?[^"' <>)]*filter_brand=/i
const hrefAttributePattern = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi

const collectionConfigs: Array<{
  slug: CollectionSlug
  label: string
  htmlFields: string[]
  textFields: string[]
  objectFields?: string[]
}> = [
  {
    slug: 'products',
    label: 'san pham',
    htmlFields: ['description', 'shortDescription'],
    textFields: ['title', 'slug', 'sku', 'sourceUrl', 'seoTitle', 'seoDescription'],
    objectFields: ['faq', 'variants', 'attributes'],
  },
  {
    slug: 'posts',
    label: 'bai viet',
    htmlFields: ['content'],
    textFields: ['title', 'slug', 'excerpt', 'sourceUrl'],
    objectFields: ['seo', 'faq', 'author', 'reviewer'],
  },
  {
    slug: 'brands',
    label: 'thuong hieu',
    htmlFields: ['description'],
    textFields: ['name', 'slug', 'sourceUrl'],
    objectFields: ['seo'],
  },
  {
    slug: 'categories',
    label: 'danh muc san pham',
    htmlFields: ['description'],
    textFields: ['name', 'slug', 'sourceUrl'],
    objectFields: ['seo'],
  },
  {
    slug: 'post-categories',
    label: 'danh muc bai viet',
    htmlFields: ['description'],
    textFields: ['name', 'slug', 'sourceUrl'],
    objectFields: ['seo'],
  },
  {
    slug: 'attributes',
    label: 'thuoc tinh',
    htmlFields: ['description'],
    textFields: ['name', 'slug', 'label', 'sourceTaxonomy'],
    objectFields: ['seo'],
  },
  {
    slug: 'attribute-values',
    label: 'gia tri thuoc tinh',
    htmlFields: ['description'],
    textFields: ['name', 'slug', 'label', 'sourceTaxonomy'],
    objectFields: ['seo'],
  },
  {
    slug: 'blog-authors',
    label: 'tac gia blog',
    htmlFields: [],
    textFields: ['name', 'slug', 'title', 'bio', 'url'],
    objectFields: ['sameAs', 'seo'],
  },
  {
    slug: 'blog-comments',
    label: 'binh luan blog',
    htmlFields: [],
    textFields: ['authorName', 'authorEmail', 'content', 'ipAddress', 'userAgent'],
  },
]

function hasEntity(value: unknown): boolean {
  return typeof value === 'string' && htmlEntityPattern.test(value)
}

function hasLegacyInternalLink(value: unknown): boolean {
  return typeof value === 'string' && legacyInternalLinkPattern.test(value)
}

function normalizeSlugForLookup(value: string): string {
  try {
    return decodeURIComponent(value.trim()).toLowerCase()
  } catch {
    return value.trim().toLowerCase()
  }
}

function normalizeLegacyRootUrl(value: string, context: RepairContext): string {
  const raw = String(value || '').trim()

  if (!raw || context.legacyRootTargets.size === 0) {
    return raw
  }

  const hashMatch = raw.match(/#.*$/)
  const hash = hashMatch?.[0] || ''
  const withoutHash = hash ? raw.slice(0, -hash.length) : raw

  try {
    const parsed = new URL(withoutHash, 'https://mfparis.vn')
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const isKnownHost = host === 'mfparis.vn' || host === 'maraisdefrance.vn'

    if (!isKnownHost) {
      return raw
    }

    const segments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)

    if (segments.length !== 1) {
      return raw
    }

    const slug = normalizeSlugForLookup(segments[0])
    const target = context.legacyRootTargets.get(slug)

    if (!target || context.ambiguousLegacyRootSlugs.has(slug)) {
      return raw
    }

    return `${target.targetUrl}${parsed.search}${hash}`
  } catch {
    const pathMatch = withoutHash.match(/^\/([^/?#]+)(\?[^#]*)?$/)

    if (!pathMatch?.[1]) {
      return raw
    }

    const slug = normalizeSlugForLookup(pathMatch[1])
    const target = context.legacyRootTargets.get(slug)

    if (!target || context.ambiguousLegacyRootSlugs.has(slug)) {
      return raw
    }

    return `${target.targetUrl}${pathMatch[2] || ''}${hash}`
  }
}

function repairLegacyRootLinks(value: string, context: RepairContext): string {
  return value.replace(
    hrefAttributePattern,
    (fullMatch, originalValue: string, doubleQuoted: string, singleQuoted: string, unquoted: string) => {
      const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : ''
      const attrValue = doubleQuoted ?? singleQuoted ?? unquoted ?? ''
      const nextValue = normalizeLegacyRootUrl(attrValue, context)

      if (nextValue === attrValue) {
        return fullMatch
      }

      return quote
        ? `href=${quote}${nextValue}${quote}`
        : `href=${nextValue}`
    },
  )
}

function hasLegacyRootLink(value: unknown, context: RepairContext): boolean {
  if (typeof value !== 'string' || context.legacyRootTargets.size === 0) {
    return false
  }

  const repaired = repairLegacyRootLinks(value, context)

  return repaired !== value
}

function needsHtmlRepair(value: unknown, context: RepairContext): boolean {
  return hasEntity(value) || hasLegacyInternalLink(value) || hasLegacyRootLink(value, context)
}

function normalizeText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  return decodeHtmlEntities(value).replace(/\u00a0/g, ' ')
}

function normalizeHtml(value: unknown, context: RepairContext): unknown {
  if (typeof value !== 'string') {
    return value
  }

  return repairLegacyRootLinks(sanitizeWordPressHtml(value), context)
}

function normalizeDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return normalizeText(value)
  }

  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const normalized = normalizeDeep(item)
      changed ||= normalized !== item
      return normalized
    })

    return changed ? next : value
  }

  if (value && typeof value === 'object') {
    let changed = false
    const next: AnyRecord = {}

    for (const [key, nestedValue] of Object.entries(value as AnyRecord)) {
      const normalized = normalizeDeep(nestedValue)
      next[key] = normalized
      changed ||= normalized !== nestedValue
    }

    return changed ? next : value
  }

  return value
}

function setChangedField(data: AnyRecord, field: string, before: unknown, after: unknown): boolean {
  if (after === before) {
    return false
  }

  data[field] = after
  return true
}

function buildRepairData(
  doc: AnyRecord,
  config: (typeof collectionConfigs)[number],
  context: RepairContext,
): AnyRecord {
  const data: AnyRecord = {}

  for (const field of config.htmlFields) {
    if (!needsHtmlRepair(doc[field], context)) {
      continue
    }

    setChangedField(data, field, doc[field], normalizeHtml(doc[field], context))
  }

  for (const field of config.textFields) {
    if (!hasEntity(doc[field])) {
      continue
    }

    setChangedField(data, field, doc[field], normalizeText(doc[field]))
  }

  for (const field of config.objectFields || []) {
    if (!doc[field]) {
      continue
    }

    const serialized = JSON.stringify(doc[field])

    if (!htmlEntityPattern.test(serialized)) {
      continue
    }

    setChangedField(data, field, doc[field], normalizeDeep(doc[field]))
  }

  return data
}

async function repairCollection(
  payload: any,
  config: (typeof collectionConfigs)[number],
  context: RepairContext,
) {
  let page = 1
  let scanned = 0
  let changed = 0
  let failed = 0

  console.log('\nDang quet ' + config.label + ' (' + config.slug + ')...')

  while (true) {
    const result = await payload.find({
      collection: config.slug,
      depth: 0,
      limit: pageSize,
      page,
      overrideAccess: true,
    })

    for (const doc of result.docs as AnyRecord[]) {
      if (maxDocs > 0 && scanned >= maxDocs) {
        return { scanned, changed, failed }
      }

      scanned += 1
      const data = buildRepairData(doc, config, context)
      const fields = Object.keys(data)

      if (!fields.length) {
        continue
      }

      changed += 1
      console.log('   ' + (isDryRun ? '[dry-run] ' : '') + config.slug + ' #' + doc.id + ': ' + fields.join(', '))

      if (!isDryRun) {
        try {
          await payload.update({
            collection: config.slug,
            id: doc.id,
            data,
            depth: 0,
            overrideAccess: true,
          })
        } catch (error) {
          failed += 1
          const message = error instanceof Error ? error.message : String(error)
          console.warn('   Loi cap nhat ' + config.slug + ' #' + doc.id + ': ' + message)
        }
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return { scanned, changed, failed }
}

function targetUrlForLegacyRoot(collection: LegacyRootCollection, slug: string): string {
  const safeSlug = encodeURIComponent(slug)

  if (collection === 'posts') {
    return `/blog/${safeSlug}/`
  }

  if (collection === 'products') {
    return `/products/${safeSlug}/`
  }

  if (collection === 'brands') {
    return `/brands/${safeSlug}/`
  }

  if (collection === 'categories') {
    return `/categories/${safeSlug}/`
  }

  return `/blog/category/${safeSlug}/`
}

function addLegacyRootTarget(
  context: RepairContext,
  collection: LegacyRootCollection,
  slugValue: unknown,
): void {
  if (typeof slugValue !== 'string' || !slugValue.trim()) {
    return
  }

  const slug = normalizeSlugForLookup(slugValue)
  const target: LegacyRootTarget = {
    collection,
    targetUrl: targetUrlForLegacyRoot(collection, slug),
  }
  const existing = context.legacyRootTargets.get(slug)

  if (!existing) {
    context.legacyRootTargets.set(slug, target)
    return
  }

  if (
    existing.collection !== target.collection ||
    existing.targetUrl !== target.targetUrl
  ) {
    context.legacyRootTargets.delete(slug)
    context.ambiguousLegacyRootSlugs.add(slug)
  }
}

async function loadLegacyRootTargets(payload: any): Promise<RepairContext> {
  const context: RepairContext = {
    legacyRootTargets: new Map(),
    ambiguousLegacyRootSlugs: new Set(),
  }
  const collections: LegacyRootCollection[] = [
    'posts',
    'products',
    'brands',
    'categories',
    'post-categories',
  ]

  for (const collection of collections) {
    let page = 1

    while (true) {
      const result = await payload.find({
        collection,
        depth: 0,
        limit: pageSize,
        page,
        overrideAccess: true,
      })

      for (const doc of result.docs as AnyRecord[]) {
        addLegacyRootTarget(context, collection, doc.slug)
      }

      if (!result.hasNextPage) {
        break
      }

      page += 1
    }
  }

  return context
}

async function main() {
  console.log('Bat dau repair HTML entities trong database...')
  console.log('Dry run: ' + (isDryRun ? 'yes' : 'no'))

  if (isDryRun) {
    console.log('Them --yes de ghi thay doi vao database.')
  }

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const context = await loadLegacyRootTargets(payload)

  console.log('Loaded legacy root URL targets: ' + context.legacyRootTargets.size)
  console.log('Ambiguous legacy root slugs skipped: ' + context.ambiguousLegacyRootSlugs.size)

  const selectedConfigs = onlyCollections
    ? collectionConfigs.filter((config) => onlyCollections.has(config.slug))
    : collectionConfigs

  if (!selectedConfigs.length) {
    throw new Error('Khong co collection hop le trong --only.')
  }

  const totals = { scanned: 0, changed: 0, failed: 0 }

  for (const config of selectedConfigs) {
    const result = await repairCollection(payload, config, context)
    totals.scanned += result.scanned
    totals.changed += result.changed
    totals.failed += result.failed
  }

  console.log('\nHoan tat repair HTML entities.')
  console.log('Da quet: ' + totals.scanned)
  console.log((isDryRun ? 'Se cap nhat' : 'Da cap nhat') + ': ' + totals.changed)
  console.log('Loi: ' + totals.failed)

  if (isDryRun) {
    console.log('\nLenh ghi that: npm run repair:html-entities -- --yes')
  }
}

main().catch((error) => {
  console.error('Repair HTML entities that bai:', error)
  process.exit(1)
})
