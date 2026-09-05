import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

const projectRoot = process.cwd()

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const LIMIT = Number(args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || 0
const REPORT_DIR = path.resolve('src/scripts/reports')
const REPORT_PATH = path.join(REPORT_DIR, 'product-brand-attribute-mismatches-direct.csv')

type Row = {
    product_id: number
    product_slug: string | null
    product_title: string | null
    main_brand_id: number | null
    main_brand_slug: string | null
    main_brand_name: string | null
    attribute_brand_value_ids: string | null
    attribute_brand_slugs: string | null
    attribute_brand_names: string | null
}

function normalizeCompareText(value: unknown) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function csvCell(value: unknown) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"'
}

function splitPipe(value: string | null) {
    return String(value ?? '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
        throw new Error('Missing DATABASE_URL')
    }

    const sql = postgres(databaseUrl, { max: 1 })

    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const rows = await sql<Row[]>`
    select
      p.id as product_id,
      p.slug as product_slug,
      p.title as product_title,
      b.id as main_brand_id,
      b.slug as main_brand_slug,
      b.name as main_brand_name,
      string_agg(distinct av.id::text, '|' order by av.id::text) as attribute_brand_value_ids,
      string_agg(distinct av.slug, '|' order by av.slug) as attribute_brand_slugs,
      string_agg(distinct av.label, '|' order by av.label) as attribute_brand_names
    from products p
    left join brands b on b.id = p.brand_id
    join products_product_attributes ppa on ppa._parent_id = p.id
    join attributes a on a.id = ppa.attribute_id
    left join products_rels pr
      on pr.parent_id = p.id
      and pr.path = concat('productAttributes.', ppa._order - 1, '.values')
    left join attribute_values av on av.id = pr.attribute_values_id
    where a.slug = 'thuong-hieu'
    group by
      p.id,
      p.slug,
      p.title,
      b.id,
      b.slug,
      b.name
    order by p.id
    ${LIMIT > 0 ? sql`limit ${LIMIT}` : sql``}
  `

    let matched = 0
    let mismatched = 0
    let missingMainBrand = 0
    let missingAttributeBrand = 0

    const reportRows: Array<Record<string, unknown>> = []

    for (const row of rows) {
        const mainBrandKeys = new Set(
            [row.main_brand_slug, row.main_brand_name]
                .map(normalizeCompareText)
                .filter(Boolean),
        )

        const attributeBrandKeys = [
            ...splitPipe(row.attribute_brand_slugs),
            ...splitPipe(row.attribute_brand_names),
        ].map(normalizeCompareText).filter(Boolean)

        if (!row.main_brand_id) {
            missingMainBrand += 1
        }

        if (attributeBrandKeys.length === 0) {
            missingAttributeBrand += 1
        }

        const isMatch =
            mainBrandKeys.size > 0 &&
            attributeBrandKeys.some((key) => mainBrandKeys.has(key))

        if (isMatch) {
            matched += 1
            continue
        }

        mismatched += 1

        reportRows.push({
            productId: row.product_id,
            productSlug: row.product_slug,
            productTitle: row.product_title,
            mainBrandId: row.main_brand_id,
            mainBrandSlug: row.main_brand_slug,
            mainBrandName: row.main_brand_name,
            attributeBrandValueIds: row.attribute_brand_value_ids,
            attributeBrandSlugs: row.attribute_brand_slugs,
            attributeBrandNames: row.attribute_brand_names,
            reason: attributeBrandKeys.length === 0 ? 'missing attribute brand value' : 'brand mismatch',
        })
    }

    const headers = [
        'productId',
        'productSlug',
        'productTitle',
        'mainBrandId',
        'mainBrandSlug',
        'mainBrandName',
        'attributeBrandValueIds',
        'attributeBrandSlugs',
        'attributeBrandNames',
        'reason',
    ]

    const csv = [
        headers.join(','),
        ...reportRows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
    ].join('\n')

    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')
    await sql.end()

    console.log('Report product brand attribute mismatches direct')
    console.log('')
    console.log('Done.')
    console.log(JSON.stringify({
        scannedWithBrandAttribute: rows.length,
        matched,
        mismatched,
        missingMainBrand,
        missingAttributeBrand,
        report: REPORT_PATH,
    }, null, 2))
}

main().catch((error) => {
    console.error('Report product brand attribute mismatches direct failed:', error)
    process.exitCode = 1
})