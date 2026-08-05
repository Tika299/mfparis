import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '@payload-config'

type AnyRecord = Record<string, any>

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  url?: string | null
  thumbnailURL?: string | null
  sourceUrl?: string | null
  sourceFilename?: string | null
  sizes?: Record<string, { filename?: string | null; url?: string | null } | null>
}

type Target = {
  collection: string
  fields: string[]
}

type RepairResult = {
  value: string
  replaced: number
  unmatched: string[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = hasFlag('--dry-run') || !YES
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const ONLY_COLLECTION = getArg('--collection', '')
const ONLY_FIELD = getArg('--field', '')
const REPORT_DIR = path.resolve(projectRoot, getArg('--report-dir', 'src/scripts/reports'))
const DEFAULT_LEGACY_BASE_URL = getArg(
  '--legacy-base-url',
  process.env.WP_BASE_URL || 'https://mfparis.vn',
)

const TARGETS: Target[] = [
  {
    collection: 'posts',
    fields: ['content'],
  },
  {
    collection: 'products',
    fields: ['description', 'shortDescription'],
  },
  {
    collection: 'brands',
    fields: ['description'],
  },
  {
    collection: 'categories',
    fields: ['description'],
  },
  {
    collection: 'post-categories',
    fields: ['description'],
  },
]

const legacyUploadUrlPattern =
  /(?:https?:\/\/[^"'\s<>)]+?\/wp-content\/uploads\/[^"'\s<>)]+|\/wp-content\/uploads\/[^"'\s<>)]+|wp-content\/uploads\/[^"'\s<>)]+)/gi

function decodeUrlPart(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/')
}

function stripHtmlEntities(value: string) {
  return value.replace(/&amp;/g, '&')
}

function stripTrailingUrlPunctuation(value: string) {
  return value.replace(/[),.;]+$/g, '')
}

function cleanMatchedUrl(value: string) {
  return stripTrailingUrlPunctuation(stripHtmlEntities(value.trim()))
}

function getUrl(value: string) {
  try {
    return new URL(stripHtmlEntities(value), DEFAULT_LEGACY_BASE_URL)
  } catch {
    return null
  }
}

function normalizeUrlKey(value: string) {
  const parsed = getUrl(value)

  if (!parsed) {
    return ''
  }

  parsed.hash = ''
  return parsed.toString().toLowerCase()
}

function getUploadPath(value: string) {
  const parsed = getUrl(value)
  const pathname = parsed?.pathname || value
  const decoded = decodeUrlPart(normalizeSlashes(pathname)).toLowerCase()
  const index = decoded.indexOf('/wp-content/uploads/')

  if (index < 0) {
    return ''
  }

  return decoded.slice(index)
}

function basenameFromValue(value: string) {
  const parsed = getUrl(value)
  const pathname = parsed?.pathname || value.split('?')[0] || value
  return decodeUrlPart(path.posix.basename(normalizeSlashes(pathname))).toLowerCase()
}

function getFilenameParts(filename: string) {
  const extension = path.posix.extname(filename)
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

function removeGeneratedSuffixes(filename: string) {
  const { extension, stem } = getFilenameParts(filename)
  return `${removeImportHashSuffix(removeWpImageSizeSuffix(stem)).replace(/-+$/g, '')}${extension}`
}

function addFilenameKeys(keys: Set<string>, value: string) {
  const filename = basenameFromValue(value)

  if (!filename) {
    return
  }

  const decoded = decodeUrlPart(filename)
  const withoutGenerated = removeGeneratedSuffixes(decoded)
  const { stem, extension } = getFilenameParts(decoded)
  const noSizeStem = removeWpImageSizeSuffix(stem)
  const noHashStem = removeImportHashSuffix(noSizeStem)

  for (const candidate of [
    decoded,
    withoutGenerated,
    `${noSizeStem}${extension}`,
    `${noHashStem}${extension}`,
  ]) {
    if (candidate) {
      keys.add(`filename:${candidate.toLowerCase()}`)
    }
  }

  if (/\.jpe?g\.webp$/i.test(decoded)) {
    keys.add(`filename:${decoded.replace(/\.webp$/i, '').toLowerCase()}`)
  }

  if (extension) {
    keys.add(`stem:${noHashStem.toLowerCase()}`)
  }
}

function addUrlKeys(keys: Set<string>, value: unknown) {
  const raw = String(value || '').trim()

  if (!raw) {
    return
  }

  const normalizedUrl = normalizeUrlKey(raw)
  const uploadPath = getUploadPath(raw)

  if (normalizedUrl) {
    keys.add(`url:${normalizedUrl}`)
  }

  if (uploadPath) {
    keys.add(`path:${uploadPath}`)
    keys.add(`path:${removeGeneratedSuffixes(uploadPath)}`)
  }

  addFilenameKeys(keys, raw)
}

function getPayloadMediaUrl(doc: MediaDoc) {
  const filename = String(doc.filename || doc.fileName || '').trim()

  if (doc.url) {
    return doc.url
  }

  if (filename) {
    return `/api/media/file/${encodeURIComponent(filename)}`
  }

  return ''
}

function addIndexValue(index: Map<string, string>, key: string, value: string) {
  if (!key || !value || index.has(key)) {
    return
  }

  index.set(key, value)
}

async function buildMediaIndex(payload: any) {
  const index = new Map<string, string>()
  let page = 1
  let mediaCount = 0

  while (true) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      sort: '-updatedAt',
    })

    const docs = (result.docs || []) as MediaDoc[]

    for (const doc of docs) {
      mediaCount += 1
      const mediaUrl = getPayloadMediaUrl(doc)

      if (!mediaUrl) {
        continue
      }

      const keys = new Set<string>()

      addUrlKeys(keys, doc.url)
      addUrlKeys(keys, doc.thumbnailURL)
      addUrlKeys(keys, doc.sourceUrl)
      addFilenameKeys(keys, String(doc.filename || ''))
      addFilenameKeys(keys, String(doc.fileName || ''))
      addFilenameKeys(keys, String(doc.sourceFilename || ''))

      for (const size of Object.values(doc.sizes || {})) {
        if (!size) {
          continue
        }

        addUrlKeys(keys, size.url)
        addFilenameKeys(keys, String(size.filename || ''))
      }

      for (const key of keys) {
        addIndexValue(index, key, mediaUrl)
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return { index, mediaCount }
}

function getLookupKeysForLegacyUrl(url: string) {
  const keys = new Set<string>()

  addUrlKeys(keys, url)

  const uploadPath = getUploadPath(url)

  if (uploadPath) {
    const cleanPath = removeGeneratedSuffixes(uploadPath)
    keys.add(`path:${uploadPath}`)
    keys.add(`path:${cleanPath}`)
  }

  return Array.from(keys)
}

function findMediaUrlForLegacyUrl(index: Map<string, string>, legacyUrl: string) {
  for (const key of getLookupKeysForLegacyUrl(legacyUrl)) {
    const found = index.get(key)

    if (found) {
      return found
    }
  }

  return ''
}

function repairHtmlUploadUrls(value: unknown, index: Map<string, string>): RepairResult {
  if (typeof value !== 'string' || !/wp-content\/uploads/i.test(value)) {
    return {
      value: typeof value === 'string' ? value : '',
      replaced: 0,
      unmatched: [],
    }
  }

  const unmatched = new Set<string>()
  let replaced = 0
  let next = value.replace(legacyUploadUrlPattern, (rawMatch) => {
    const cleanUrl = cleanMatchedUrl(rawMatch)
    const replacement = findMediaUrlForLegacyUrl(index, cleanUrl)

    if (!replacement) {
      unmatched.add(cleanUrl)
      return rawMatch
    }

    replaced += 1
    return rawMatch.replace(cleanUrl, replacement)
  })

  // Some URLs can appear HTML-encoded in srcset/data attributes. Try once more after normal URL replacement.
  if (/&amp;/i.test(next)) {
    next = next.replace(legacyUploadUrlPattern, (rawMatch) => {
      const cleanUrl = cleanMatchedUrl(rawMatch)
      const replacement = findMediaUrlForLegacyUrl(index, cleanUrl)

      if (!replacement) {
        unmatched.add(cleanUrl)
        return rawMatch
      }

      replaced += 1
      return rawMatch.replace(cleanUrl, replacement)
    })
  }

  return {
    value: next,
    replaced,
    unmatched: Array.from(unmatched),
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

async function writeCsv(filePath: string, rows: unknown[][]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(
    filePath,
    rows.map((row) => row.map(csvEscape).join(',')).join('\n'),
    'utf8',
  )
}

function getDocLabel(doc: AnyRecord) {
  return doc.title || doc.name || doc.slug || `#${doc.id}`
}

async function repairCollection(
  payload: any,
  target: Target,
  index: Map<string, string>,
  repairRows: unknown[][],
  unmatchedRows: unknown[][],
) {
  let page = 1
  let scanned = 0
  let changed = 0
  let replaced = 0
  let unmatched = 0

  while (true) {
    const result = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      sort: 'id',
    })

    const docs = (result.docs || []) as AnyRecord[]

    for (const doc of docs) {
      if (LIMIT && scanned >= LIMIT) {
        return { scanned, changed, replaced, unmatched }
      }

      scanned += 1
      const data: AnyRecord = {}
      let docReplaced = 0
      let docUnmatched = 0

      for (const field of target.fields) {
        const before = doc[field]
        const repair = repairHtmlUploadUrls(before, index)

        if (repair.replaced > 0 && repair.value !== before) {
          data[field] = repair.value
          docReplaced += repair.replaced
        }

        for (const url of repair.unmatched) {
          docUnmatched += 1
          unmatchedRows.push([
            target.collection,
            doc.id,
            doc.slug || '',
            getDocLabel(doc),
            field,
            url,
          ])
        }
      }

      if (Object.keys(data).length === 0) {
        unmatched += docUnmatched
        continue
      }

      changed += 1
      replaced += docReplaced
      unmatched += docUnmatched

      repairRows.push([
        DRY_RUN ? 'would-update' : 'updated',
        target.collection,
        doc.id,
        doc.slug || '',
        getDocLabel(doc),
        Object.keys(data).join('|'),
        docReplaced,
        docUnmatched,
      ])

      console.log(
        `${DRY_RUN ? 'would update' : 'update'} ${target.collection} #${doc.id}: replaced ${docReplaced}, unmatched ${docUnmatched}`,
      )

      if (DRY_RUN) {
        continue
      }

      await payload.update({
        collection: target.collection,
        id: doc.id,
        data,
        overrideAccess: true,
        depth: 0,
      })
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return { scanned, changed, replaced, unmatched }
}

async function main() {
  const payload = await getPayload({ config })
  const targets = TARGETS
    .filter((target) => !ONLY_COLLECTION || target.collection === ONLY_COLLECTION)
    .map((target) => ({
      ...target,
      fields: ONLY_FIELD ? target.fields.filter((field) => field === ONLY_FIELD) : target.fields,
    }))
    .filter((target) => target.fields.length > 0)

  const repairRows: unknown[][] = [
    ['status', 'collection', 'docId', 'slug', 'title', 'fields', 'replaced', 'unmatched'],
  ]
  const unmatchedRows: unknown[][] = [
    ['collection', 'docId', 'slug', 'title', 'field', 'legacyUrl'],
  ]

  console.log('Repair content upload image URLs')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Targets: ${targets.map((target) => `${target.collection}(${target.fields.join('|')})`).join(', ')}`)

  const { index, mediaCount } = await buildMediaIndex(payload)

  console.log(`Media docs indexed: ${mediaCount}`)
  console.log(`Media lookup keys: ${index.size}`)

  const totals = {
    scanned: 0,
    changed: 0,
    replaced: 0,
    unmatched: 0,
  }

  for (const target of targets) {
    const result = await repairCollection(payload, target, index, repairRows, unmatchedRows)

    totals.scanned += result.scanned
    totals.changed += result.changed
    totals.replaced += result.replaced
    totals.unmatched += result.unmatched

    console.log(
      `${target.collection}: scanned ${result.scanned}, changed ${result.changed}, replaced ${result.replaced}, unmatched ${result.unmatched}`,
    )
  }

  const repairReport = path.join(REPORT_DIR, 'content-image-url-repair.csv')
  const unmatchedReport = path.join(REPORT_DIR, 'content-image-url-unmatched.csv')

  await writeCsv(repairReport, repairRows)
  await writeCsv(unmatchedReport, unmatchedRows)

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        mediaCount,
        mediaLookupKeys: index.size,
        ...totals,
        repairReport,
        unmatchedReport,
      },
      null,
      2,
    ),
  )

  if (DRY_RUN) {
    console.log('')
    console.log('Run with --yes to update database.')
  }
}

main().catch((error) => {
  console.error('Repair content upload image URLs failed:', error)
  process.exit(1)
})
