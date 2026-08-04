import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'
import config from '@payload-config'

type AnyRecord = Record<string, any>

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  url?: string | null
  thumbnailURL?: string | null
  title?: string | null
  alt?: string | null
  sourceUrl?: string | null
  sourceFilename?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { filename?: string | null; url?: string | null } | null>
}

type DuplicateCandidate = {
  bad: MediaDoc
  good: MediaDoc
  targetFilename: string
  reason: string
  allowed: boolean
}

type ReplaceResult = {
  value: unknown
  changed: boolean
  refs: number
  urlRefs: number
}

const projectRoot = process.cwd()

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(name + '='))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = hasFlag('--dry-run') || !YES
const TRUST_NAME = hasFlag('--trust-name')
const NO_DELETE = hasFlag('--no-delete')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const REPORT_DIR = path.resolve(projectRoot, getArg('--report-dir', 'src/scripts/reports'))

const imageExtensionPattern = /\.(jpe?g|png|gif|webp|avif|svg)$/i
const mediaFieldNames = new Set([
  'image',
  'images',
  'thumbnail',
  'logo',
  'avatar',
  'icon',
  'productImage',
  'featuredImage',
  'coverImage',
  'heroImage',
  'imageDesktop',
  'imageTablet',
  'imageMobile',
  'bankQrImage',
  'ogImage',
  'schemaImage',
  'seoImage',
  'openGraphImage',
  'twitterImage',
])

const collectionsToScan = [
  'products',
  'posts',
  'brands',
  'categories',
  'post-categories',
  'attribute-values',
  'blog-authors',
  'fragrance-notes',
]

const globalsToScan = [
  'site-settings',
  'about-page',
]

function getFilenameParts(filename: string) {
  const extension = path.extname(filename)
  const stem = extension ? filename.slice(0, -extension.length) : filename
  return { extension, stem }
}

function removeWpImageSizeSuffix(stem: string) {
  return stem.replace(/-\d+x\d+$/i, '')
}

function removeImportHashSuffix(stem: string) {
  return stem.replace(/-([a-z0-9]{5,10})$/i, (match, suffix) => {
    return /[a-z]/i.test(suffix) && /\d/.test(suffix) ? '' : match
  })
}

function cleanMediaFilename(filename: string) {
  const raw = String(filename || '').trim()

  if (!raw || !imageExtensionPattern.test(raw)) {
    return ''
  }

  const basename = path.basename(raw.replace(/\\/g, '/'))
  const { extension, stem } = getFilenameParts(basename)
  const cleanedStem = removeImportHashSuffix(removeWpImageSizeSuffix(stem)).replace(/-+$/g, '')

  if (!cleanedStem || cleanedStem === stem) {
    return ''
  }

  return cleanedStem + extension.toLowerCase()
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function idsEqual(a: unknown, b: unknown) {
  return String(a) === String(b)
}

function getMediaUrl(doc: MediaDoc) {
  const filename = String(doc.filename || doc.fileName || '').trim()
  return doc.url || (filename ? '/api/media/file/' + encodeURIComponent(filename) : '')
}

function addUrlVariants(urls: Set<string>, value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return

  urls.add(raw)

  try {
    urls.add(decodeURI(raw))
  } catch {
    // ignore invalid URI input
  }

  try {
    urls.add(encodeURI(raw))
  } catch {
    // ignore invalid URI input
  }
}

function getMediaUrlVariants(doc: MediaDoc) {
  const urls = new Set<string>()
  const filename = String(doc.filename || doc.fileName || '').trim()

  addUrlVariants(urls, doc.url)
  addUrlVariants(urls, doc.thumbnailURL)

  if (filename) {
    addUrlVariants(urls, '/api/media/file/' + filename)
    addUrlVariants(urls, '/api/media/file/' + encodeURIComponent(filename))
  }

  for (const size of Object.values(doc.sizes || {})) {
    if (!size) continue
    addUrlVariants(urls, size.url)

    if (size.filename) {
      addUrlVariants(urls, '/api/media/file/' + size.filename)
      addUrlVariants(urls, '/api/media/file/' + encodeURIComponent(size.filename))
    }
  }

  return Array.from(urls).filter(Boolean)
}

function getDuplicateReason(bad: MediaDoc, good: MediaDoc) {
  const badSourceUrl = String(bad.sourceUrl || '').trim()
  const goodSourceUrl = String(good.sourceUrl || '').trim()

  if (badSourceUrl && goodSourceUrl && badSourceUrl === goodSourceUrl) {
    return 'same sourceUrl'
  }

  const badSourceFilename = normalizeText(bad.sourceFilename)
  const goodSourceFilename = normalizeText(good.sourceFilename)

  if (badSourceFilename && goodSourceFilename && badSourceFilename === goodSourceFilename) {
    return 'same sourceFilename'
  }

  if (
    Number(bad.filesize || 0) > 0 &&
    Number(bad.filesize) === Number(good.filesize) &&
    Number(bad.width || 0) === Number(good.width || 0) &&
    Number(bad.height || 0) === Number(good.height || 0)
  ) {
    return 'same filesize and dimensions'
  }

  const badAlt = normalizeText(bad.alt || bad.title)
  const goodAlt = normalizeText(good.alt || good.title)

  if (badAlt && goodAlt && badAlt === goodAlt) {
    return 'same alt/title'
  }

  return TRUST_NAME ? 'trusted filename match' : ''
}

function replaceUrlsInString(value: string, badUrls: string[], goodUrl: string): ReplaceResult {
  let next = value
  let urlRefs = 0

  for (const badUrl of badUrls) {
    if (!badUrl || badUrl === goodUrl || !next.includes(badUrl)) {
      continue
    }

    const before = next
    next = next.split(badUrl).join(goodUrl)
    if (next !== before) {
      urlRefs += before.split(badUrl).length - 1
    }
  }

  return {
    value: next,
    changed: next !== value,
    refs: 0,
    urlRefs,
  }
}

function replaceMediaFieldValue(value: unknown, badId: string | number, goodId: string | number): ReplaceResult {
  if (Array.isArray(value)) {
    let changed = false
    let refs = 0
    const next = value.map((item) => {
      const result = replaceMediaFieldValue(item, badId, goodId)
      changed = changed || result.changed
      refs += result.refs
      return result.value
    })

    return { value: next, changed, refs, urlRefs: 0 }
  }

  if (idsEqual(value, badId)) {
    return { value: goodId, changed: true, refs: 1, urlRefs: 0 }
  }

  if (value && typeof value === 'object') {
    const record = value as AnyRecord

    if (record.relationTo === 'media' && idsEqual(record.value, badId)) {
      return {
        value: { ...record, value: goodId },
        changed: true,
        refs: 1,
        urlRefs: 0,
      }
    }

    if (idsEqual(record.id, badId)) {
      return { value: goodId, changed: true, refs: 1, urlRefs: 0 }
    }
  }

  return { value, changed: false, refs: 0, urlRefs: 0 }
}

function replaceMediaDeep(
  value: unknown,
  bad: MediaDoc,
  good: MediaDoc,
  badUrls: string[],
  goodUrl: string,
  keyName = '',
): ReplaceResult {
  if (typeof value === 'string') {
    return replaceUrlsInString(value, badUrls, goodUrl)
  }

  if (Array.isArray(value)) {
    let changed = false
    let refs = 0
    let urlRefs = 0

    const next = value.map((item) => {
      const result = replaceMediaDeep(item, bad, good, badUrls, goodUrl, keyName)
      changed = changed || result.changed
      refs += result.refs
      urlRefs += result.urlRefs
      return result.value
    })

    return { value: next, changed, refs, urlRefs }
  }

  if (!value || typeof value !== 'object') {
    return { value, changed: false, refs: 0, urlRefs: 0 }
  }

  const record = value as AnyRecord
  const next: AnyRecord = { ...record }
  let changed = false
  let refs = 0
  let urlRefs = 0

  for (const [key, child] of Object.entries(record)) {
    const result = mediaFieldNames.has(key)
      ? replaceMediaFieldValue(child, bad.id, good.id)
      : replaceMediaDeep(child, bad, good, badUrls, goodUrl, key)

    if (result.changed) {
      next[key] = result.value
      changed = true
      refs += result.refs
      urlRefs += result.urlRefs
    }
  }

  return { value: next, changed, refs, urlRefs }
}

function sanitizeForUpdate(doc: AnyRecord) {
  const data = { ...doc }
  delete data.id
  delete data.createdAt
  delete data.updatedAt
  delete data.sizes
  delete data.url
  delete data.thumbnailURL
  delete data.filename
  delete data.mimeType
  delete data.filesize
  delete data.width
  delete data.height
  delete data.focalX
  delete data.focalY
  return data
}

async function findAllMedia(payload: any) {
  const media: MediaDoc[] = []
  let page = 1

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

    media.push(...((result.docs || []) as MediaDoc[]))

    if (!result.hasNextPage) break
    page += 1
  }

  return media
}

function buildDuplicateCandidates(media: MediaDoc[]) {
  const byFilename = new Map<string, MediaDoc>()

  for (const doc of media) {
    const filename = String(doc.filename || doc.fileName || '').trim().toLowerCase()
    if (filename && !byFilename.has(filename)) {
      byFilename.set(filename, doc)
    }
  }

  const candidates: DuplicateCandidate[] = []

  for (const bad of media) {
    const badFilename = String(bad.filename || bad.fileName || '').trim()
    const targetFilename = cleanMediaFilename(badFilename)

    if (!targetFilename || targetFilename === badFilename) {
      continue
    }

    const good = byFilename.get(targetFilename.toLowerCase())

    if (!good || idsEqual(good.id, bad.id)) {
      continue
    }

    const reason = getDuplicateReason(bad, good)

    candidates.push({
      bad,
      good,
      targetFilename,
      reason: reason || 'needs manual check',
      allowed: Boolean(reason),
    })
  }

  return candidates
}

async function scanAndUpdateCollection(
  payload: any,
  candidate: DuplicateCandidate,
  rows: string[][],
  collectionSlug: string,
) {
  let page = 1
  let updatedDocs = 0
  let refs = 0
  let urlRefs = 0
  const badUrls = getMediaUrlVariants(candidate.bad)
  const goodUrl = getMediaUrl(candidate.good)

  while (true) {
    const result = await payload.find({
      collection: collectionSlug,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      sort: 'id',
    })

    const docs = (result.docs || []) as AnyRecord[]

    for (const doc of docs) {
      const replaceResult = replaceMediaDeep(doc, candidate.bad, candidate.good, badUrls, goodUrl)

      if (!replaceResult.changed) {
        continue
      }

      updatedDocs += 1
      refs += replaceResult.refs
      urlRefs += replaceResult.urlRefs
      rows.push([
        DRY_RUN ? 'would-update' : 'updated',
        collectionSlug,
        String(doc.id),
        String(candidate.bad.id),
        String(candidate.good.id),
        String(replaceResult.refs),
        String(replaceResult.urlRefs),
      ])

      if (!DRY_RUN) {
        await payload.update({
          collection: collectionSlug,
          id: doc.id,
          data: sanitizeForUpdate(replaceResult.value as AnyRecord),
          overrideAccess: true,
          depth: 0,
        })
      }
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return { updatedDocs, refs, urlRefs }
}

async function scanAndUpdateGlobal(payload: any, candidate: DuplicateCandidate, globalSlug: string, rows: string[][]) {
  const badUrls = getMediaUrlVariants(candidate.bad)
  const goodUrl = getMediaUrl(candidate.good)

  try {
    const doc = await payload.findGlobal({
      slug: globalSlug,
      depth: 0,
      overrideAccess: true,
    })

    const replaceResult = replaceMediaDeep(doc, candidate.bad, candidate.good, badUrls, goodUrl)

    if (!replaceResult.changed) {
      return { updatedDocs: 0, refs: 0, urlRefs: 0 }
    }

    rows.push([
      DRY_RUN ? 'would-update' : 'updated',
      'global:' + globalSlug,
      '',
      String(candidate.bad.id),
      String(candidate.good.id),
      String(replaceResult.refs),
      String(replaceResult.urlRefs),
    ])

    if (!DRY_RUN) {
      await payload.updateGlobal({
        slug: globalSlug,
        data: sanitizeForUpdate(replaceResult.value as AnyRecord),
        overrideAccess: true,
        depth: 0,
      })
    }

    return {
      updatedDocs: 1,
      refs: replaceResult.refs,
      urlRefs: replaceResult.urlRefs,
    }
  } catch (error: any) {
    rows.push([
      'global-scan-failed',
      'global:' + globalSlug,
      '',
      String(candidate.bad.id),
      String(candidate.good.id),
      '0',
      '0',
      error?.message || String(error),
    ])
    return { updatedDocs: 0, refs: 0, urlRefs: 0 }
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"'
  }
  return text
}

async function writeCsv(filePath: string, rows: string[][]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, rows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'utf8')
}

async function main() {
  const payload = await getPayload({ config })
  const reportRows = [
    ['status', 'badId', 'badFilename', 'goodId', 'goodFilename', 'reason', 'docsUpdated', 'idRefs', 'urlRefs', 'message'],
  ]
  const usageRows = [
    ['status', 'collection', 'docId', 'badId', 'goodId', 'idRefs', 'urlRefs', 'message'],
  ]

  let scanned = 0
  let allowed = 0
  let skippedUnsafe = 0
  let deleted = 0
  let deleteFailed = 0
  let docsUpdated = 0
  let idRefs = 0
  let urlRefs = 0

  console.log('Repair duplicate media')
  console.log('Dry run: ' + (DRY_RUN ? 'yes' : 'no'))
  console.log('Trust filename match: ' + (TRUST_NAME ? 'yes' : 'no'))
  console.log('Delete duplicates: ' + (!NO_DELETE ? 'yes' : 'no'))

  const media = await findAllMedia(payload)
  const candidates = buildDuplicateCandidates(media)

  console.log('Media docs: ' + media.length)
  console.log('Duplicate candidates: ' + candidates.length)

  for (const candidate of candidates) {
    if (LIMIT && scanned >= LIMIT) {
      break
    }

    scanned += 1

    const badFilename = String(candidate.bad.filename || candidate.bad.fileName || '')
    const goodFilename = String(candidate.good.filename || candidate.good.fileName || '')

    if (!candidate.allowed) {
      skippedUnsafe += 1
      reportRows.push([
        'skip-unsafe',
        String(candidate.bad.id),
        badFilename,
        String(candidate.good.id),
        goodFilename,
        candidate.reason,
        '0',
        '0',
        '0',
        'Run with --trust-name only if you already verified these are duplicate images.',
      ])
      continue
    }

    allowed += 1
    let candidateDocsUpdated = 0
    let candidateIdRefs = 0
    let candidateUrlRefs = 0

    for (const collection of collectionsToScan) {
      const result = await scanAndUpdateCollection(payload, candidate, usageRows, collection)
      candidateDocsUpdated += result.updatedDocs
      candidateIdRefs += result.refs
      candidateUrlRefs += result.urlRefs
    }

    for (const globalSlug of globalsToScan) {
      const result = await scanAndUpdateGlobal(payload, candidate, globalSlug, usageRows)
      candidateDocsUpdated += result.updatedDocs
      candidateIdRefs += result.refs
      candidateUrlRefs += result.urlRefs
    }

    docsUpdated += candidateDocsUpdated
    idRefs += candidateIdRefs
    urlRefs += candidateUrlRefs

    let status = DRY_RUN ? 'would-delete' : 'deleted'
    let message = ''

    if (NO_DELETE) {
      status = DRY_RUN ? 'would-keep-after-update' : 'kept-after-update'
      message = '--no-delete'
    } else if (!DRY_RUN) {
      try {
        await payload.delete({
          collection: 'media',
          id: candidate.bad.id,
          overrideAccess: true,
        })
        deleted += 1
      } catch (error: any) {
        status = 'delete-failed'
        deleteFailed += 1
        message = error?.message || String(error)
      }
    }

    reportRows.push([
      status,
      String(candidate.bad.id),
      badFilename,
      String(candidate.good.id),
      goodFilename,
      candidate.reason,
      String(candidateDocsUpdated),
      String(candidateIdRefs),
      String(candidateUrlRefs),
      message,
    ])

    console.log(
      status +
        ' #' +
        candidate.bad.id +
        ': ' +
        badFilename +
        ' -> #' +
        candidate.good.id +
        ' ' +
        goodFilename +
        ' refs=' +
        candidateIdRefs +
        ' urls=' +
        candidateUrlRefs,
    )
  }

  const reportPath = path.join(REPORT_DIR, 'media-duplicates-report.csv')
  const usagePath = path.join(REPORT_DIR, 'media-duplicates-usage.csv')

  await writeCsv(reportPath, reportRows)
  await writeCsv(usagePath, usageRows)

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        mediaDocs: media.length,
        duplicateCandidates: candidates.length,
        scanned,
        allowed,
        skippedUnsafe,
        docsUpdated,
        idRefs,
        urlRefs,
        deleted,
        deleteFailed,
        report: reportPath,
        usageReport: usagePath,
      },
      null,
      2,
    ),
  )

  if (DRY_RUN) {
    console.log('')
    console.log('Run with --yes to update references and delete duplicate media.')
    console.log('If many items are skipped as unsafe but you already verified they are duplicates, add --trust-name.')
  }
}

main().catch((error) => {
  console.error('Repair duplicate media failed:', error)
  process.exit(1)
})
