import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import configPromise from '@payload-config'
import { getPayload } from 'payload'

type LocalMediaSource = {
  filePath: string
  filename: string
}

type MediaRef = {
  id: string | number
  filename?: string | null
}

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = hasFlag('--dry-run') || !YES
const INPUT_FILE = path.resolve(
  getArg('--input', 'src/scripts/reports/broken-image-urls-not-in-media.txt'),
)
const LOCAL_MEDIA_DIR = path.resolve(
  getArg(
    '--local-media-dir',
    process.env.WP_IMPORT_LOCAL_MEDIA_DIR || path.resolve('src/scripts/export/media'),
  ),
)
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const NOT_FOUND_OUTPUT = path.resolve(REPORT_DIR, 'missing-media-local-not-found.txt')
const CREATED_OUTPUT = path.resolve(REPORT_DIR, 'missing-media-created.csv')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function basenameFromUrl(url: string) {
  try {
    const parsed = new URL(url, 'https://mfparis.vn')
    return safeDecode(path.basename(parsed.pathname))
  } catch {
    return safeDecode(path.basename(url.split(/[?#]/)[0].replace(/\\/g, '/')))
  }
}

function getFilenameParts(filename: string) {
  const extension = path.extname(filename)
  const stem = extension ? filename.slice(0, -extension.length) : filename
  return { extension, stem }
}

function removeImageSizeSuffix(stem: string) {
  return stem.replace(/-\d+x\d+$/i, '')
}

function removeImportHashSuffix(stem: string) {
  return stem.replace(/-([a-z0-9]{5,10})$/i, (match, suffix) => {
    return /[a-z]/i.test(suffix) && /\d/.test(suffix) ? '' : match
  })
}

function normalizeStem(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function addLookupKeys(map: Map<string, LocalMediaSource>, filename: string, source: LocalMediaSource) {
  const basename = path.basename(filename.replace(/\\/g, '/'))
  const lowerBasename = basename.toLowerCase()
  const { extension, stem } = getFilenameParts(lowerBasename)
  const normalizedStem = normalizeStem(stem)
  const nestedExtensionStem = normalizedStem.replace(/\.(jpe?g|png|gif|webp|avif|svg)$/i, '')
  const stemVariants = new Set<string>()

  for (const item of [stem, normalizedStem, nestedExtensionStem]) {
    if (!item) continue
    stemVariants.add(item)
    stemVariants.add(removeImageSizeSuffix(item))
    stemVariants.add(removeImportHashSuffix(item))
    stemVariants.add(removeImportHashSuffix(removeImageSizeSuffix(item)))
  }

  map.set(lowerBasename, source)
  map.set(`${removeImageSizeSuffix(stem)}${extension}`.toLowerCase(), source)
  map.set(`${removeImportHashSuffix(stem)}${extension}`.toLowerCase(), source)

  for (const variant of stemVariants) {
    const cleanVariant = variant.replace(/-+$/g, '')
    if (!cleanVariant) continue

    if (extension) {
      map.set(`${cleanVariant}${extension}`.toLowerCase(), source)
    }

    for (const nextExtension of imageExtensions) {
      map.set(`${cleanVariant}${nextExtension}`.toLowerCase(), source)
    }
  }
}

function buildLocalMediaIndex() {
  const map = new Map<string, LocalMediaSource>()

  if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
    return map
  }

  const stack = [LOCAL_MEDIA_DIR]

  while (stack.length) {
    const currentDir = stack.pop()
    if (!currentDir) continue

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        stack.push(entryPath)
        continue
      }

      if (!entry.isFile()) continue

      const extension = path.extname(entry.name).toLowerCase()
      if (!imageExtensions.includes(extension)) continue

      addLookupKeys(map, entry.name, {
        filePath: entryPath,
        filename: entry.name,
      })
    }
  }

  return map
}

function findLocalMedia(url: string, localIndex: Map<string, LocalMediaSource>) {
  const basename = basenameFromUrl(url)
  const { extension, stem } = getFilenameParts(basename.toLowerCase())
  const candidates = new Set<string>([
    basename.toLowerCase(),
    `${removeImageSizeSuffix(stem)}${extension}`.toLowerCase(),
    `${removeImportHashSuffix(stem)}${extension}`.toLowerCase(),
    `${removeImportHashSuffix(removeImageSizeSuffix(stem))}${extension}`.toLowerCase(),
  ])

  for (const candidate of candidates) {
    const source = localIndex.get(candidate)
    if (source) return source
  }

  return null
}

function getMimeType(filename: string) {
  const extension = path.extname(filename).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.avif') return 'image/avif'
  if (extension === '.svg') return 'image/svg+xml'
  return 'image/jpeg'
}

function titleFromFilename(filename: string) {
  const stem = getFilenameParts(filename).stem
  return stem.replace(/-/g, ' ').replace(/\s+/g, ' ').trim() || filename
}

function readUrlList() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`)
  }

  return [
    ...new Set(
      fs
        .readFileSync(INPUT_FILE, 'utf8')
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ]
}

async function findExistingMedia(payload: any, url: string, sourceFilename: string) {
  const checks = [
    { sourceUrl: { equals: url } },
    { sourceFilename: { equals: sourceFilename } },
    { filename: { equals: sourceFilename } },
  ]

  for (const where of checks) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where,
    })

    const doc = result.docs?.[0] as MediaRef | undefined
    if (doc?.id) return doc
  }

  return null
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const urls = readUrlList()
  const localIndex = buildLocalMediaIndex()
  const notFound: string[] = []
  const createdRows: Array<Array<string | number>> = [
    ['status', 'mediaId', 'sourceUrl', 'localFile', 'payloadFilename'],
  ]

  let scanned = 0
  let foundLocal = 0
  let existing = 0
  let created = 0
  let failed = 0

  console.log('Import missing media from URL list')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Input: ${INPUT_FILE}`)
  console.log(`Local media dir: ${LOCAL_MEDIA_DIR}`)
  console.log(`Local media index keys: ${localIndex.size}`)

  for (const url of urls) {
    if (LIMIT && scanned >= LIMIT) break

    scanned += 1
    const sourceFilename = basenameFromUrl(url)
    const localSource = findLocalMedia(url, localIndex)

    if (!localSource) {
      notFound.push(url)
      continue
    }

    foundLocal += 1
    const existingMedia = await findExistingMedia(payload, url, sourceFilename)

    if (existingMedia?.id) {
      existing += 1
      createdRows.push(['existing', existingMedia.id, url, localSource.filePath, existingMedia.filename || ''])
      continue
    }

    if (DRY_RUN) {
      createdRows.push(['would-create', '', url, localSource.filePath, localSource.filename])
      continue
    }

    try {
      const buffer = fs.readFileSync(localSource.filePath)
      const media = await payload.create({
        collection: 'media',
        overrideAccess: true,
        data: {
          alt: titleFromFilename(localSource.filename),
          title: titleFromFilename(localSource.filename),
          sourceUrl: url,
          sourceFilename,
          importedFrom: 'wordpress',
        },
        file: {
          data: buffer,
          name: localSource.filename,
          mimetype: getMimeType(localSource.filename),
          size: buffer.length,
        },
      })

      created += 1
      createdRows.push(['created', media.id, url, localSource.filePath, media.filename || localSource.filename])
      console.log(`created media #${media.id}: ${url}`)
    } catch (error: any) {
      failed += 1
      createdRows.push(['failed', '', url, localSource.filePath, error?.message || String(error)])
      console.warn(`failed ${url}: ${error?.message || error}`)
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(NOT_FOUND_OUTPUT, notFound.join('\n'), 'utf8')
  fs.writeFileSync(CREATED_OUTPUT, createdRows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'utf8')

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        scanned,
        foundLocal,
        notFoundLocal: notFound.length,
        existing,
        created,
        wouldCreate: DRY_RUN ? foundLocal - existing : 0,
        failed,
        notFoundOutput: NOT_FOUND_OUTPUT,
        createdOutput: CREATED_OUTPUT,
      },
      null,
      2,
    ),
  )

  if (DRY_RUN) {
    console.log('')
    console.log('Run with --yes to create media.')
  }
}

main().catch((error) => {
  console.error('Import missing media failed:', error)
  process.exit(1)
})
