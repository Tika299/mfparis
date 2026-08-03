import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import configPromise from '@payload-config'
import { getPayload } from 'payload'

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  thumbnailURL?: string | null
  url?: string | null
  sourceUrl?: string | null
  sourceFilename?: string | null
  sizes?: Record<string, { filename?: string | null; url?: string | null } | null>
}

const args = process.argv.slice(2)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const INPUT_TXT = path.resolve(REPORT_DIR, getArg('--input', 'broken-image-urls.txt'))
const INPUT_CSV = path.resolve(REPORT_DIR, getArg('--csv-input', 'broken-images.csv'))
const OUTPUT_TXT = path.resolve(REPORT_DIR, getArg('--out', 'broken-image-urls-not-in-media.txt'))
const OUTPUT_CSV = path.resolve(REPORT_DIR, getArg('--csv-out', 'broken-images-not-in-media.csv'))
const OUTPUT_MATCHED_TXT = path.resolve(
  REPORT_DIR,
  getArg('--matched-out', 'broken-image-urls-already-in-media.txt'),
)

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function cleanText(value: unknown) {
  return String(value || '').trim()
}

function normalizeUrl(value: string) {
  return cleanText(value)
    .replace(/&amp;/g, '&')
    .replace(/^https?:\/\/www\./i, 'https://')
    .replace(/^http:\/\//i, 'https://')
    .replace(/\/+$/g, '')
    .toLowerCase()
}

function basenameFromValue(value: string) {
  const raw = cleanText(value).replace(/&amp;/g, '&')

  if (!raw) {
    return ''
  }

  try {
    const parsed = new URL(raw, 'https://mfparis.vn')
    return safeDecode(path.basename(parsed.pathname))
  } catch {
    return safeDecode(path.basename(raw.split(/[?#]/)[0].replace(/\\/g, '/')))
  }
}

function removeImageSizeSuffix(stem: string) {
  return stem.replace(/-\d+x\d+$/i, '')
}

function removeImportHashSuffix(stem: string) {
  return stem.replace(/-([a-z0-9]{5,10})$/i, (match, suffix) => {
    return /[a-z]/i.test(suffix) && /\d/.test(suffix) ? '' : match
  })
}

function removeTrailingNumberSuffix(stem: string) {
  return stem.replace(/-\d+$/i, '')
}

function normalizeStem(stem: string) {
  return stem
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function addStemVariants(keys: Set<string>, stem: string) {
  const stems = new Set<string>()
  const cleanStem = normalizeStem(stem)
  const nestedExtensionStem = cleanStem.replace(/\.(jpe?g|png|gif|webp|avif|svg)$/i, '')

  for (const item of [cleanStem, nestedExtensionStem]) {
    if (!item) continue

    stems.add(item)
    stems.add(removeImageSizeSuffix(item))
    stems.add(removeImportHashSuffix(item))
    stems.add(removeTrailingNumberSuffix(item))
    stems.add(removeImportHashSuffix(removeImageSizeSuffix(item)))
    stems.add(removeTrailingNumberSuffix(removeImportHashSuffix(removeImageSizeSuffix(item))))
  }

  for (const item of stems) {
    if (item) keys.add(`stem:${item}`)
  }
}

function getComparableKeys(value: string) {
  const keys = new Set<string>()
  const normalized = normalizeUrl(value)

  if (normalized) {
    keys.add(`url:${normalized}`)
  }

  const basename = basenameFromValue(value)

  if (!basename) {
    return keys
  }

  const lowerBasename = basename.toLowerCase()
  const extension = path.extname(lowerBasename)
  const stem = extension ? lowerBasename.slice(0, -extension.length) : lowerBasename

  keys.add(`filename:${lowerBasename}`)
  keys.add(`filename:${removeImageSizeSuffix(lowerBasename)}`)
  keys.add(`filename:${removeImportHashSuffix(lowerBasename)}`)
  addStemVariants(keys, stem)

  return keys
}

function addValueToIndex(index: Set<string>, value: unknown) {
  const text = cleanText(value)

  if (!text) {
    return
  }

  for (const key of getComparableKeys(text)) {
    index.add(key)
  }
}

async function buildMediaIndex(payload: any) {
  const index = new Set<string>()
  let page = 1
  let totalDocs = 0

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

    for (const doc of (result.docs || []) as MediaDoc[]) {
      totalDocs += 1

      addValueToIndex(index, doc.filename)
      addValueToIndex(index, doc.fileName)
      addValueToIndex(index, doc.url)
      addValueToIndex(index, doc.thumbnailURL)
      addValueToIndex(index, doc.sourceUrl)
      addValueToIndex(index, doc.sourceFilename)

      for (const size of Object.values(doc.sizes || {})) {
        addValueToIndex(index, size?.filename)
        addValueToIndex(index, size?.url)
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return { index, totalDocs }
}

function readUrlList(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`)
  }

  return [
    ...new Set(
      fs
        .readFileSync(filePath, 'utf8')
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ]
}

function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
      continue
    }

    cell += char
  }

  cells.push(cell)
  return cells
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function isUrlInMedia(url: string, mediaIndex: Set<string>) {
  for (const key of getComparableKeys(url)) {
    if (mediaIndex.has(key)) {
      return true
    }
  }

  return false
}

function writeFilteredCsv(mediaIndex: Set<string>) {
  if (!fs.existsSync(INPUT_CSV)) {
    return { written: false, keptRows: 0, matchedRows: 0 }
  }

  const lines = fs.readFileSync(INPUT_CSV, 'utf8').split(/\r?\n/g).filter(Boolean)
  const header = parseCsvLine(lines[0] || '')
  const normalizedUrlIndex = header.indexOf('normalizedUrl')
  const urlIndex = header.indexOf('url')
  const keptRows = [header]
  let matchedRows = 0

  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line)
    const url = row[normalizedUrlIndex] || row[urlIndex] || ''

    if (url && isUrlInMedia(url, mediaIndex)) {
      matchedRows += 1
      continue
    }

    keptRows.push(row)
  }

  fs.writeFileSync(OUTPUT_CSV, keptRows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'utf8')

  return { written: true, keptRows: keptRows.length - 1, matchedRows }
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const urls = readUrlList(INPUT_TXT)
  const { index: mediaIndex, totalDocs } = await buildMediaIndex(payload)
  const missingUrls: string[] = []
  const matchedUrls: string[] = []

  for (const url of urls) {
    if (isUrlInMedia(url, mediaIndex)) {
      matchedUrls.push(url)
    } else {
      missingUrls.push(url)
    }
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_TXT, missingUrls.join('\n'), 'utf8')
  fs.writeFileSync(OUTPUT_MATCHED_TXT, matchedUrls.join('\n'), 'utf8')
  const csvResult = writeFilteredCsv(mediaIndex)

  console.log('Filter broken images not in Payload media')
  console.log(
    JSON.stringify(
      {
        mediaDocs: totalDocs,
        inputUrls: urls.length,
        alreadyInMedia: matchedUrls.length,
        notInMedia: missingUrls.length,
        outputTxt: OUTPUT_TXT,
        matchedTxt: OUTPUT_MATCHED_TXT,
        outputCsv: csvResult.written ? OUTPUT_CSV : null,
        csvRowsKept: csvResult.keptRows,
        csvRowsMatched: csvResult.matchedRows,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('Filter broken images failed:', error)
  process.exit(1)
})
