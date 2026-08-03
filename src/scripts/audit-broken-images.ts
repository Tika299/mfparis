import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import configPromise from '@payload-config'
import { getPayload } from 'payload'

type CollectionSlug =
  | 'media'
  | 'products'
  | 'posts'
  | 'brands'
  | 'categories'
  | 'post-categories'
  | 'attributes'
  | 'attribute-values'

type Candidate = {
  url: string
  normalizedUrl: string
  collection: CollectionSlug
  docId: string | number
  docTitle: string
  field: string
}

type AuditResult = Candidate & {
  status: string
  statusCode: number | ''
  reason: string
}

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const CONCURRENCY = Math.max(1, Math.min(20, Number(getArg('--concurrency', '8')) || 8))
const TIMEOUT_MS = Math.max(1000, Number(getArg('--timeout-ms', '12000')) || 12000)
const INCLUDE_OK = hasFlag('--include-ok')
const ONLY = getArg('--only', '')
const OUTPUT_DIR = path.resolve(getArg('--out-dir', 'src/scripts/reports'))
const CSV_OUTPUT = path.resolve(OUTPUT_DIR, getArg('--csv', 'broken-images.csv'))
const TXT_OUTPUT = path.resolve(OUTPUT_DIR, getArg('--txt', 'broken-image-urls.txt'))
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'))
const SITE_URL = (getArg('--site-url', process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '') || '')
  .replace(/\/+$/g, '')
const LEGACY_BASE_URL = (
  getArg('--legacy-base-url', process.env.WP_BASE_URL || 'https://mfparis.vn') || ''
).replace(/\/+$/g, '')

const imageUrlPattern =
  /(?:https?:\/\/|\/)(?:[^"'<>\s),]+)\.(?:jpe?g|png|gif|webp|avif|svg)(?:\?[^"'<>\s),]*)?/gi
const srcsetSplitPattern = /\s*,\s*/
const imageExtensionPattern = /\.(?:jpe?g|png|gif|webp|avif|svg)(?:\?|$)/i

const contentCollections: Array<{
  slug: Exclude<CollectionSlug, 'media'>
  titleFields: string[]
  fields: string[]
}> = [
  {
    slug: 'products',
    titleFields: ['title', 'name', 'slug'],
    fields: ['description', 'shortDescription'],
  },
  {
    slug: 'posts',
    titleFields: ['title', 'slug'],
    fields: ['content'],
  },
  {
    slug: 'brands',
    titleFields: ['name', 'title', 'slug'],
    fields: ['description'],
  },
  {
    slug: 'categories',
    titleFields: ['title', 'name', 'slug'],
    fields: ['description'],
  },
  {
    slug: 'post-categories',
    titleFields: ['title', 'name', 'slug'],
    fields: ['description'],
  },
  {
    slug: 'attributes',
    titleFields: ['name', 'title', 'slug'],
    fields: ['description'],
  },
  {
    slug: 'attribute-values',
    titleFields: ['name', 'title', 'slug'],
    fields: ['description'],
  },
]

function selectedCollection(slug: CollectionSlug) {
  if (!ONLY) return true
  const selected = ONLY.split(',').map((item) => item.trim()).filter(Boolean)
  return selected.includes(slug) || (slug !== 'media' && selected.includes('content'))
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value == null) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function getTitle(doc: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = doc[field]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return `#${String(doc.id || '')}`
}

function normalizeUrl(rawUrl: string) {
  const value = rawUrl.trim().replace(/&amp;/g, '&')

  if (!value || value.startsWith('data:') || value.startsWith('blob:')) {
    return ''
  }

  if (/^\/\//.test(value)) {
    return `https:${value}`
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (value.startsWith('/api/media/file/')) {
    return SITE_URL ? `${SITE_URL}${value}` : value
  }

  if (value.startsWith('/')) {
    return LEGACY_BASE_URL ? `${LEGACY_BASE_URL}${value}` : value
  }

  return value
}

function extractImageUrls(value: unknown) {
  const text = stringifyValue(value)
  const urls = new Set<string>()
  const attrPattern =
    /\b(?:src|data-src|data-lazy-src|data-original|href)\s*=\s*["']([^"']+)["']/gi
  const srcsetPattern = /\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/gi

  for (const match of text.matchAll(attrPattern)) {
    const url = match[1]?.trim()
    if (url && imageExtensionPattern.test(url)) {
      urls.add(url)
    }
  }

  for (const match of text.matchAll(srcsetPattern)) {
    const value = match[1] || ''
    for (const candidate of value.split(srcsetSplitPattern)) {
      const url = candidate.trim().split(/\s+/)[0]
      if (url && imageExtensionPattern.test(url)) {
        urls.add(url)
      }
    }
  }

  for (const match of text.matchAll(imageUrlPattern)) {
    urls.add(match[0])
  }

  return [...urls]
}

function addCandidate(
  candidates: Candidate[],
  seen: Set<string>,
  input: Omit<Candidate, 'normalizedUrl'>,
) {
  const normalizedUrl = normalizeUrl(input.url)

  if (!normalizedUrl) {
    return
  }

  const key = `${input.collection}:${input.docId}:${input.field}:${normalizedUrl}`

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  candidates.push({ ...input, normalizedUrl })
}

function getLocalMediaFilename(url: string) {
  const marker = '/api/media/file/'
  const markerIndex = url.indexOf(marker)

  if (markerIndex < 0) {
    return ''
  }

  const raw = url.slice(markerIndex + marker.length).split(/[?#]/)[0]

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

async function auditLocalMediaUrl(candidate: Candidate): Promise<AuditResult | null> {
  const filename = getLocalMediaFilename(candidate.normalizedUrl)

  if (!filename) {
    return null
  }

  const filePath = path.join(MEDIA_DIR, filename)
  const exists = fs.existsSync(filePath)

  return {
    ...candidate,
    status: exists ? 'ok' : 'broken',
    statusCode: '',
    reason: exists ? 'local file exists' : `local file missing: ${filePath}`,
  }
}

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET') {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; MFParisBrokenImageAudit/1.0; +https://mfparis.vn)',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function auditRemoteUrl(candidate: Candidate): Promise<AuditResult> {
  try {
    let response = await fetchWithTimeout(candidate.normalizedUrl, 'HEAD')

    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(candidate.normalizedUrl, 'GET')
    }

    const ok = response.status >= 200 && response.status < 400

    return {
      ...candidate,
      status: ok ? 'ok' : 'broken',
      statusCode: response.status,
      reason: ok ? 'http ok' : `http ${response.status}`,
    }
  } catch (error: any) {
    return {
      ...candidate,
      status: 'broken',
      statusCode: '',
      reason: error?.name === 'AbortError' ? 'timeout' : error?.message || String(error),
    }
  }
}

async function auditCandidate(candidate: Candidate): Promise<AuditResult> {
  const localResult = await auditLocalMediaUrl(candidate)

  if (localResult) {
    return localResult
  }

  if (!/^https?:\/\//i.test(candidate.normalizedUrl)) {
    return {
      ...candidate,
      status: 'broken',
      statusCode: '',
      reason: 'not an absolute URL and no site URL configured',
    }
  }

  return auditRemoteUrl(candidate)
}

async function runLimited<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const results: R[] = []
  let index = 0

  async function runWorker() {
    while (index < items.length) {
      const currentIndex = index
      index += 1
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, runWorker))

  return results
}

async function collectMediaCandidates(payload: any, candidates: Candidate[], seen: Set<string>) {
  let page = 1
  let scanned = 0

  while (true) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      sort: 'id',
    })

    for (const doc of result.docs || []) {
      scanned += 1
      const docTitle = doc.title || doc.alt || doc.filename || `#${doc.id}`

      for (const field of ['url', 'thumbnailURL', 'sourceUrl'] as const) {
        if (typeof doc[field] === 'string' && doc[field]) {
          addCandidate(candidates, seen, {
            url: doc[field],
            collection: 'media',
            docId: doc.id,
            docTitle,
            field,
          })
        }
      }

      for (const [sizeName, size] of Object.entries(doc.sizes || {})) {
        const sizeUrl = (size as Record<string, unknown> | null)?.url

        if (typeof sizeUrl === 'string' && sizeUrl) {
          addCandidate(candidates, seen, {
            url: sizeUrl,
            collection: 'media',
            docId: doc.id,
            docTitle,
            field: `sizes.${sizeName}.url`,
          })
        }
      }

      if (LIMIT && scanned >= LIMIT) {
        return
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }
}

async function collectContentCandidates(payload: any, candidates: Candidate[], seen: Set<string>) {
  for (const collection of contentCollections) {
    if (!selectedCollection(collection.slug)) {
      continue
    }

    let page = 1
    let scanned = 0

    while (true) {
      const result = await payload.find({
        collection: collection.slug,
        depth: 0,
        limit: PAGE_SIZE,
        page,
        pagination: true,
        overrideAccess: true,
        sort: 'id',
      })

      for (const doc of result.docs || []) {
        scanned += 1
        const docTitle = getTitle(doc, collection.titleFields)

        for (const field of collection.fields) {
          for (const url of extractImageUrls(doc[field])) {
            addCandidate(candidates, seen, {
              url,
              collection: collection.slug,
              docId: doc.id,
              docTitle,
              field,
            })
          }
        }

        if (LIMIT && scanned >= LIMIT) {
          break
        }
      }

      if ((LIMIT && scanned >= LIMIT) || !result.hasNextPage) {
        break
      }

      page += 1
    }
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function writeReports(results: AuditResult[]) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const rows = [
    ['status', 'statusCode', 'reason', 'collection', 'docId', 'docTitle', 'field', 'url', 'normalizedUrl'],
    ...results.map((item) => [
      item.status,
      item.statusCode,
      item.reason,
      item.collection,
      item.docId,
      item.docTitle,
      item.field,
      item.url,
      item.normalizedUrl,
    ]),
  ]

  fs.writeFileSync(CSV_OUTPUT, rows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'utf8')

  const brokenUrls = [...new Set(results.filter((item) => item.status === 'broken').map((item) => item.normalizedUrl))]

  fs.writeFileSync(TXT_OUTPUT, brokenUrls.join('\n'), 'utf8')
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const candidates: Candidate[] = []
  const seen = new Set<string>()

  console.log('Audit broken images')
  console.log(`Only: ${ONLY || 'all'}`)
  console.log(`Media dir: ${MEDIA_DIR}`)
  console.log(`Site URL: ${SITE_URL || '(not set)'}`)
  console.log(`Legacy base URL: ${LEGACY_BASE_URL || '(not set)'}`)

  if (selectedCollection('media')) {
    await collectMediaCandidates(payload, candidates, seen)
  }

  await collectContentCandidates(payload, candidates, seen)

  console.log(`Candidates: ${candidates.length}`)

  const allResults = await runLimited(candidates, auditCandidate)
  const results = INCLUDE_OK ? allResults : allResults.filter((item) => item.status === 'broken')
  const broken = allResults.filter((item) => item.status === 'broken')

  writeReports(results)

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        checked: allResults.length,
        broken: broken.length,
        ok: allResults.length - broken.length,
        csv: CSV_OUTPUT,
        txt: TXT_OUTPUT,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('Audit broken images failed:', error)
  process.exit(1)
})
