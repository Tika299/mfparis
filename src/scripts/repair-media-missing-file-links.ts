import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'
import { getPayload } from 'payload'
import sharp from 'sharp'

import {
  getFilenameParts,
  isExactImageFamilyVariant,
  parseSizeArea,
  parseSizeDimensions,
} from './lib/media-file-repair'

type SizeDoc = {
  filename?: string | null
  url?: string | null
  width?: number | null
  height?: number | null
  mimeType?: string | null
  filesize?: number | null
}

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  url?: string | null
  thumbnailURL?: string | null
  sizes?: Record<string, SizeDoc | null | undefined> | null
}

type FileCreation = {
  sourceFilename: string
  targetFilename: string
  width?: number
  height?: number
  resize: boolean
}

type UpdatePlan = {
  id: string | number
  fields: Record<string, string | number | null>
  creations: FileCreation[]
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = hasFlag('--dry-run') || !YES
const CREATE_FILES = hasFlag('--create-files') || hasFlag('--create-main-from-size')
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const REPORT_CSV = path.join(REPORT_DIR, 'media-missing-file-links-repair.csv')

const imageExtensionPattern = /\.(jpe?g|png|gif|webp|avif|svg)$/i
const hashSuffixPattern = /-([a-z0-9]{5,10})$/i
const sizeSuffixPattern = /-\d+x\d+$/i
const fallbackExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.avif']

const sizeColumns: Record<
  string,
  {
    filename: string
    url: string
    width: string
    height: string
    mimeType: string
    filesize: string
  }
> = {
  thumbnail: {
    filename: 'sizes_thumbnail_filename',
    url: 'sizes_thumbnail_url',
    width: 'sizes_thumbnail_width',
    height: 'sizes_thumbnail_height',
    mimeType: 'sizes_thumbnail_mime_type',
    filesize: 'sizes_thumbnail_filesize',
  },
  card: {
    filename: 'sizes_card_filename',
    url: 'sizes_card_url',
    width: 'sizes_card_width',
    height: 'sizes_card_height',
    mimeType: 'sizes_card_mime_type',
    filesize: 'sizes_card_filesize',
  },
  blogCard: {
    filename: 'sizes_blog_card_filename',
    url: 'sizes_blog_card_url',
    width: 'sizes_blog_card_width',
    height: 'sizes_blog_card_height',
    mimeType: 'sizes_blog_card_mime_type',
    filesize: 'sizes_blog_card_filesize',
  },
  heroMobile: {
    filename: 'sizes_hero_mobile_filename',
    url: 'sizes_hero_mobile_url',
    width: 'sizes_hero_mobile_width',
    height: 'sizes_hero_mobile_height',
    mimeType: 'sizes_hero_mobile_mime_type',
    filesize: 'sizes_hero_mobile_filesize',
  },
  heroTablet: {
    filename: 'sizes_hero_tablet_filename',
    url: 'sizes_hero_tablet_url',
    width: 'sizes_hero_tablet_width',
    height: 'sizes_hero_tablet_height',
    mimeType: 'sizes_hero_tablet_mime_type',
    filesize: 'sizes_hero_tablet_filesize',
  },
  heroDesktop: {
    filename: 'sizes_hero_desktop_filename',
    url: 'sizes_hero_desktop_url',
    width: 'sizes_hero_desktop_width',
    height: 'sizes_hero_desktop_height',
    mimeType: 'sizes_hero_desktop_mime_type',
    filesize: 'sizes_hero_desktop_filesize',
  },
}

function getFilePath(filename: string) {
  return path.join(MEDIA_DIR, filename)
}

function fileExists(filename: string) {
  return Boolean(filename) && fs.existsSync(getFilePath(filename))
}

function fileUrl(filename: string) {
  return `/api/media/file/${encodeURIComponent(filename)}`
}

function hasImportHashSuffix(stem: string) {
  const match = stem.match(hashSuffixPattern)
  if (!match) return false

  const suffix = match[1] || ''
  return /[a-z]/i.test(suffix) && /\d/.test(suffix)
}

function removeImportHashSuffix(stem: string) {
  return hasImportHashSuffix(stem) ? stem.replace(hashSuffixPattern, '') : stem
}

function cleanMainFilename(filename: string) {
  const raw = path.basename(String(filename || '').replace(/\\/g, '/'))

  if (!raw || !imageExtensionPattern.test(raw)) return ''

  const { extension, stem } = getFilenameParts(raw)
  const withoutSize = stem.replace(sizeSuffixPattern, '')
  const cleanedStem = removeImportHashSuffix(withoutSize).replace(/-+$/g, '')

  if (!cleanedStem || cleanedStem === stem) return ''

  return `${cleanedStem}${extension.toLowerCase()}`
}

function existingCandidate(stem: string, preferredExtension: string) {
  const extensions = [
    preferredExtension.toLowerCase(),
    ...fallbackExtensions.filter((extension) => extension !== preferredExtension.toLowerCase()),
  ]

  for (const extension of extensions) {
    const candidate = `${stem}${extension}`
    if (fileExists(candidate)) return candidate
  }

  return ''
}

function findExistingCleanMainFilename(filename: string) {
  const cleaned = cleanMainFilename(filename)

  if (!cleaned) return ''
  if (fileExists(cleaned)) return cleaned

  const { extension, stem } = getFilenameParts(cleaned)
  return existingCandidate(stem, extension)
}

function findExistingCleanSizeFilename(filename: string) {
  const raw = path.basename(String(filename || '').replace(/\\/g, '/'))

  if (!raw || !imageExtensionPattern.test(raw)) return ''

  const { extension, stem } = getFilenameParts(raw)
  const sizeMatch = stem.match(sizeSuffixPattern)

  if (!sizeMatch) return cleanMainFilename(raw)

  const sizeSuffix = sizeMatch[0]
  const stemBeforeSize = stem.slice(0, -sizeSuffix.length)
  const cleanedStem = removeImportHashSuffix(stemBeforeSize).replace(/-+$/g, '')
  const nextStem = `${cleanedStem}${sizeSuffix}`
  const next = `${nextStem}${extension.toLowerCase()}`

  if (next !== raw && fileExists(next)) return next

  return existingCandidate(nextStem, extension)
}

function findExactFamilyVariant(mainFilename: string, candidates: string[]) {
  return candidates
    .filter(
      (candidate) => fileExists(candidate) && isExactImageFamilyVariant(mainFilename, candidate),
    )
    .sort((a, b) => {
      const areaDifference = parseSizeArea(b) - parseSizeArea(a)
      if (areaDifference !== 0) return areaDifference
      return (
        Number(path.extname(b).toLowerCase() === path.extname(mainFilename).toLowerCase()) -
        Number(path.extname(a).toLowerCase() === path.extname(mainFilename).toLowerCase())
      )
    })[0]
}

function getSizeDimensions(size: SizeDoc, filename: string) {
  const width = Number(size.width || 0)
  const height = Number(size.height || 0)

  if (width > 0 && height > 0) return { width, height }
  return parseSizeDimensions(filename)
}

function getSizeCandidates(doc: MediaDoc, targetFilename: string) {
  const candidates: string[] = []

  if (doc.filename && fileExists(doc.filename) && doc.filename !== targetFilename) {
    candidates.push(doc.filename)
  }

  for (const size of Object.values(doc.sizes || {})) {
    const filename = String(size?.filename || '').trim()
    if (filename && filename !== targetFilename && fileExists(filename)) {
      candidates.push(filename)
    }
  }

  return [...new Set(candidates)]
}

function findBestSizeSource(doc: MediaDoc, targetFilename: string, targetSize: SizeDoc) {
  const targetDimensions = getSizeDimensions(targetSize, targetFilename)
  const targetRatio = targetDimensions ? targetDimensions.width / targetDimensions.height : 0

  return getSizeCandidates(doc, targetFilename)
    .map((filename) => {
      const dimensions = parseSizeDimensions(filename)
      const ratio = dimensions ? dimensions.width / dimensions.height : targetRatio
      const ratioDistance = targetRatio && ratio ? Math.abs(ratio - targetRatio) : 0

      return { filename, ratioDistance, area: parseSizeArea(filename) }
    })
    .sort((a, b) => {
      if (a.ratioDistance !== b.ratioDistance) return a.ratioDistance - b.ratioDistance
      return b.area - a.area
    })[0]?.filename
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

async function createImageFromSource(creation: FileCreation) {
  const sourcePath = getFilePath(creation.sourceFilename)
  const targetPath = getFilePath(creation.targetFilename)
  const targetExtension = path.extname(creation.targetFilename).toLowerCase()

  if (fileExists(creation.targetFilename)) return

  let pipeline = sharp(sourcePath)

  if (creation.resize && creation.width && creation.height) {
    pipeline = pipeline.resize(creation.width, creation.height, {
      fit: 'cover',
      position: 'centre',
    })
  }

  if (targetExtension === '.webp') {
    await pipeline.webp({ quality: 82 }).toFile(targetPath)
  } else if (targetExtension === '.avif') {
    await pipeline.avif({ quality: 70 }).toFile(targetPath)
  } else if (targetExtension === '.jpg' || targetExtension === '.jpeg') {
    await pipeline.jpeg({ quality: 86 }).toFile(targetPath)
  } else if (targetExtension === '.png') {
    await pipeline.png().toFile(targetPath)
  } else {
    await fs.promises.copyFile(sourcePath, targetPath)
  }
}

function addSizeFields(
  fields: Record<string, string | number | null>,
  sizeName: string,
  filename: string,
  info?: { width: number | null; height: number | null; mimeType: string | null; filesize: number },
) {
  const columns = sizeColumns[sizeName]
  if (!columns) return

  fields[columns.filename] = filename
  fields[columns.url] = fileUrl(filename)

  if (sizeName === 'thumbnail') {
    fields.thumbnail_u_r_l = fileUrl(filename)
  }

  if (info) {
    fields[columns.width] = info.width
    fields[columns.height] = info.height
    fields[columns.mimeType] = info.mimeType
    fields[columns.filesize] = info.filesize
  }
}

async function findMediaByFilename(payload: any, filename: string) {
  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: { filename: { equals: filename } },
  })

  return result.docs?.[0] as MediaDoc | undefined
}

async function createPlan(payload: any, doc: MediaDoc): Promise<UpdatePlan> {
  const fields: Record<string, string | number | null> = {}
  const creations: FileCreation[] = []
  const mainFilename = String(doc.filename || doc.fileName || '').trim()
  const allDocumentFiles = [
    mainFilename,
    ...Object.values(doc.sizes || {}).map((size) => String(size?.filename || '').trim()),
  ].filter(Boolean)

  if (mainFilename && !fileExists(mainFilename)) {
    const cleanMain = findExistingCleanMainFilename(mainFilename)

    if (cleanMain && cleanMain !== mainFilename) {
      const conflict = await findMediaByFilename(payload, cleanMain)

      if (!conflict || String(conflict.id) === String(doc.id)) {
        fields.filename = cleanMain
        fields.file_name = cleanMain
        fields.url = fileUrl(cleanMain)
      }
    } else {
      const sourceVariant = findExactFamilyVariant(mainFilename, allDocumentFiles)

      if (sourceVariant) {
        creations.push({
          sourceFilename: sourceVariant,
          targetFilename: mainFilename,
          resize: false,
        })
      }
    }
  }

  for (const [sizeName, size] of Object.entries(doc.sizes || {})) {
    const currentFilename = String(size?.filename || '').trim()
    if (!currentFilename) continue

    if (fileExists(currentFilename)) continue

    const cleanSize = findExistingCleanSizeFilename(currentFilename)
    if (cleanSize && cleanSize !== currentFilename) {
      addSizeFields(fields, sizeName, cleanSize)
      continue
    }

    const dimensions = getSizeDimensions(size || {}, currentFilename)
    const sourceFilename = findBestSizeSource(doc, currentFilename, size || {})

    if (!sourceFilename || !dimensions) continue

    creations.push({
      sourceFilename,
      targetFilename: currentFilename,
      width: dimensions.width,
      height: dimensions.height,
      resize: true,
    })
  }

  return { id: doc.id, fields, creations }
}

async function applyPlan(sql: postgres.Sql, plan: UpdatePlan) {
  if (CREATE_FILES) {
    for (const creation of plan.creations) {
      await createImageFromSource(creation)
    }
  }

  const entries = Object.entries(plan.fields)
  if (!entries.length) return

  const assignments = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ')
  const values = entries.map(([, value]) => value)
  values.push(String(plan.id))

  await sql.unsafe(
    `update "media" set ${assignments}, "updated_at" = now() where "id" = $${values.length}`,
    values,
  )
}

async function main() {
  console.log('Repair media records and generated sizes pointing to missing files')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Create files: ${CREATE_FILES ? 'yes' : 'no'}`)
  console.log(`Media dir: ${MEDIA_DIR}`)

  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })
  const sql = DRY_RUN ? null : postgres(process.env.DATABASE_URL || '', { max: 1 })

  if (!DRY_RUN && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.')
  }

  await fs.promises.mkdir(REPORT_DIR, { recursive: true })

  const reportRows = [
    ['status', 'id', 'field', 'oldFilename', 'newFilename', 'sourceFilename', 'details']
      .map(csvCell)
      .join(','),
  ]

  let page = 1
  let scanned = 0
  let missingMain = 0
  let missingSizes = 0
  let updated = 0
  let createdFiles = 0
  let wouldCreateFiles = 0
  let skipped = 0
  let failed = 0

  try {
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

      const docs = (result.docs || []) as MediaDoc[]
      if (!docs.length) break

      for (const doc of docs) {
        if (LIMIT && scanned >= LIMIT) break
        scanned += 1

        const mainFilename = String(doc.filename || doc.fileName || '').trim()
        if (mainFilename && !fileExists(mainFilename)) missingMain += 1

        for (const size of Object.values(doc.sizes || {})) {
          const filename = String(size?.filename || '').trim()
          if (filename && !fileExists(filename)) missingSizes += 1
        }

        const plan = await createPlan(payload, doc)
        const plannedFields = Object.entries(plan.fields)

        for (const [sizeName, size] of Object.entries(doc.sizes || {})) {
          const filename = String(size?.filename || '').trim()
          const columns = sizeColumns[sizeName]

          if (!filename || fileExists(filename) || !columns) continue

          const plannedForSize =
            plan.fields[columns.filename] === filename ||
            plan.creations.some((creation) => creation.targetFilename === filename)

          if (!plannedForSize) {
            reportRows.push(
              [
                'missing_size_unmatched',
                doc.id,
                `sizes.${sizeName}`,
                filename,
                '',
                '',
                'no existing same-media source or usable dimensions',
              ]
                .map(csvCell)
                .join(','),
            )
          }
        }

        if (!plannedFields.length && !plan.creations.length) {
          if (mainFilename && !fileExists(mainFilename)) {
            reportRows.push(
              [
                'missing_unmatched',
                doc.id,
                'filename',
                mainFilename,
                '',
                '',
                'no exact replacement or same-family source',
              ]
                .map(csvCell)
                .join(','),
            )
          }
          skipped += 1
          continue
        }

        for (const [field, value] of plannedFields) {
          reportRows.push(
            [
              'would_update',
              doc.id,
              field,
              '',
              String(value),
              '',
              'metadata will point to an existing file',
            ]
              .map(csvCell)
              .join(','),
          )
        }

        for (const creation of plan.creations) {
          const status = DRY_RUN
            ? CREATE_FILES
              ? 'would_create_file'
              : 'can_create_file'
            : 'created_file'
          reportRows.push(
            [
              status,
              doc.id,
              'file',
              creation.targetFilename,
              creation.targetFilename,
              creation.sourceFilename,
              creation.resize
                ? `generated ${creation.width}x${creation.height}`
                : 'recreated main file from exact same-family variant',
            ]
              .map(csvCell)
              .join(','),
          )
        }

        try {
          if (!DRY_RUN && sql) {
            await applyPlan(sql, plan)
            updated += plannedFields.length ? 1 : 0
            createdFiles += CREATE_FILES ? plan.creations.length : 0
          } else {
            wouldCreateFiles += CREATE_FILES ? plan.creations.length : 0
          }
        } catch (error: any) {
          failed += 1
          reportRows.push(
            ['failed', doc.id, '', '', '', '', error?.message || String(error)]
              .map(csvCell)
              .join(','),
          )
        }
      }

      if (LIMIT && scanned >= LIMIT) break
      if (!result.hasNextPage) break
      page += 1
    }
  } finally {
    if (sql) await sql.end()
  }

  await fs.promises.writeFile(REPORT_CSV, `${reportRows.join('\n')}\n`, 'utf8')

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        scanned,
        missingMain,
        missingSizes,
        updated,
        wouldCreateFiles,
        createdFiles,
        skipped,
        failed,
        report: REPORT_CSV,
      },
      null,
      2,
    ),
  )

  if (DRY_RUN) {
    console.log('')
    console.log(
      'Dry run only. Use --create-files --yes to create missing files and update metadata.',
    )
  }
}

main().catch((error) => {
  console.error('Repair media missing file links failed:', error)
  process.exit(1)
})
