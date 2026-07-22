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

async function findExistingPost(payload: any, item: AnyRecord, slug: string) {
  const wpId = Number(item.id)

  if (Number.isFinite(wpId) && wpId > 0) {
    const byWpId = await payload.find({
      collection: 'posts',
      where: { wpId: { equals: wpId } },
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
    })

    if (byWpId.docs[0]) return byWpId.docs[0] as AnyRecord
  }

  const bySlug = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return (bySlug.docs[0] as AnyRecord | undefined) || null
}

function shouldSkipItem(item: AnyRecord, index: number) {
  if (OFFSET > 0 && index < OFFSET) return true
  if (ONLY_WP_ID > 0 && Number(item.id) !== ONLY_WP_ID) return true
  if (ONLY_SLUG && String(item.slug || '') !== ONLY_SLUG) return true
  return false
}

async function run() {
  console.log('Repair blog content from WordPress export')
  console.log(`Data file: ${POSTS_FILE}`)
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Media map: ${SKIP_MEDIA_MAP ? 'skip' : 'yes'}`)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const mediaMap = await buildMediaMap(payload)
  const posts = readPostsExport()

  let scanned = 0
  let matched = 0
  let changed = 0
  let skippedSame = 0
  let missing = 0
  let empty = 0
  let failed = 0

  for (const [index, item] of posts.entries()) {
    if (shouldSkipItem(item, index)) continue
    if (LIMIT > 0 && scanned >= LIMIT) break

    scanned += 1

    const title = normalizeText(getRendered(item.title) || item.title || item.slug || `Post ${item.id}`)
    const slug = formatSlug(String(item.slug || title || item.id))
    const content = normalizePostHtml(item, mediaMap)

    if (!content.trim()) {
      empty += 1
      console.warn(`   Empty content: ${title}`)
      continue
    }

    const existing = await findExistingPost(payload, item, slug)

    if (!existing?.id) {
      missing += 1
      console.warn(`   Missing post in Payload: ${title} (${slug})`)
      continue
    }

    matched += 1

    if (!FORCE && existing.content === content) {
      skippedSame += 1
      continue
    }

    changed += 1
    const currentLength = typeof existing.content === 'string' ? existing.content.length : 0
    console.log(
      `   ${DRY_RUN ? '[dry-run] ' : ''}update post #${existing.id} wpId=${item.id}: ${title} (${currentLength} -> ${content.length})`,
    )

    if (!DRY_RUN) {
      try {
        await payload.update({
          collection: 'posts',
          id: existing.id,
          data: { content },
          depth: 0,
          overrideAccess: true,
        })
      } catch (error) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`   Update failed #${existing.id}: ${message}`)
      }
    }
  }

  console.log('\nDone.')
  console.log(`Scanned export posts: ${scanned}`)
  console.log(`Matched Payload posts: ${matched}`)
  console.log(`${DRY_RUN ? 'Would update' : 'Updated'}: ${changed}`)
  console.log(`Already same: ${skippedSame}`)
  console.log(`Missing in Payload: ${missing}`)
  console.log(`Empty content: ${empty}`)
  console.log(`Failed: ${failed}`)

  if (DRY_RUN) {
    console.log('\nRun real update: npm run repair:blog-content -- --yes')
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error('Repair blog content failed:', error)
  process.exit(1)
})
