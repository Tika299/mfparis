import { getPayload } from 'payload'
import path from 'path'
import dotenv from 'dotenv'
import { decodeHtmlEntities, sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type AnyRecord = Record<string, any>
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
    objectFields: ['seo', 'faq', 'authorInfo'],
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

function normalizeText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  return decodeHtmlEntities(value).replace(/\u00a0/g, ' ')
}

function normalizeHtml(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  return sanitizeWordPressHtml(value)
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

function buildRepairData(doc: AnyRecord, config: (typeof collectionConfigs)[number]): AnyRecord {
  const data: AnyRecord = {}

  for (const field of config.htmlFields) {
    if (!hasEntity(doc[field])) {
      continue
    }

    setChangedField(data, field, doc[field], normalizeHtml(doc[field]))
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

async function repairCollection(payload: any, config: (typeof collectionConfigs)[number]) {
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
      const data = buildRepairData(doc, config)
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

async function main() {
  console.log('Bat dau repair HTML entities trong database...')
  console.log('Dry run: ' + (isDryRun ? 'yes' : 'no'))

  if (isDryRun) {
    console.log('Them --yes de ghi thay doi vao database.')
  }

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const selectedConfigs = onlyCollections
    ? collectionConfigs.filter((config) => onlyCollections.has(config.slug))
    : collectionConfigs

  if (!selectedConfigs.length) {
    throw new Error('Khong co collection hop le trong --only.')
  }

  const totals = { scanned: 0, changed: 0, failed: 0 }

  for (const config of selectedConfigs) {
    const result = await repairCollection(payload, config)
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
