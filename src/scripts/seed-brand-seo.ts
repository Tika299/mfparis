import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const args = new Set(process.argv.slice(2))
const DRY_RUN = !args.has('--yes')
const OVERWRITE = args.has('--overwrite')

type SeoRecord = {
  metaTitle?: string | null
  metaDescription?: string | null
  focusKeyword?: string | null
  breadcrumbLabel?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  robotsIndex?: 'index' | 'noindex' | null
  robotsFollow?: 'follow' | 'nofollow' | null
  sitemapInclude?: boolean | null
  sitemapPriority?: number | null
  sitemapChangeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | null
  schemaType?: 'auto' | 'CollectionPage' | 'WebPage' | 'none' | null
  [key: string]: unknown
}

type BrandDoc = {
  id: number | string
  name?: string | null
  description?: unknown
  h1Override?: string | null
  seo?: SeoRecord | null
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength - 1).trim() + '…'
}

function hasValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function buildMetaTitle(name: string): string {
  const preferred = name + ' Chính Hãng | MF Paris'
  if (preferred.length <= 60) return preferred
  return truncate(name + ' | MF Paris', 60)
}

function buildMetaDescription(name: string, description: unknown): string {
  const source = cleanText(description)
  if (source.length >= 80) return truncate(source, 158)
  return truncate(
    'Khám phá sản phẩm ' + name + ' chính hãng tại MF Paris. Xem thông tin, giá bán và lựa chọn sản phẩm phù hợp.',
    158,
  )
}

function buildSeo(brand: BrandDoc, hasPublishedProducts: boolean): SeoRecord {
  const name = cleanText(brand.name) || 'Thương hiệu'
  const current = brand.seo ?? {}
  const generatedTitle = buildMetaTitle(name)
  const generatedDescription = buildMetaDescription(name, brand.description)

  return {
    ...current,
    metaTitle: OVERWRITE || !hasValue(current.metaTitle) ? generatedTitle : current.metaTitle,
    metaDescription: OVERWRITE || !hasValue(current.metaDescription)
      ? generatedDescription
      : current.metaDescription,
    focusKeyword: OVERWRITE || !hasValue(current.focusKeyword)
      ? name + ' chính hãng'
      : current.focusKeyword,
    breadcrumbLabel: OVERWRITE || !hasValue(current.breadcrumbLabel)
      ? name
      : current.breadcrumbLabel,
    ogTitle: OVERWRITE || !hasValue(current.ogTitle) ? generatedTitle : current.ogTitle,
    ogDescription: OVERWRITE || !hasValue(current.ogDescription)
      ? generatedDescription
      : current.ogDescription,
    robotsIndex: hasPublishedProducts
      ? current.robotsIndex === 'noindex' ? 'noindex' : 'index'
      : 'noindex',
    robotsFollow: current.robotsFollow === 'nofollow' ? 'nofollow' : 'follow',
    sitemapInclude: hasPublishedProducts && current.sitemapInclude !== false,
    sitemapPriority: hasPublishedProducts
      ? (typeof current.sitemapPriority === 'number' ? current.sitemapPriority : 0.7)
      : null,
    sitemapChangeFrequency: current.sitemapChangeFrequency || 'weekly',
    schemaType: current.schemaType && current.schemaType !== 'auto'
      ? current.schemaType
      : 'CollectionPage',
  }
}

async function hasPublishedProducts(payload: any, brandID: number | string): Promise<boolean> {
  const result = await payload.find({
    collection: 'products',
    where: {
      and: [
        { brand: { equals: brandID } },
        { status: { equals: 'published' } },
      ],
    },
    depth: 0,
    limit: 1,
    pagination: false,
    select: { id: true },
  })

  return result.docs.length > 0
}

function changedKeys(brand: BrandDoc, nextSeo: SeoRecord, nextH1: string): string[] {
  const currentSeo = brand.seo ?? {}
  const keys = Object.keys(nextSeo).filter((key) => (
    JSON.stringify(currentSeo[key]) !== JSON.stringify(nextSeo[key])
  ))

  if ((brand.h1Override || '').trim() !== nextH1) keys.push('h1Override')
  return keys
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'brands',
    depth: 0,
    limit: 1000,
    pagination: false,
    sort: 'id',
  })

  const brands = result.docs as BrandDoc[]
  let updated = 0
  let indexable = 0
  let noindex = 0
  let unchanged = 0

  console.log('Seed SEO brands')
  console.log('Dry run: ' + (DRY_RUN ? 'yes' : 'no'))
  console.log('Overwrite custom SEO: ' + (OVERWRITE ? 'yes' : 'no'))
  console.log('Brands: ' + brands.length)

  for (const brand of brands) {
    const name = cleanText(brand.name) || '#' + brand.id
    const hasProducts = await hasPublishedProducts(payload, brand.id)
    const nextSeo = buildSeo(brand, hasProducts)
    const nextH1 = hasValue(brand.h1Override)
      ? String(brand.h1Override).trim()
      : name + ' Chính Hãng'
    const keys = changedKeys(brand, nextSeo, nextH1)

    if (!hasProducts) noindex += 1
    else indexable += 1

    if (keys.length === 0) {
      unchanged += 1
      continue
    }

    updated += 1
    if (updated <= 20) {
      console.log((DRY_RUN ? '[dry-run] ' : '') + name + ' (#' + brand.id + ') → ' + (hasProducts ? 'index' : 'noindex') + ': ' + keys.join(', '))
    }

    if (!DRY_RUN) {
      await payload.update({
        collection: 'brands',
        id: brand.id,
        data: {
          h1Override: nextH1,
          seo: nextSeo,
        },
        overrideAccess: true,
      })
    }
  }

  console.log('\nHoàn tất seed SEO brands.')
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    overwrite: OVERWRITE,
    scanned: brands.length,
    updated,
    unchanged,
    indexable,
    noindex,
  }, null, 2))

  if (DRY_RUN) {
    console.log('\nChạy lại với --yes để ghi thay đổi. Dùng thêm --overwrite nếu muốn thay thế cả metadata tùy chỉnh hiện có.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})