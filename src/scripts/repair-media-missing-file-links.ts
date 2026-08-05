import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'
import { getPayload } from 'payload'

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  url?: string | null
  thumbnailURL?: string | null
  sizes?: Record<string, { filename?: string | null; url?: string | null } | null>
}

type UpdatePlan = {
  id: string | number
  oldFilename: string
  newFilename: string
  fields: Record<string, string | null>
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
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const REPORT_CSV = path.join(REPORT_DIR, 'media-missing-file-links-repair.csv')

const imageExtensionPattern = /\.(jpe?g|png|gif|webp|avif|svg)$/i
const hashSuffixPattern = /-([a-z0-9]{5,10})$/i
const sizeSuffixPattern = /-\d+x\d+$/i

const sizeColumns: Record<string, { filename: string; url: string }> = {
  thumbnail: { filename: 'sizes_thumbnail_filename', url: 'sizes_thumbnail_url' },
  card: { filename: 'sizes_card_filename', url: 'sizes_card_url' },
  blogCard: { filename: 'sizes_blog_card_filename', url: 'sizes_blog_card_url' },
  heroMobile: { filename: 'sizes_hero_mobile_filename', url: 'sizes_hero_mobile_url' },
  heroTablet: { filename: 'sizes_hero_tablet_filename', url: 'sizes_hero_tablet_url' },
  heroDesktop: { filename: 'sizes_hero_desktop_filename', url: 'sizes_hero_desktop_url' },
}

function getFilenameParts(filename: string) {
  const extension = path.extname(filename)
  const stem = extension ? filename.slice(0, -extension.length) : filename
  return { extension, stem }
}

function fileExists(filename: string) {
  return Boolean(filename) && fs.existsSync(path.join(MEDIA_DIR, filename))
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

function cleanSizeFilename(filename: string) {
  const raw = path.basename(String(filename || '').replace(/\\/g, '/'))

  if (!raw || !imageExtensionPattern.test(raw)) return ''

  const { extension, stem } = getFilenameParts(raw)
  const sizeMatch = stem.match(/-\d+x\d+$/i)

  if (!sizeMatch) {
    return cleanMainFilename(raw)
  }

  const sizeSuffix = sizeMatch[0]
  const stemBeforeSize = stem.slice(0, -sizeSuffix.length)
  const cleanedStem = removeImportHashSuffix(stemBeforeSize).replace(/-+$/g, '')
  const next = `${cleanedStem}${sizeSuffix}${extension.toLowerCase()}`

  return next === raw ? '' : next
}

function fileUrl(filename: string) {
  return `/api/media/file/${encodeURIComponent(filename)}`
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

async function findMediaByFilename(payload: any, filename: string) {
  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      filename: {
        equals: filename,
      },
    },
  })

  return result.docs?.[0] as MediaDoc | undefined
}

async function createPlan(payload: any, doc: MediaDoc): Promise<UpdatePlan | null> {
  const oldFilename = String(doc.filename || doc.fileName || '').trim()

  if (!oldFilename || fileExists(oldFilename)) {
    return null
  }

  const newFilename = cleanMainFilename(oldFilename)

  if (!newFilename || newFilename === oldFilename || !fileExists(newFilename)) {
    return null
  }

  const conflict = await findMediaByFilename(payload, newFilename)

  if (conflict?.id && String(conflict.id) !== String(doc.id)) {
    console.warn(`skip conflict #${doc.id}: ${oldFilename} -> ${newFilename} already used by #${conflict.id}`)
    return null
  }

  const fields: Record<string, string | null> = {
    filename: newFilename,
    file_name: newFilename,
    url: fileUrl(newFilename),
  }

  for (const [sizeName, columns] of Object.entries(sizeColumns)) {
    const currentSizeFilename = String(doc.sizes?.[sizeName]?.filename || '').trim()
    const nextSizeFilename = cleanSizeFilename(currentSizeFilename)

    if (currentSizeFilename && nextSizeFilename && fileExists(nextSizeFilename)) {
      fields[columns.filename] = nextSizeFilename
      fields[columns.url] = fileUrl(nextSizeFilename)

      if (sizeName === 'thumbnail') {
        fields.thumbnail_u_r_l = fileUrl(nextSizeFilename)
      }
    }
  }

  return {
    id: doc.id,
    oldFilename,
    newFilename,
    fields,
  }
}

async function applyPlan(sql: postgres.Sql, plan: UpdatePlan) {
  const entries = Object.entries(plan.fields)
  const assignments = entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ')
  const values = entries.map(([, value]) => value)
  values.push(String(plan.id))

  await sql.unsafe(
    `update "media" set ${assignments}, "updated_at" = now() where "id" = $${values.length}`,
    values,
  )
}

async function main() {
  console.log('Repair media records pointing to missing files')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Media dir: ${MEDIA_DIR}`)

  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })
  const sql = DRY_RUN ? null : postgres(process.env.DATABASE_URL || '', { max: 1 })

  if (!DRY_RUN && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.')
  }

  await fs.promises.mkdir(REPORT_DIR, { recursive: true })

  const reportRows = [
    ['status', 'id', 'oldFilename', 'newFilename', 'changedFields'].map(csvCell).join(','),
  ]

  let page = 1
  let scanned = 0
  let missingFile = 0
  let matchedCleanFile = 0
  let updated = 0
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

        const filename = String(doc.filename || doc.fileName || '').trim()
        if (filename && !fileExists(filename)) {
          missingFile += 1
        }

        const plan = await createPlan(payload, doc)

        if (!plan) {
          skipped += 1
          continue
        }

        matchedCleanFile += 1
        console.log(`${DRY_RUN ? 'would update' : 'update'} #${plan.id}: ${plan.oldFilename} -> ${plan.newFilename}`)

        try {
          if (sql) {
            await applyPlan(sql, plan)
            updated += 1
          }

          reportRows.push(
            [
              DRY_RUN ? 'would_update' : 'updated',
              plan.id,
              plan.oldFilename,
              plan.newFilename,
              Object.keys(plan.fields).join('|'),
            ]
              .map(csvCell)
              .join(','),
          )
        } catch (error: any) {
          failed += 1
          console.error(`failed #${plan.id}: ${error?.message || error}`)
          reportRows.push(
            ['failed', plan.id, plan.oldFilename, plan.newFilename, error?.message || error]
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
        missingFile,
        matchedCleanFile,
        updated,
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
    console.log('Run with --yes to update database.')
  }
}

main().catch((error) => {
  console.error('Repair media missing file links failed:', error)
  process.exit(1)
})
