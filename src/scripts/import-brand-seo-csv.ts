import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { parseCsv } from '@/lib/content-excel/workbook'

type SeoRecord = Record<string, unknown> & {
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
  sitemapChangeFrequency?: string | null
  schemaType?: string | null
}

type BrandRow = Record<string, string>

const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--yes')
const fileArg = args.find((arg) => arg.startsWith('--file='))?.slice('--file='.length)
const filePath = resolve(fileArg || 'brands-seo-import.csv')

function cleanText(value: unknown) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function stableJson(value: unknown) {
  return JSON.stringify(value ?? null)
}

function parseSeo(row: BrandRow, rowNumber: number): SeoRecord {
  const raw = String(row.seo || '').trim()
  if (!raw) throw new Error(`Dòng ${rowNumber}: thiếu trường seo`)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Dòng ${rowNumber}: trường seo không phải JSON hợp lệ`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Dòng ${rowNumber}: trường seo phải là object JSON`)
  }

  return parsed as SeoRecord
}

async function hasPublishedProducts(payload: any, brandId: string | number) {
  const result = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    select: { id: true },
    where: {
      and: [
        { brand: { equals: brandId } },
        { status: { equals: 'published' } },
      ],
    },
  })

  return result.docs.length > 0
}

function buildNextSeo(csvSeo: SeoRecord, hasProducts: boolean): SeoRecord {
  const next = { ...csvSeo }

  if (csvSeo.robotsIndex !== 'noindex') {
    next.robotsIndex = hasProducts ? 'index' : 'noindex'
  }

  next.robotsFollow = csvSeo.robotsFollow === 'nofollow' ? 'nofollow' : 'follow'
  next.sitemapInclude = hasProducts && csvSeo.sitemapInclude !== false
  next.sitemapPriority = hasProducts
    ? (typeof csvSeo.sitemapPriority === 'number' ? csvSeo.sitemapPriority : 0.7)
    : null
  next.sitemapChangeFrequency = csvSeo.sitemapChangeFrequency || 'weekly'
  next.schemaType = csvSeo.schemaType && csvSeo.schemaType !== 'auto'
    ? csvSeo.schemaType
    : 'CollectionPage'

  return next
}

async function main() {
  const csv = await readFile(filePath, 'utf8')
  const rows = parseCsv(csv) as BrandRow[]
  const payload = await getPayload({ config: configPromise })
  const seen = new Set<string>()
  let changed = 0
  let unchanged = 0
  let failed = 0

  console.log('Import brand SEO CSV')
  console.log('File: ' + filePath)
  console.log('Dry run: ' + (DRY_RUN ? 'yes' : 'no'))
  console.log('Rows: ' + rows.length)

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const rowNumber = index + 2
    const id = String(row.id || '').trim()
    const slug = String(row.slug || '').trim()
    const key = id || slug

    try {
      if (String(row.__collection || 'brands').trim() !== 'brands') {
        throw new Error('không phải collection brands')
      }
      if (!key) throw new Error('thiếu id hoặc slug')
      if (seen.has(key)) throw new Error('id/slug bị trùng trong CSV')
      seen.add(key)

      const brand = id
        ? await payload.findByID({ collection: 'brands', id, depth: 0, overrideAccess: true })
        : (await payload.find({
            collection: 'brands',
            depth: 0,
            limit: 1,
            pagination: false,
            overrideAccess: true,
            where: { slug: { equals: slug } },
          })).docs[0]

      if (!brand) throw new Error('không tìm thấy brand trong database')

      const csvSeo = parseSeo(row, rowNumber)
      const hasProducts = await hasPublishedProducts(payload, brand.id)
      const nextSeo = buildNextSeo(csvSeo, hasProducts)
      const nextH1 = cleanText(row.h1Override) || cleanText((brand as any).h1Override)
      const data: Record<string, unknown> = {}

      if (stableJson((brand as any).seo) !== stableJson(nextSeo)) data.seo = nextSeo
      if (nextH1 && nextH1 !== cleanText((brand as any).h1Override)) data.h1Override = nextH1

      if (Object.keys(data).length === 0) {
        unchanged += 1
        continue
      }

      changed += 1
      if (changed <= 20) {
        console.log(`${DRY_RUN ? '[dry-run] ' : ''}${(brand as any).name || key} (#${brand.id}) → ${Object.keys(data).join(', ')}`)
      }

      if (!DRY_RUN) {
        await payload.update({
          collection: 'brands',
          id: brand.id,
          data,
          depth: 0,
          overrideAccess: true,
        })
      }
    } catch (error) {
      failed += 1
      console.error(`Dòng ${rowNumber} (${key || 'unknown'}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('\nHoàn tất import brand SEO CSV.')
  console.log(JSON.stringify({ dryRun: DRY_RUN, scanned: rows.length, changed, unchanged, failed }, null, 2))
  if (DRY_RUN) console.log('\nChạy lại với --yes để ghi thay đổi.')
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
