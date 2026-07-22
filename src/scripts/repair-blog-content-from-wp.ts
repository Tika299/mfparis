import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { decodeHtmlEntities, sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type AnyRecord = Record<string, any>

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

const DRY_RUN = !hasFlag('--yes') || hasFlag('--dry-run')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const OFFSET = Math.max(0, Number(getArg('--offset', '0')) || 0)
const ONLY_SLUG = getArg('--slug', '')
const ONLY_WP_ID = Math.max(0, Number(getArg('--wp-id', '0')) || 0)
const SKIP_MEDIA_MAP = hasFlag('--skip-media-map')
const FORCE = hasFlag('--force')
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const WP_BASE_URL = getArg('--wp-base-url', process.env.WP_BASE_URL || 'https://mfparis.vn')
const DATA_DIR = path.resolve(
  getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || path.resolve(__dirname, 'export')),
)
const POSTS_FILE = path.resolve(DATA_DIR, getArg('--posts-file', 'posts.json'))

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getRendered(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (isRecord(value) && typeof value.rendered === 'string') {
    return value.rendered
  }

  return ''
}

function formatSlug(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐÄ‘Ä]/g, 'd')
    .replace(/&/g, ' va ')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function looksLikeMojibake(value: string) {
  return /(?:Ã.|Ä.|Å.|Æ.|â€|Â|áº|á»|�)/.test(value)
}

function decodeUtf8Mojibake(value: string) {
  try {
    return Buffer.from(value, 'latin1').toString('utf8')
  } catch {
    return value
  }
}

function fixVietnameseEncoding(value: string): string {
  let next = value

  for (let index = 0; index < 3; index += 1) {
    if (!looksLikeMojibake(next)) {
      break
    }

    const decoded = decodeUtf8Mojibake(next)

    if (!decoded || decoded === next) {
      break
    }

    next = decoded
  }

  return next
}

function normalizeText(value: unknown): string {
  return decodeHtmlEntities(fixVietnameseEncoding(String(value ?? '')))
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

function getRawPostContent(item: AnyRecord) {
  return getRendered(item.content) || ''
}

function getFilenameFromUrl(url: string) {
  try {
    const parsed = new URL(url, WP_BASE_URL)
    return decodeURIComponent(path.posix.basename(parsed.pathname))
  } catch {
    return ''
  }
}

function withoutSizeSuffix(filename: string) {
  const extension = path.posix.extname(filename)
  const basename = extension ? filename.slice(0, -extension.length) : filename
  return `${basename.replace(/-\d+x\d+$/, '')}${extension}`
}

function normalizeUrlKey(value: string) {
  if (!value) return ''

  try {
    return new URL(value, WP_BASE_URL).toString()
  } catch {
    return value
  }
}

function addMediaKey(map: Map<string, string>, key: string, value: string) {
  if (key && value && !map.has(key)) {
    map.set(key, value)
  }
}

async function buildMediaMap(payload: any) {
  const bySourceUrl = new Map<string, string>()
  const byFilename = new Map<string, string>()
  let page = 1

  if (SKIP_MEDIA_MAP) {
    return { bySourceUrl, byFilename }
  }

  while (true) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const media of result.docs as AnyRecord[]) {
      const url = typeof media.url === 'string' ? media.url : ''
      if (!url) continue

      const sourceUrl = typeof media.sourceUrl === 'string' ? media.sourceUrl : ''
      const sourceFilename = typeof media.sourceFilename === 'string' ? media.sourceFilename : ''
      const filename = typeof media.filename === 'string' ? media.filename : ''

      addMediaKey(bySourceUrl, normalizeUrlKey(sourceUrl), url)
      addMediaKey(byFilename, sourceFilename, url)
      addMediaKey(byFilename, withoutSizeSuffix(sourceFilename), url)
      addMediaKey(byFilename, filename, url)
      addMediaKey(byFilename, withoutSizeSuffix(filename), url)

      if (sourceUrl) {
        const sourceUrlFilename = getFilenameFromUrl(sourceUrl)
        addMediaKey(byFilename, sourceUrlFilename, url)
        addMediaKey(byFilename, withoutSizeSuffix(sourceUrlFilename), url)
      }
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return { bySourceUrl, byFilename }
}

function getAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'))
  return match?.[1] || ''
}

function removeAttribute(tag: string, attribute: string) {
  return tag.replace(new RegExp(`\\s${attribute}=["'][^"']*["']`, 'gi'), '')
}

function setAttribute(tag: string, attribute: string, value: string) {
  const escaped = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const pattern = new RegExp(`(\\s${attribute}=)["'][^"']*["']`, 'i')

  if (pattern.test(tag)) {
    return tag.replace(pattern, `$1"${escaped}"`)
  }

  return tag.replace(/\s*\/?>$/, (ending) => ` ${attribute}="${escaped}"${ending}`)
}

function isLazyPlaceholder(value: string) {
  return /\/themes\/woodmart\/images\/lazy\.svg(?:$|[?#])/i.test(value)
}

function srcsetUrls(value: string) {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
}

function getBestSourceUrlFromImg(tag: string) {
  const candidates = [
    getAttribute(tag, 'data-src'),
    getAttribute(tag, 'data-lazy-src'),
    getAttribute(tag, 'data-original'),
    getAttribute(tag, 'src'),
    ...srcsetUrls(getAttribute(tag, 'data-srcset')),
    ...srcsetUrls(getAttribute(tag, 'srcset')),
  ].filter(Boolean)

  return candidates.find((candidate) => !isLazyPlaceholder(candidate)) || ''
}

function getReplacementUrl(sourceUrl: string, mediaMap: Awaited<ReturnType<typeof buildMediaMap>>) {
  const direct = mediaMap.bySourceUrl.get(normalizeUrlKey(sourceUrl))
  if (direct) return direct

  const filename = getFilenameFromUrl(sourceUrl)
  return mediaMap.byFilename.get(filename) || mediaMap.byFilename.get(withoutSizeSuffix(filename)) || ''
}

function rewriteImagesToPayloadMedia(html: string, mediaMap: Awaited<ReturnType<typeof buildMediaMap>>) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const sourceUrl = getBestSourceUrlFromImg(tag)
    if (!sourceUrl) return tag

    const replacement = getReplacementUrl(sourceUrl, mediaMap) || sourceUrl
    let nextTag = setAttribute(tag, 'src', replacement)

    nextTag = removeAttribute(nextTag, 'srcset')
    nextTag = removeAttribute(nextTag, 'data-src')
    nextTag = removeAttribute(nextTag, 'data-lazy-src')
    nextTag = removeAttribute(nextTag, 'data-original')
    nextTag = removeAttribute(nextTag, 'data-srcset')
    nextTag = removeAttribute(nextTag, 'data-lazy-srcset')
    nextTag = removeAttribute(nextTag, 'sizes')

    return nextTag
  })
}

function normalizePostHtml(item: AnyRecord, mediaMap: Awaited<ReturnType<typeof buildMediaMap>>) {
  const rawHtml = getRawPostContent(item)
  if (!rawHtml.trim()) return ''

  const encodingFixed = fixVietnameseEncoding(rawHtml)
  const decoded = decodeHtmlEntities(encodingFixed)
  const imagesRewritten = rewriteImagesToPayloadMedia(decoded, mediaMap)

  return sanitizeWordPressHtml(imagesRewritten)
}

function readPostsExport() {
  if (!fs.existsSync(POSTS_FILE)) {
    throw new Error(`Khong tim thay file posts export: ${POSTS_FILE}`)
  }

  const data = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'))
  if (!Array.isArray(data)) {
    throw new Error(`File posts export khong phai JSON array: ${POSTS_FILE}`)
  }

  return data as AnyRecord[]
}

function getExportSlug(item: AnyRecord) {
  const title = normalizeText(getRendered(item.title) || item.title || item.slug || `Post ${item.id}`)

  return formatSlug(String(item.slug || title || item.id))
}

function buildExportMaps(items: AnyRecord[]) {
  const byWpId = new Map<number, AnyRecord>()
  const bySlug = new Map<string, AnyRecord>()

  for (const item of items) {
    const wpId = Number(item.id)
    const slug = getExportSlug(item)

    if (Number.isFinite(wpId) && wpId > 0 && !byWpId.has(wpId)) {
      byWpId.set(wpId, item)
    }

    if (slug && !bySlug.has(slug)) {
      bySlug.set(slug, item)
    }

    if (typeof item.slug === 'string' && item.slug && !bySlug.has(item.slug)) {
      bySlug.set(item.slug, item)
    }
  }

  return { byWpId, bySlug }
}

function findExportForPayloadPost(
  doc: AnyRecord,
  maps: ReturnType<typeof buildExportMaps>,
) {
  const wpId = Number(doc.wpId)

  if (Number.isFinite(wpId) && wpId > 0) {
    const byWpId = maps.byWpId.get(wpId)

    if (byWpId) {
      return byWpId
    }
  }

  const slug = typeof doc.slug === 'string' ? doc.slug : ''

  return maps.bySlug.get(slug) || maps.bySlug.get(formatSlug(slug)) || null
}

function shouldSkipPayloadPost(doc: AnyRecord, index: number) {
  if (OFFSET > 0 && index < OFFSET) return true
  if (ONLY_WP_ID > 0 && Number(doc.wpId) !== ONLY_WP_ID) return true
  if (ONLY_SLUG && String(doc.slug || '') !== ONLY_SLUG) return true

  return false
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length || 0
}

function summarizeHtml(value: unknown) {
  const html = typeof value === 'string' ? value : ''

  return {
    length: html.length,
    headings: countMatches(html, /<h[2-4]\b/gi),
    figures: countMatches(html, /<figure\b/gi),
    tables: countMatches(html, /<table\b/gi),
    lists: countMatches(html, /<(?:ul|ol)\b/gi),
    paragraphs: countMatches(html, /<p\b/gi),
  }
}

function formatSummary(summary: ReturnType<typeof summarizeHtml>) {
  return `len=${summary.length}, h=${summary.headings}, fig=${summary.figures}, table=${summary.tables}, list=${summary.lists}, p=${summary.paragraphs}`
}

async function verifyUpdatedContent(payload: any, id: unknown, expectedContent: string) {
  const verified = await payload.findByID({
    collection: 'posts',
    id,
    depth: 0,
    overrideAccess: true,
  })

  return verified?.content === expectedContent
}

async function run() {
  console.log('Repair blog content from WordPress export')
  console.log(`Data file: ${POSTS_FILE}`)
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Media map: ${SKIP_MEDIA_MAP ? 'skip' : 'yes'}`)
  console.log(`Mode: scan Payload posts -> update content only`)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const mediaMap = await buildMediaMap(payload)
  const exportPosts = readPostsExport()
  const exportMaps = buildExportMaps(exportPosts)

  let scanned = 0
  let matched = 0
  let changed = 0
  let skippedSame = 0
  let missingExport = 0
  let empty = 0
  let failed = 0
  let verified = 0
  let page = 1
  let visited = 0

  while (true) {
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const existing of result.docs as AnyRecord[]) {
      if (shouldSkipPayloadPost(existing, visited)) {
        visited += 1
        continue
      }

      visited += 1

      if (LIMIT > 0 && scanned >= LIMIT) {
        break
      }

      scanned += 1

      const item = findExportForPayloadPost(existing, exportMaps)
      const title = normalizeText(existing.title || existing.slug || `Post ${existing.id}`)

      if (!item) {
        missingExport += 1
        console.warn(
          `   Missing WordPress export for Payload post #${existing.id}: ${title} (wpId=${existing.wpId || 'none'}, slug=${existing.slug || 'none'})`,
        )
        continue
      }

      const content = normalizePostHtml(item, mediaMap)

      if (!content.trim()) {
        empty += 1
        console.warn(`   Empty WordPress content: ${title}`)
        continue
      }

      matched += 1

      if (!FORCE && existing.content === content) {
        skippedSame += 1
        continue
      }

      changed += 1
      const beforeSummary = summarizeHtml(existing.content)
      const afterSummary = summarizeHtml(content)

      console.log(
        `   ${DRY_RUN ? '[dry-run] ' : ''}update content post #${existing.id} wpId=${existing.wpId || item.id}: ${title}`,
      )
      console.log(`      before: ${formatSummary(beforeSummary)}`)
      console.log(`      after : ${formatSummary(afterSummary)}`)

      if (!DRY_RUN) {
        try {
          await payload.update({
            collection: 'posts',
            id: existing.id,
            data: { content },
            depth: 0,
            overrideAccess: true,
          })

          const ok = await verifyUpdatedContent(payload, existing.id, content)

          if (ok) {
            verified += 1
          } else {
            failed += 1
            console.warn(`   Verify failed: DB content still differs after update for post #${existing.id}`)
          }
        } catch (error) {
          failed += 1
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`   Update failed #${existing.id}: ${message}`)
        }
      }
    }

    if (!result.hasNextPage || (LIMIT > 0 && scanned >= LIMIT)) {
      break
    }

    page += 1
  }

  console.log('\nDone.')
  console.log(`Scanned Payload posts: ${scanned}`)
  console.log(`Matched WordPress export posts: ${matched}`)
  console.log(`${DRY_RUN ? 'Would update' : 'Updated'}: ${changed}`)
  console.log(`Verified after update: ${verified}`)
  console.log(`Already same: ${skippedSame}`)
  console.log(`Missing WordPress export: ${missingExport}`)
  console.log(`Empty WordPress content: ${empty}`)
  console.log(`Failed: ${failed}`)

  if (DRY_RUN) {
    console.log('\nRun real update: npm run repair:blog-content -- --yes --force')
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error('Repair blog content failed:', error)
  process.exit(1)
})
