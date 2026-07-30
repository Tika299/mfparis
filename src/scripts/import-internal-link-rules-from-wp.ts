import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import { normalizeVietnameseText } from '@/lib/internal-links/normalizeVietnamese'

type AnyRecord = Record<string, any>
type ID = string | number

type ProductTarget = {
  id: ID
  title: string
  slug: string
  wpId?: number | null
}

type ExistingRule = {
  id: ID
  title?: string | null
  targetUrl?: string | null
  keywords?: Array<{
    id?: ID
    keyword?: string | null
    matchType?: 'contains' | 'phrase' | null
    weight?: number | null
  }> | null
}

type ImportCandidate = {
  wpId: number
  wpTitle: string
  wpSlug: string
  product: ProductTarget
  targetUrl: string
  keywords: string[]
}

type InternalLinkScopeValue = 'posts' | 'products' | 'categories' | 'brands' | 'post-categories'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)

function hasFlag(name: string) {
  return args.includes(name)
}

function getArg(name: string, fallback = '') {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = !YES || hasFlag('--dry-run')
const UPDATE_EXISTING = hasFlag('--update')
const ENABLED = hasFlag('--enabled')
const INCLUDE_PRODUCTS_SCOPE = hasFlag('--scope-products')
const ALLOW_MISSING_TARGET = hasFlag('--allow-missing-target')
const ALLOW_KEYWORD_CONFLICTS = hasFlag('--allow-keyword-conflicts')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const DATA_PATH = path.resolve(
  getArg(
    '--data',
    process.env.WP_INTERNAL_LINK_RULES_DATA ||
      path.resolve(__dirname, 'export/products-with-variations.json'),
  ),
)

const DEFAULT_SCOPE: InternalLinkScopeValue[] = INCLUDE_PRODUCTS_SCOPE
  ? ['posts', 'products', 'categories', 'brands']
  : ['posts', 'categories', 'brands']

function readJsonArray(filePath: string): AnyRecord[] {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw)

  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.products)) return parsed.products
  if (Array.isArray(parsed.data)) return parsed.data

  throw new Error(`File data khong phai JSON array: ${filePath}`)
}

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/\s*\|&\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeKey(value: unknown) {
  return normalizeVietnameseText(cleanText(value))
}

function uniqueKeywords(values: unknown[]) {
  const seen = new Set<string>()
  const keywords: string[] = []

  for (const value of values) {
    const keyword = cleanText(value)
    const key = normalizeKey(keyword)

    if (!keyword || key.length < 3 || seen.has(key)) continue

    seen.add(key)
    keywords.push(keyword)
  }

  return keywords
}

function extractMetaValue(row: AnyRecord, key: string) {
  if (!Array.isArray(row.meta_data)) return undefined

  return row.meta_data.find((item: AnyRecord) => item?.key === key)?.value
}

function extractIljKeywords(row: AnyRecord) {
  const value = extractMetaValue(row, 'ilj_linkdefinition')

  if (Array.isArray(value)) {
    return uniqueKeywords(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return uniqueKeywords(parsed)
    } catch {
      // Some exports store this as plain text. Fall through to line splitting.
    }

    return uniqueKeywords(trimmed.split(/\r?\n/))
  }

  return []
}

function getWpId(row: AnyRecord) {
  const id = Number(row.id || row.wpId)
  return Number.isFinite(id) && id > 0 ? id : 0
}

function getWpTitle(row: AnyRecord) {
  return cleanText(row.name || row.title?.rendered || row.title || row.slug || row.id)
}

function getWpSlug(row: AnyRecord) {
  return cleanText(row.slug)
}

async function findProductTarget(payload: any, row: AnyRecord): Promise<ProductTarget | null> {
  const wpId = getWpId(row)
  const wpSlug = getWpSlug(row)

  if (wpId) {
    const byWpId = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: {
        wpId: {
          equals: wpId,
        },
      },
    })

    const product = byWpId.docs?.[0]

    if (product?.slug) {
      return {
        id: product.id,
        title: cleanText(product.title || product.name || product.slug),
        slug: cleanText(product.slug),
        wpId: product.wpId,
      }
    }
  }

  if (wpSlug) {
    const bySlug = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: {
        slug: {
          equals: wpSlug,
        },
      },
    })

    const product = bySlug.docs?.[0]

    if (product?.slug) {
      return {
        id: product.id,
        title: cleanText(product.title || product.name || product.slug),
        slug: cleanText(product.slug),
        wpId: product.wpId,
      }
    }
  }

  if (ALLOW_MISSING_TARGET && wpSlug) {
    return {
      id: `wp:${wpId || wpSlug}`,
      title: getWpTitle(row),
      slug: wpSlug,
      wpId: wpId || null,
    }
  }

  return null
}

async function loadExistingRules(payload: any) {
  const byTargetUrl = new Map<string, ExistingRule>()
  const keywordToTarget = new Map<string, string>()
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'internal-link-rules',
      depth: 0,
      limit: 500,
      page,
      overrideAccess: true,
    })

    for (const rule of result.docs as ExistingRule[]) {
      const targetUrl = cleanText(rule.targetUrl)
      const targetKey = normalizeKey(targetUrl)

      if (targetKey) byTargetUrl.set(targetKey, rule)

      for (const item of rule.keywords || []) {
        const keywordKey = normalizeKey(item.keyword)
        if (!keywordKey || !targetKey) continue

        keywordToTarget.set(keywordKey, targetKey)
      }
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return { byTargetUrl, keywordToTarget }
}

function makeTargetUrl(slug: string) {
  return `/products/${slug}/`
}

function makeRuleKeywords(keywords: string[]) {
  return keywords.map((keyword, index) => ({
    keyword,
    matchType: (index === 0 ? 'phrase' : 'contains') as 'phrase' | 'contains',
    weight: Math.max(1, 10 - index),
  }))
}

function appendKeywordsToRule(rule: ExistingRule, keywords: string[]) {
  const existing = rule.keywords || []
  const seen = new Set(existing.map((item) => normalizeKey(item.keyword)))
  const appended = keywords.filter((keyword) => {
    const key = normalizeKey(keyword)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    appended,
    keywords: [
      ...existing.map((item, index) => ({
        keyword: cleanText(item.keyword),
        matchType: item.matchType || (index === 0 ? 'phrase' : 'contains'),
        weight: item.weight || Math.max(1, 10 - index),
      })),
      ...makeRuleKeywords(appended),
    ],
  }
}

async function buildCandidates(payload: any, rows: AnyRecord[]) {
  const candidates: ImportCandidate[] = []
  let scanned = 0
  let noKeywords = 0
  let missingTarget = 0

  for (const row of rows) {
    if (LIMIT && scanned >= LIMIT) break
    scanned += 1

    const keywords = extractIljKeywords(row)

    if (keywords.length === 0) {
      noKeywords += 1
      continue
    }

    const product = await findProductTarget(payload, row)

    if (!product) {
      missingTarget += 1
      console.log(`skip missing product target: ${getWpTitle(row)} (${getWpId(row) || getWpSlug(row)})`)
      continue
    }

    candidates.push({
      wpId: getWpId(row),
      wpTitle: getWpTitle(row),
      wpSlug: getWpSlug(row),
      product,
      targetUrl: makeTargetUrl(product.slug),
      keywords,
    })
  }

  return {
    candidates,
    stats: {
      scanned,
      noKeywords,
      missingTarget,
    },
  }
}

async function run() {
  if (!YES && !hasFlag('--dry-run')) {
    console.error('Lenh nay se import Internal Link Rules tu WooCommerce/WordPress export.')
    console.error('Chay thu truoc:')
    console.error('  npm run import:internal-links:wp -- --dry-run --data=D:\\new\\products.json')
    console.error('Ghi that:')
    console.error('  npm run import:internal-links:wp -- --yes --data=D:\\new\\products.json')
    console.error('Gop keyword vao rule da co cung URL:')
    console.error('  npm run import:internal-links:wp -- --yes --update --data=D:\\new\\products.json')
    process.exit(1)
  }

  const rows = readJsonArray(DATA_PATH)
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const { byTargetUrl, keywordToTarget } = await loadExistingRules(payload)
  const { candidates, stats } = await buildCandidates(payload, rows)

  let created = 0
  let updated = 0
  let skippedExistingTarget = 0
  let skippedKeywordConflict = 0
  let skippedNoUsableKeywords = 0

  console.log('Import Internal Link Rules from WordPress/WooCommerce')
  console.log(`Data file: ${DATA_PATH}`)
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Enabled new rules: ${ENABLED ? 'yes' : 'no'}`)
  console.log(`Update existing target rules: ${UPDATE_EXISTING ? 'yes' : 'no'}`)
  console.log(`Scope: ${DEFAULT_SCOPE.join(', ')}`)
  console.log('')

  for (const candidate of candidates) {
    const targetKey = normalizeKey(candidate.targetUrl)
    const existingRule = byTargetUrl.get(targetKey)
    const usableKeywords = candidate.keywords.filter((keyword) => {
      if (ALLOW_KEYWORD_CONFLICTS) return true

      const keywordKey = normalizeKey(keyword)
      const existingTarget = keywordToTarget.get(keywordKey)

      if (!existingTarget || existingTarget === targetKey) return true

      skippedKeywordConflict += 1
      return false
    })

    if (usableKeywords.length === 0) {
      skippedNoUsableKeywords += 1
      continue
    }

    if (existingRule) {
      if (!UPDATE_EXISTING) {
        skippedExistingTarget += 1
        continue
      }

      const merged = appendKeywordsToRule(existingRule, usableKeywords)

      if (merged.appended.length === 0) {
        skippedExistingTarget += 1
        continue
      }

      updated += 1
      console.log(
        `${DRY_RUN ? '[dry-run] ' : ''}update rule ${existingRule.id}: ${candidate.product.title} +${merged.appended.length} keyword`,
      )

      if (!DRY_RUN) {
        await payload.update({
          collection: 'internal-link-rules',
          id: existingRule.id,
          depth: 0,
          overrideAccess: true,
          data: {
            keywords: merged.keywords,
          },
        })
      }

      for (const keyword of merged.appended) {
        keywordToTarget.set(normalizeKey(keyword), targetKey)
      }

      continue
    }

    created += 1
    console.log(
      `${DRY_RUN ? '[dry-run] ' : ''}create rule: ${candidate.product.title} -> ${candidate.targetUrl} (${usableKeywords.length} keyword)`,
    )

    if (!DRY_RUN) {
      const rule = await payload.create({
        collection: 'internal-link-rules',
        depth: 0,
        overrideAccess: true,
        data: {
          title: `WP ILJ: ${candidate.product.title}`,
          enabled: ENABLED,
          priority: 'product',
          keywords: makeRuleKeywords(usableKeywords),
          targetType: 'product',
          targetUrl: candidate.targetUrl,
          scope: DEFAULT_SCOPE,
          maxInsertionsPerPage: 1,
          totalInsertions: 0,
        },
      })

      byTargetUrl.set(targetKey, rule as ExistingRule)
    }

    for (const keyword of usableKeywords) {
      keywordToTarget.set(normalizeKey(keyword), targetKey)
    }
  }

  console.log('')
  console.log('Done.')
  console.log(`Rows scanned: ${stats.scanned}`)
  console.log(`Rows without ilj_linkdefinition keyword: ${stats.noKeywords}`)
  console.log(`Rows missing Payload product target: ${stats.missingTarget}`)
  console.log(`${DRY_RUN ? 'Would create' : 'Created'}: ${created}`)
  console.log(`${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}`)
  console.log(`Skipped existing target: ${skippedExistingTarget}`)
  console.log(`Skipped keyword conflicts: ${skippedKeywordConflict}`)
  console.log(`Skipped no usable keywords: ${skippedNoUsableKeywords}`)

  if (DRY_RUN) {
    console.log('')
    console.log('Run with --yes to write changes.')
  }
}

run().catch((error) => {
  console.error('Import internal link rules failed:', error)
  process.exit(1)
})
