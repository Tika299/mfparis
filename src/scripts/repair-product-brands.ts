import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { getPayload } from 'payload'

type AnyRecord = Record<string, any>
type ID = string | number

type BrandDoc = {
  id: ID
  name?: string | null
  slug?: string | null
  wpId?: number | null
}

type ProductDoc = {
  id: ID
  title?: string | null
  slug?: string | null
  sku?: string | null
  wpId?: number | null
  sourceUrl?: string | null
  shortDescription?: string | null
  description?: string | null
  brand?: ID | BrandDoc | null
  categories?: unknown
}

type BrandCandidate = {
  brand: BrandDoc
  confidence: number
  source: string
  evidence: string
  needsBrandCreate?: boolean
  exportBrand?: AnyRecord
}

type ScanChange = {
  productId: ID
  wpId?: number | null
  title: string
  slug: string
  currentBrandId?: ID | null
  currentBrandName: string
  currentBrandSlug: string
  nextBrandId?: ID | null
  nextBrandName?: string
  nextBrandSlug?: string
  confidence: number
  source: string
  evidence: string
  status: 'planned' | 'updated' | 'skipped' | 'conflict' | 'failed'
  reason?: string
}

type BackupEntry = {
  productId: ID
  wpId?: number | null
  title: string
  slug: string
  beforeBrandId?: ID | null
  beforeBrandName: string
  beforeBrandSlug: string
  afterBrandId?: ID | null
  afterBrandName?: string
  afterBrandSlug?: string
}

type BackupFile = {
  createdAt: string
  mode: 'product-brand-repair'
  entries: BackupEntry[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const defaultDataDir = path.resolve(__dirname, 'export')
const defaultReportDir = path.resolve(__dirname, 'reports')

function getArg(name: string, fallback = ''): string {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

function hasFlag(name: string): boolean {
  return args.includes(name)
}

const REPAIR = hasFlag('--repair')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const PAGE_SIZE = Math.max(1, Math.min(250, Number(getArg('--page-size', '100')) || 100))
const MIN_CONFIDENCE = Math.max(0, Math.min(100, Number(getArg('--min-confidence', '85')) || 85))
const DATA_DIR = path.resolve(getArg('--data-dir', process.env.WP_IMPORT_DATA_DIR || defaultDataDir))
const REPORT_DIR = path.resolve(getArg('--report-dir', defaultReportDir))
const REPORT_PATH = path.resolve(
  getArg('--report', path.join(REPORT_DIR, `product-brand-repair-${timestamp}.json`)),
)
const CSV_PATH = path.resolve(
  getArg('--csv', path.join(REPORT_DIR, `product-brand-repair-${timestamp}.csv`)),
)
const LOG_PATH = path.resolve(
  getArg('--log', path.join(REPORT_DIR, `product-brand-repair-${timestamp}.log`)),
)
const BACKUP_PATH = path.resolve(
  getArg('--backup', path.join(REPORT_DIR, `product-brand-repair-backup-${timestamp}.json`)),
)
const ROLLBACK_PATH = getArg('--rollback', '')
const INCLUDE_NON_PLACEHOLDER = hasFlag('--include-non-placeholder')
const CREATE_MISSING_BRANDS = !hasFlag('--no-create-missing-brands')

const suspectBrandSlugs = new Set([
  'mf-paris',
  'mfparis',
  'khong-thuong-hieu',
  'khong-co-thuong-hieu',
  'khong-co-brand',
  'thuong-hieu-tam',
  'no-brand',
  'nobrand',
  'unbranded',
  'unknown-brand',
  'unknown',
])

const suspectBrandNames = new Set([
  'mf paris',
  'mfparis',
  'khong thuong hieu',
  'khong co thuong hieu',
  'khong co brand',
  'thuong hieu tam',
  'no brand',
  'unbranded',
  'unknown brand',
  'unknown',
])

const weakSingleWordBrands = new Set([
  'and',
  'brand',
  'by',
  'coach',
  'guess',
  'mancera',
  'montale',
  'once',
  'paris',
  'pink',
  'real',
])

function ensureOutputDir() {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true })
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.mkdirSync(path.dirname(BACKUP_PATH), { recursive: true })
}

function log(message: string) {
  console.log(message)
  fs.appendFileSync(LOG_PATH, `${message}\n`, 'utf8')
}

function normalizeForMatch(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .replace(/&/g, ' and ')
    .replace(/['`]/g, '')
    .replace(/[^0-9a-z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatSlug(value: unknown): string {
  return normalizeForMatch(value).replace(/\s+/g, '-')
}

function stripHTML(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

function decodeBasicEntities(value: unknown): string {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function compact(value: unknown, maxLength = 140): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text
}

function getRelationshipId(value: unknown): ID | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (!value || typeof value !== 'object') {
    return undefined
  }

  const id = (value as AnyRecord).id
  return typeof id === 'string' || typeof id === 'number' ? id : undefined
}

function getCurrentBrand(product: ProductDoc, brandsById: Map<string, BrandDoc>): BrandDoc | undefined {
  const brandId = getRelationshipId(product.brand)
  if (brandId === undefined) {
    return undefined
  }

  if (typeof product.brand === 'object' && product.brand) {
    const brand = product.brand as BrandDoc
    return {
      id: brandId,
      name: brand.name,
      slug: brand.slug,
      wpId: brand.wpId,
    }
  }

  return brandsById.get(String(brandId))
}

function isSuspectBrand(brand?: BrandDoc): boolean {
  if (!brand) {
    return true
  }

  const slug = formatSlug(brand.slug || brand.name || '')
  const name = normalizeForMatch(brand.name || brand.slug || '')

  return suspectBrandSlugs.has(slug) || suspectBrandNames.has(name)
}

function readJSON<T>(filename: string, fallback: T): T {
  const filePath = path.resolve(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    return fallback
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function addBrandAlias(map: Map<string, BrandDoc>, key: unknown, brand: BrandDoc) {
  const normalized = normalizeForMatch(key)
  if (normalized) {
    map.set(normalized, brand)
  }

  const slug = formatSlug(key)
  if (slug) {
    map.set(slug, brand)
  }
}

async function loadAll(payload: any, collection: string): Promise<AnyRecord[]> {
  const docs: AnyRecord[] = []
  let page = 1

  while (true) {
    const result = await payload.find({
      collection,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    docs.push(...result.docs)

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return docs
}

function buildBrandIndexes(brandDocs: BrandDoc[], exportBrands: AnyRecord[]) {
  const byId = new Map<string, BrandDoc>()
  const byWpId = new Map<number, BrandDoc>()
  const byAlias = new Map<string, BrandDoc>()
  const exportByWpId = new Map<number, AnyRecord>()
  const exportByAlias = new Map<string, AnyRecord>()

  for (const brand of brandDocs) {
    byId.set(String(brand.id), brand)
    if (brand.wpId) {
      byWpId.set(Number(brand.wpId), brand)
    }
    addBrandAlias(byAlias, brand.name, brand)
    addBrandAlias(byAlias, brand.slug, brand)
  }

  for (const item of exportBrands) {
    const wpId = Number(item.id)
    if (Number.isFinite(wpId) && wpId > 0) {
      exportByWpId.set(wpId, item)
    }
    if (item.name) {
      exportByAlias.set(normalizeForMatch(item.name), item)
    }
    if (item.slug) {
      exportByAlias.set(formatSlug(item.slug), item)
    }

    const existing =
      byWpId.get(wpId) ||
      byAlias.get(normalizeForMatch(item.name)) ||
      byAlias.get(formatSlug(item.slug || item.name))

    if (existing) {
      addBrandAlias(byAlias, item.name, existing)
      addBrandAlias(byAlias, item.slug, existing)
      if (Number.isFinite(wpId) && wpId > 0) {
        byWpId.set(wpId, existing)
      }
    }
  }

  return { byId, byWpId, byAlias, exportByWpId, exportByAlias }
}

function buildRawProductIndexes(rawProducts: AnyRecord[]) {
  const byWpId = new Map<number, AnyRecord>()
  const bySlug = new Map<string, AnyRecord>()

  for (const product of rawProducts) {
    const wpId = Number(product.id)
    if (Number.isFinite(wpId) && wpId > 0) {
      byWpId.set(wpId, product)
    }

    const slug = formatSlug(product.slug || product.name)
    if (slug) {
      bySlug.set(slug, product)
    }
  }

  return { byWpId, bySlug }
}

function findBrandByNameOrSlug(
  value: unknown,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
): BrandDoc | undefined {
  return (
    brandIndexes.byAlias.get(normalizeForMatch(value)) ||
    brandIndexes.byAlias.get(formatSlug(value))
  )
}

function findExportBrandByNameOrSlug(
  value: unknown,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
): AnyRecord | undefined {
  return (
    brandIndexes.exportByAlias.get(normalizeForMatch(value)) ||
    brandIndexes.exportByAlias.get(formatSlug(value))
  )
}

function candidateFromExportBrand(
  rawBrand: AnyRecord,
  source: string,
  confidence: number,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
): BrandCandidate | undefined {
  const wpId = Number(rawBrand?.id)
  const exportBrand = Number.isFinite(wpId) ? brandIndexes.exportByWpId.get(wpId) : undefined
  const brand =
    (Number.isFinite(wpId) ? brandIndexes.byWpId.get(wpId) : undefined) ||
    findBrandByNameOrSlug(rawBrand?.slug || rawBrand?.name, brandIndexes)

  if (!brand || isSuspectBrand(brand)) {
    const name = decodeBasicEntities(exportBrand?.name || rawBrand?.name || rawBrand?.slug)
    const slug = formatSlug(exportBrand?.slug || rawBrand?.slug || name)

    if (!name || suspectBrandSlugs.has(slug) || suspectBrandNames.has(normalizeForMatch(name))) {
      return undefined
    }

    return {
      brand: {
        id: `missing:${Number.isFinite(wpId) ? wpId : slug}`,
        name,
        slug,
        wpId: Number.isFinite(wpId) ? wpId : undefined,
      },
      confidence,
      source,
      evidence: compact(name || slug),
      needsBrandCreate: true,
      exportBrand: exportBrand || rawBrand,
    }
  }

  return {
    brand,
    confidence,
    source,
    evidence: compact(rawBrand?.name || rawBrand?.slug || rawBrand?.id),
  }
}

function getMetaValue(rawProduct: AnyRecord, key: string): unknown {
  const meta = Array.isArray(rawProduct?.meta_data) ? rawProduct.meta_data : []
  return meta.find((item: AnyRecord) => item?.key === key)?.value
}

function inferFromRawProduct(
  rawProduct: AnyRecord | undefined,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
): BrandCandidate[] {
  const candidates: BrandCandidate[] = []

  if (!rawProduct) {
    return candidates
  }

  const rawBrands = Array.isArray(rawProduct.brands) ? rawProduct.brands : []
  for (const rawBrand of rawBrands) {
    const candidate = candidateFromExportBrand(rawBrand, 'rawProduct.brands', 100, brandIndexes)
    if (candidate) {
      candidates.push(candidate)
    }
  }

  const rankMathBrandId = Number(getMetaValue(rawProduct, 'rank_math_primary_product_brand'))
  if (Number.isFinite(rankMathBrandId) && rankMathBrandId > 0) {
    const exportBrand = brandIndexes.exportByWpId.get(rankMathBrandId)
    const brand = brandIndexes.byWpId.get(rankMathBrandId)
    if (brand && !isSuspectBrand(brand)) {
      candidates.push({
        brand,
        confidence: 95,
        source: 'meta.rank_math_primary_product_brand',
        evidence: compact(exportBrand?.name || rankMathBrandId),
      })
    } else if (exportBrand) {
      const candidate = candidateFromExportBrand(
        exportBrand,
        'meta.rank_math_primary_product_brand',
        95,
        brandIndexes,
      )
      if (candidate) {
        candidates.push(candidate)
      }
    }
  }

  const bsfBrand = getMetaValue(rawProduct, '_bsf_product_brand')
  if (bsfBrand) {
    const brand = findBrandByNameOrSlug(bsfBrand, brandIndexes)
    if (brand && !isSuspectBrand(brand)) {
      candidates.push({
        brand,
        confidence: 88,
        source: 'meta._bsf_product_brand',
        evidence: compact(bsfBrand),
      })
    } else {
      const exportBrand = findExportBrandByNameOrSlug(bsfBrand, brandIndexes)
      if (exportBrand) {
        const candidate = candidateFromExportBrand(
          exportBrand,
          'meta._bsf_product_brand',
          88,
          brandIndexes,
        )
        if (candidate) {
          candidates.push(candidate)
        }
      }
    }
  }

  const attributes = Array.isArray(rawProduct.attributes) ? rawProduct.attributes : []
  for (const attribute of attributes) {
    const key = normalizeForMatch(`${attribute?.name || ''} ${attribute?.slug || ''}`)
    if (!key.includes('thuong hieu') && !key.includes('brand')) {
      continue
    }

    const options = Array.isArray(attribute.options) ? attribute.options : []
    for (const option of options) {
      const brand = findBrandByNameOrSlug(option, brandIndexes)
      if (brand && !isSuspectBrand(brand)) {
        candidates.push({
          brand,
          confidence: 90,
          source: 'attribute.pa_thuong-hieu',
          evidence: compact(option),
        })
      } else {
        const exportBrand = findExportBrandByNameOrSlug(option, brandIndexes)
        if (exportBrand) {
          const candidate = candidateFromExportBrand(
            exportBrand,
            'attribute.pa_thuong-hieu',
            90,
            brandIndexes,
          )
          if (candidate) {
            candidates.push(candidate)
          }
        }
      }
    }
  }

  const description = String(rawProduct.description || rawProduct.short_description || '')
  const brandLinkMatch = description.match(/\/thuong-hieu\/([a-z0-9-]+)\//i)
  if (brandLinkMatch?.[1]) {
    const brand = findBrandByNameOrSlug(brandLinkMatch[1], brandIndexes)
    if (brand && !isSuspectBrand(brand)) {
      candidates.push({
        brand,
        confidence: 92,
        source: 'description.brand_link',
        evidence: `/thuong-hieu/${brandLinkMatch[1]}/`,
      })
    }
  }

  return candidates
}

function textContainsBrand(text: string, brandName: string): boolean {
  if (!text || !brandName) {
    return false
  }

  const paddedText = ` ${text} `
  const paddedBrand = ` ${brandName} `
  return paddedText.includes(paddedBrand)
}

function inferFromProductText(product: ProductDoc, brandDocs: BrandDoc[]): BrandCandidate[] {
  const title = normalizeForMatch(product.title)
  const slug = normalizeForMatch(product.slug)
  const sku = normalizeForMatch(product.sku)
  const description = normalizeForMatch(`${product.shortDescription || ''} ${stripHTML(product.description)}`)
  const candidates: BrandCandidate[] = []

  for (const brand of brandDocs) {
    if (isSuspectBrand(brand)) {
      continue
    }

    const name = normalizeForMatch(brand.name || brand.slug)
    const slugName = normalizeForMatch(brand.slug || brand.name)
    const nameWords = name.split(' ').filter(Boolean)
    const singleWeakName = nameWords.length === 1 && weakSingleWordBrands.has(nameWords[0])

    if (!name || singleWeakName || name.length < 4) {
      continue
    }

    if (title.startsWith(`${name} `) || slug.startsWith(`${slugName} `)) {
      candidates.push({
        brand,
        confidence: nameWords.length > 1 ? 87 : 85,
        source: 'product.title_or_slug_prefix',
        evidence: brand.name || brand.slug || '',
      })
      continue
    }

    if (nameWords.length > 1 && (textContainsBrand(title, name) || textContainsBrand(slug, slugName))) {
      candidates.push({
        brand,
        confidence: 86,
        source: 'product.title_or_slug_contains',
        evidence: brand.name || brand.slug || '',
      })
      continue
    }

    if (sku && sku.startsWith(`${slugName}-`)) {
      candidates.push({
        brand,
        confidence: 84,
        source: 'product.sku_prefix',
        evidence: product.sku || '',
      })
      continue
    }

    if (nameWords.length > 1 && textContainsBrand(description, name)) {
      candidates.push({
        brand,
        confidence: 70,
        source: 'product.description_contains',
        evidence: brand.name || brand.slug || '',
      })
    }
  }

  return candidates
}

function chooseCandidate(candidates: BrandCandidate[]): BrandCandidate | undefined {
  const byBrand = new Map<string, BrandCandidate>()

  for (const candidate of candidates) {
    const key = String(candidate.brand.id)
    const existing = byBrand.get(key)
    if (!existing || candidate.confidence > existing.confidence) {
      byBrand.set(key, candidate)
    }
  }

  const unique = Array.from(byBrand.values()).sort((a, b) => b.confidence - a.confidence)
  const top = unique[0]
  const second = unique[1]

  if (!top) {
    return undefined
  }

  if (second && top.confidence === second.confidence && String(top.brand.id) !== String(second.brand.id)) {
    return undefined
  }

  return top
}

function findRawProduct(
  product: ProductDoc,
  rawIndexes: ReturnType<typeof buildRawProductIndexes>,
): AnyRecord | undefined {
  const wpId = Number(product.wpId || product.sku)
  if (Number.isFinite(wpId) && wpId > 0) {
    const byId = rawIndexes.byWpId.get(wpId)
    if (byId) {
      return byId
    }
  }

  return rawIndexes.bySlug.get(formatSlug(product.slug || product.title))
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function writeCsv(changes: ScanChange[]) {
  const headers = [
    'status',
    'productId',
    'wpId',
    'title',
    'slug',
    'currentBrand',
    'nextBrand',
    'confidence',
    'source',
    'reason',
    'evidence',
  ]

  const rows = changes.map((change) => [
    change.status,
    change.productId,
    change.wpId || '',
    change.title,
    change.slug,
    change.currentBrandName,
    change.nextBrandName || '',
    change.confidence,
    change.source,
    change.reason || '',
    change.evidence,
  ])

  fs.writeFileSync(
    CSV_PATH,
    [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'),
    'utf8',
  )
}

function getExportBrandSourceUrl(exportBrand: AnyRecord | undefined): string | undefined {
  return (
    exportBrand?.link ||
    exportBrand?._links?.self?.[0]?.href ||
    exportBrand?.sourceUrl ||
    undefined
  )
}

function indexCreatedBrand(
  brand: BrandDoc,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
) {
  brandIndexes.byId.set(String(brand.id), brand)
  if (brand.wpId) {
    brandIndexes.byWpId.set(Number(brand.wpId), brand)
  }
  addBrandAlias(brandIndexes.byAlias, brand.name, brand)
  addBrandAlias(brandIndexes.byAlias, brand.slug, brand)
}

async function ensureRepairBrand(
  payload: any,
  candidate: BrandCandidate,
  brandIndexes: ReturnType<typeof buildBrandIndexes>,
): Promise<BrandDoc> {
  if (!candidate.needsBrandCreate) {
    return candidate.brand
  }

  const existing =
    (candidate.brand.wpId ? brandIndexes.byWpId.get(Number(candidate.brand.wpId)) : undefined) ||
    findBrandByNameOrSlug(candidate.brand.slug || candidate.brand.name, brandIndexes)

  if (existing) {
    return existing
  }

  if (!CREATE_MISSING_BRANDS) {
    throw new Error('Replacement brand is missing in Payload. Run without --no-create-missing-brands.')
  }

  const exportBrand = candidate.exportBrand
  const name = decodeBasicEntities(candidate.brand.name || exportBrand?.name || candidate.brand.slug)
  const slug = formatSlug(candidate.brand.slug || exportBrand?.slug || name)
  const wpId = Number(candidate.brand.wpId || exportBrand?.id)
  const data = {
    name,
    slug,
    description:
      typeof exportBrand?.description === 'string'
        ? exportBrand.description
        : undefined,
    isFeatured: Boolean(exportBrand?.count && Number(exportBrand.count) > 0),
    wpId: Number.isFinite(wpId) && wpId > 0 ? wpId : undefined,
    sourceUrl: getExportBrandSourceUrl(exportBrand),
  }

  const created = await payload.create({
    collection: 'brands',
    data,
    depth: 0,
    overrideAccess: true,
  })

  const brand: BrandDoc = {
    id: created.id,
    name: created.name || name,
    slug: created.slug || slug,
    wpId: created.wpId || data.wpId,
  }

  indexCreatedBrand(brand, brandIndexes)
  return brand
}

async function scanAndRepair(payload: any) {
  const exportBrands = readJSON<AnyRecord[]>('brands.merged.json', readJSON<AnyRecord[]>('brands.json', []))
  const rawProducts = readJSON<AnyRecord[]>('products-with-variations.json', [])
  const brandDocs = (await loadAll(payload, 'brands')) as BrandDoc[]
  const brandIndexes = buildBrandIndexes(brandDocs, exportBrands)
  const rawIndexes = buildRawProductIndexes(rawProducts)
  const changes: ScanChange[] = []
  const backupEntries: BackupEntry[] = []

  let page = 1
  let scanned = 0
  let suspect = 0
  let eligible = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  log('Product brand scanner/repair')
  log(`Mode: ${REPAIR ? 'repair' : 'dry-run'}`)
  log(`Min confidence: ${MIN_CONFIDENCE}`)
  log(`Create missing brands: ${CREATE_MISSING_BRANDS ? 'yes' : 'no'}`)
  log(`Data dir: ${DATA_DIR}`)

  while (true) {
    const result = await payload.find({
      collection: 'products',
      depth: 1,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const product of result.docs as ProductDoc[]) {
      if (LIMIT > 0 && scanned >= LIMIT) {
        break
      }

      scanned += 1
      const currentBrand = getCurrentBrand(product, brandIndexes.byId)
      const suspectCurrentBrand = isSuspectBrand(currentBrand)
      const rawProduct = findRawProduct(product, rawIndexes)
      const candidates = [
        ...inferFromRawProduct(rawProduct, brandIndexes),
        ...inferFromProductText(product, brandDocs),
      ]
      const candidate = chooseCandidate(candidates)
      const title = product.title || product.slug || String(product.id)
      const slug = product.slug || ''
      const currentBrandName = currentBrand?.name || '(missing)'
      const currentBrandSlug = currentBrand?.slug || ''

      if (!suspectCurrentBrand && !INCLUDE_NON_PLACEHOLDER) {
        if (candidate && String(candidate.brand.id) !== String(currentBrand?.id)) {
          changes.push({
            productId: product.id,
            wpId: product.wpId,
            title,
            slug,
            currentBrandId: currentBrand?.id,
            currentBrandName,
            currentBrandSlug,
            nextBrandId: candidate.brand.id,
            nextBrandName: candidate.brand.name || '',
            nextBrandSlug: candidate.brand.slug || '',
            confidence: candidate.confidence,
            source: candidate.source,
            evidence: candidate.evidence,
            status: 'conflict',
            reason: 'Current brand is not a placeholder; report only.',
          })
        }

        continue
      }

      suspect += 1

      if (!candidate) {
        skipped += 1
        changes.push({
          productId: product.id,
          wpId: product.wpId,
          title,
          slug,
          currentBrandId: currentBrand?.id,
          currentBrandName,
          currentBrandSlug,
          confidence: 0,
          source: 'none',
          evidence: rawProduct ? 'raw product found but no safe brand signal' : 'no matching raw import product',
          status: 'skipped',
          reason: 'No reliable replacement brand found.',
        })
        continue
      }

      if (String(candidate.brand.id) === String(currentBrand?.id)) {
        skipped += 1
        changes.push({
          productId: product.id,
          wpId: product.wpId,
          title,
          slug,
          currentBrandId: currentBrand?.id,
          currentBrandName,
          currentBrandSlug,
          nextBrandId: candidate.brand.id,
          nextBrandName: candidate.brand.name || '',
          nextBrandSlug: candidate.brand.slug || '',
          confidence: candidate.confidence,
          source: candidate.source,
          evidence: candidate.evidence,
          status: 'skipped',
          reason: 'Candidate equals current brand.',
        })
        continue
      }

      if (candidate.confidence < MIN_CONFIDENCE) {
        skipped += 1
        changes.push({
          productId: product.id,
          wpId: product.wpId,
          title,
          slug,
          currentBrandId: currentBrand?.id,
          currentBrandName,
          currentBrandSlug,
          nextBrandId: candidate.brand.id,
          nextBrandName: candidate.brand.name || '',
          nextBrandSlug: candidate.brand.slug || '',
          confidence: candidate.confidence,
          source: candidate.source,
          evidence: candidate.evidence,
          status: 'skipped',
          reason: `Confidence below --min-confidence=${MIN_CONFIDENCE}.`,
        })
        continue
      }

      if (candidate.needsBrandCreate && !CREATE_MISSING_BRANDS) {
        skipped += 1
        changes.push({
          productId: product.id,
          wpId: product.wpId,
          title,
          slug,
          currentBrandId: currentBrand?.id,
          currentBrandName,
          currentBrandSlug,
          nextBrandId: null,
          nextBrandName: candidate.brand.name || '',
          nextBrandSlug: candidate.brand.slug || '',
          confidence: candidate.confidence,
          source: candidate.source,
          evidence: candidate.evidence,
          status: 'skipped',
          reason: 'Replacement brand is missing in Payload and --no-create-missing-brands was set.',
        })
        continue
      }

      eligible += 1
      const planned: ScanChange = {
        productId: product.id,
        wpId: product.wpId,
        title,
        slug,
        currentBrandId: currentBrand?.id,
        currentBrandName,
        currentBrandSlug,
        nextBrandId: candidate.brand.id,
        nextBrandName: candidate.brand.name || '',
        nextBrandSlug: candidate.brand.slug || '',
        confidence: candidate.confidence,
        source: candidate.source,
        evidence: candidate.evidence,
        reason: candidate.needsBrandCreate ? 'Replacement brand will be created from import export data.' : undefined,
        status: REPAIR ? 'updated' : 'planned',
      }

      backupEntries.push({
        productId: product.id,
        wpId: product.wpId,
        title,
        slug,
        beforeBrandId: currentBrand?.id,
        beforeBrandName: currentBrandName,
        beforeBrandSlug: currentBrandSlug,
        afterBrandId: candidate.brand.id,
        afterBrandName: candidate.brand.name || '',
        afterBrandSlug: candidate.brand.slug || '',
      })

      log(
        `${REPAIR ? '[repair]' : '[dry-run]'} #${product.id} ${compact(title, 90)}: ${currentBrandName} -> ${
          candidate.brand.name || candidate.brand.slug || candidate.brand.id
        } (${candidate.confidence}, ${candidate.source})`,
      )

      if (REPAIR) {
        try {
          const repairBrand = await ensureRepairBrand(payload, candidate, brandIndexes)
          planned.nextBrandId = repairBrand.id
          planned.nextBrandName = repairBrand.name || ''
          planned.nextBrandSlug = repairBrand.slug || ''

          await payload.update({
            collection: 'products',
            id: product.id,
            data: {
              brand: repairBrand.id,
            },
            depth: 0,
            overrideAccess: true,
          })
          updated += 1
        } catch (error) {
          failed += 1
          planned.status = 'failed'
          planned.reason = error instanceof Error ? error.message : String(error)
          log(`   failed #${product.id}: ${planned.reason}`)
        }
      }

      changes.push(planned)
    }

    if (!result.hasNextPage || (LIMIT > 0 && scanned >= LIMIT)) {
      break
    }

    page += 1
  }

  const backup: BackupFile = {
    createdAt: new Date().toISOString(),
    mode: 'product-brand-repair',
    entries: backupEntries,
  }

  if (REPAIR && backupEntries.length > 0) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), 'utf8')
  }

  const report = {
    createdAt: new Date().toISOString(),
    mode: REPAIR ? 'repair' : 'dry-run',
    minConfidence: MIN_CONFIDENCE,
    dataDir: DATA_DIR,
    scanned,
    suspect,
    eligible,
    updated,
    skipped,
    failed,
    reportPath: REPORT_PATH,
    csvPath: CSV_PATH,
    logPath: LOG_PATH,
    backupPath: REPAIR && backupEntries.length > 0 ? BACKUP_PATH : null,
    changes,
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  writeCsv(changes)

  log('')
  log('Done.')
  log(`Scanned: ${scanned}`)
  log(`Suspect placeholder/no-brand products: ${suspect}`)
  log(`${REPAIR ? 'Updated' : 'Would update'}: ${REPAIR ? updated : eligible}`)
  log(`Skipped: ${skipped}`)
  log(`Failed: ${failed}`)
  log(`Report: ${REPORT_PATH}`)
  log(`CSV: ${CSV_PATH}`)
  log(`Log: ${LOG_PATH}`)
  if (REPAIR && backupEntries.length > 0) {
    log(`Backup: ${BACKUP_PATH}`)
    log(`Rollback dry-run: npm run repair:product-brands -- --rollback="${BACKUP_PATH}"`)
    log(`Rollback write: npm run repair:product-brands -- --rollback="${BACKUP_PATH}" --repair`)
  } else if (!REPAIR) {
    log('Run with --repair to write eligible changes.')
  }
}

async function rollback(payload: any, backupFilePath: string) {
  const resolvedBackupPath = path.resolve(backupFilePath)
  const backup = JSON.parse(fs.readFileSync(resolvedBackupPath, 'utf8')) as BackupFile

  if (backup.mode !== 'product-brand-repair' || !Array.isArray(backup.entries)) {
    throw new Error('Invalid product brand repair backup file.')
  }

  log('Product brand rollback')
  log(`Mode: ${REPAIR ? 'repair' : 'dry-run'}`)
  log(`Backup: ${resolvedBackupPath}`)

  let restored = 0
  let failed = 0
  const changes: ScanChange[] = []

  for (const entry of backup.entries) {
    const change: ScanChange = {
      productId: entry.productId,
      wpId: entry.wpId,
      title: entry.title,
      slug: entry.slug,
      currentBrandId: entry.afterBrandId,
      currentBrandName: entry.afterBrandName || '',
      currentBrandSlug: entry.afterBrandSlug || '',
      nextBrandId: entry.beforeBrandId,
      nextBrandName: entry.beforeBrandName,
      nextBrandSlug: entry.beforeBrandSlug,
      confidence: 100,
      source: 'rollback.backup',
      evidence: resolvedBackupPath,
      status: REPAIR ? 'updated' : 'planned',
    }

    log(
      `${REPAIR ? '[rollback]' : '[dry-run rollback]'} #${entry.productId} ${compact(entry.title, 90)}: ${
        entry.afterBrandName || entry.afterBrandId
      } -> ${entry.beforeBrandName || entry.beforeBrandId}`,
    )

    if (REPAIR) {
      if (entry.beforeBrandId === undefined || entry.beforeBrandId === null) {
        change.status = 'skipped'
        change.reason = 'Backup has no previous brand id.'
      } else {
        try {
          await payload.update({
            collection: 'products',
            id: entry.productId,
            data: {
              brand: entry.beforeBrandId,
            },
            depth: 0,
            overrideAccess: true,
          })
          restored += 1
        } catch (error) {
          failed += 1
          change.status = 'failed'
          change.reason = error instanceof Error ? error.message : String(error)
          log(`   failed #${entry.productId}: ${change.reason}`)
        }
      }
    }

    changes.push(change)
  }

  const report = {
    createdAt: new Date().toISOString(),
    mode: REPAIR ? 'rollback' : 'rollback-dry-run',
    backup: resolvedBackupPath,
    restored,
    failed,
    changes,
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  writeCsv(changes)

  log('')
  log('Rollback done.')
  log(`${REPAIR ? 'Restored' : 'Would restore'}: ${REPAIR ? restored : backup.entries.length}`)
  log(`Failed: ${failed}`)
  log(`Report: ${REPORT_PATH}`)
}

async function main() {
  ensureOutputDir()
  fs.writeFileSync(LOG_PATH, '', 'utf8')

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  if (ROLLBACK_PATH) {
    await rollback(payload, ROLLBACK_PATH)
    return
  }

  await scanAndRepair(payload)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    try {
      ensureOutputDir()
      fs.appendFileSync(LOG_PATH, `${message}\n`, 'utf8')
    } catch {
      // ignore logging errors during fatal failure
    }
    console.error('Product brand repair failed:', message)
    process.exit(1)
  })
