import dotenv from 'dotenv'
import path from 'path'
import { getPayload } from 'payload'
import config from '@payload-config'

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  title?: string | null
  alt?: string | null
  sourceFilename?: string | null
}

const projectRoot = process.cwd()

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
const UPDATE_TITLE = !hasFlag('--keep-title')
const UPDATE_SOURCE_FILENAME = !hasFlag('--keep-source-filename')

const imageExtensionPattern = /\.(jpe?g|png|gif|webp|avif|svg)$/i

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

  return `${cleanedStem}${extension.toLowerCase()}`
}

function shouldUpdateTitle(title: unknown, oldFilename: string, newFilename: string) {
  if (!UPDATE_TITLE || typeof title !== 'string') {
    return false
  }

  const cleanTitle = title.trim()

  if (!cleanTitle) {
    return true
  }

  const oldStem = getFilenameParts(oldFilename).stem
  const newStem = getFilenameParts(newFilename).stem

  return (
    cleanTitle === oldFilename ||
    cleanTitle === oldStem ||
    cleanTitle === newFilename ||
    cleanTitle.includes(oldStem)
  )
}

function makeTitleFromFilename(filename: string) {
  const stem = getFilenameParts(filename).stem

  return stem.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
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

async function main() {
  const payload = await getPayload({ config })
  let page = 1
  let scanned = 0
  let wouldUpdate = 0
  let updated = 0
  let skippedSame = 0
  let skippedConflict = 0
  let failed = 0

  console.log('Repair media filenames')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)

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

    if (!docs.length) {
      break
    }

    for (const doc of docs) {
      if (LIMIT && scanned >= LIMIT) {
        break
      }

      scanned += 1

      const oldFilename = String(doc.filename || doc.fileName || '').trim()
      const newFilename = cleanMediaFilename(oldFilename)

      if (!newFilename || newFilename === oldFilename) {
        skippedSame += 1
        continue
      }

      const conflict = await findMediaByFilename(payload, newFilename)

      if (conflict?.id && String(conflict.id) !== String(doc.id)) {
        skippedConflict += 1
        console.warn(`skip conflict #${doc.id}: ${oldFilename} -> ${newFilename}`)
        continue
      }

      wouldUpdate += 1
      console.log(`${DRY_RUN ? 'would update' : 'update'} #${doc.id}: ${oldFilename} -> ${newFilename}`)

      if (DRY_RUN) {
        continue
      }

      const data: Record<string, unknown> = {
        fileName: newFilename,
      }

      if (shouldUpdateTitle(doc.title, oldFilename, newFilename)) {
        data.title = makeTitleFromFilename(newFilename)
      }

      if (UPDATE_SOURCE_FILENAME && doc.sourceFilename === oldFilename) {
        data.sourceFilename = newFilename
      }

      try {
        await payload.update({
          collection: 'media',
          id: doc.id,
          data,
          overrideAccess: true,
        })

        updated += 1
      } catch (error: any) {
        failed += 1
        console.error(`failed #${doc.id}: ${error?.message || error}`)
      }
    }

    if (LIMIT && scanned >= LIMIT) {
      break
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        scanned,
        wouldUpdate,
        updated,
        skippedSame,
        skippedConflict,
        failed,
      },
      null,
      2,
    ),
  )

  if (DRY_RUN) {
    console.log('')
    console.log('Run with --yes to write changes.')
  }
}

main().catch((error) => {
  console.error('Repair media filenames failed:', error)
  process.exit(1)
})
