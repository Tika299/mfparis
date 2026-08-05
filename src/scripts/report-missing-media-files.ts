import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

type MediaDoc = {
  id: string | number
  filename?: string | null
  fileName?: string | null
  title?: string | null
  alt?: string | null
  url?: string | null
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const args = process.argv.slice(2)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(name + '='))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const TXT_OUTPUT = path.join(REPORT_DIR, 'missing-media-files.txt')
const CSV_OUTPUT = path.join(REPORT_DIR, 'missing-media-files.csv')

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return '"' + text.replace(/"/g, '""') + '"'
}

function getFilename(doc: MediaDoc) {
  return String(doc.filename || doc.fileName || '').trim()
}

function getFilePath(filename: string) {
  return path.join(MEDIA_DIR, filename)
}

async function main() {
  console.log('Report missing Payload media files')
  console.log('Media dir: ' + MEDIA_DIR)

  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })

  await fs.promises.mkdir(REPORT_DIR, { recursive: true })

  const missingRows: Array<{
    id: string | number
    title: string
    filename: string
    filePath: string
    url: string
  }> = []

  let page = 1
  let scanned = 0
  let missingFilenameField = 0
  let existing = 0

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

      const filename = getFilename(doc)

      if (!filename) {
        missingFilenameField += 1
        continue
      }

      const filePath = getFilePath(filename)

      if (fs.existsSync(filePath)) {
        existing += 1
        continue
      }

      missingRows.push({
        id: doc.id,
        title: String(doc.title || doc.alt || filename),
        filename,
        filePath,
        url: String(doc.url || '/api/media/file/' + encodeURIComponent(filename)),
      })
    }

    if (LIMIT && scanned >= LIMIT) break
    if (!result.hasNextPage) break

    page += 1
  }

  missingRows.sort((a, b) => a.filename.localeCompare(b.filename))

  await fs.promises.writeFile(
    TXT_OUTPUT,
    missingRows.map((row) => row.filename).join('\n') + (missingRows.length ? '\n' : ''),
    'utf8',
  )

  await fs.promises.writeFile(
    CSV_OUTPUT,
    [
      ['id', 'title', 'filename', 'filePath', 'url'].map(csvCell).join(','),
      ...missingRows.map((row) =>
        [row.id, row.title, row.filename, row.filePath, row.url].map(csvCell).join(','),
      ),
    ].join('\n') + '\n',
    'utf8',
  )

  console.log('')
  console.log('Done.')
  console.log(
    JSON.stringify(
      {
        scanned,
        existing,
        missing: missingRows.length,
        missingFilenameField,
        txt: TXT_OUTPUT,
        csv: CSV_OUTPUT,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('Report missing media files failed:', error)
  process.exit(1)
})
