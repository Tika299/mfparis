import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const REPORT_DIR = path.resolve('src/scripts/reports')
const REPORT_PATH = path.join(REPORT_DIR, 'product-gender-audience-overlap-direct.csv')

function csvCell(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('Missing DATABASE_URL')

    const sql = postgres(databaseUrl, { max: 1 })
    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const rows = await sql`
    with attr_rows as (
      select
        p.id as product_id,
        p.slug as product_slug,
        p.title as product_title,
        a.slug as attribute_slug,
        string_agg(distinct av.slug, '|' order by av.slug) as value_slugs,
        string_agg(distinct av.label, '|' order by av.label) as value_labels
      from products p
      join products_product_attributes ppa on ppa._parent_id = p.id
      join attributes a on a.id = ppa.attribute_id
      left join products_rels pr
        on pr.parent_id = p.id
        and pr.path = concat('productAttributes.', ppa._order - 1, '.values')
      left join attribute_values av on av.id = pr.attribute_values_id
      where a.slug in ('gioi-tinh', 'doi-tuong-su-dung')
      group by p.id, p.slug, p.title, a.slug
    )
    select
      product_id,
      product_slug,
      product_title,
      max(value_slugs) filter (where attribute_slug = 'gioi-tinh') as gender_slugs,
      max(value_labels) filter (where attribute_slug = 'gioi-tinh') as gender_labels,
      max(value_slugs) filter (where attribute_slug = 'doi-tuong-su-dung') as audience_slugs,
      max(value_labels) filter (where attribute_slug = 'doi-tuong-su-dung') as audience_labels
    from attr_rows
    group by product_id, product_slug, product_title
    having
      max(value_slugs) filter (where attribute_slug = 'gioi-tinh') is not null
      and max(value_slugs) filter (where attribute_slug = 'doi-tuong-su-dung') is not null
    order by product_id
  `

    const headers = [
        'productId',
        'productSlug',
        'productTitle',
        'genderSlugs',
        'genderLabels',
        'audienceSlugs',
        'audienceLabels',
    ]

    const csv = [
        headers.join(','),
        ...rows.map((row) =>
            [
                row.product_id,
                row.product_slug,
                row.product_title,
                row.gender_slugs,
                row.gender_labels,
                row.audience_slugs,
                row.audience_labels,
            ].map(csvCell).join(','),
        ),
    ].join('\n')

    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')
    await sql.end()

    console.log('Report product gender/audience overlap direct')
    console.log('Done.')
    console.log(JSON.stringify({
        overlapProducts: rows.length,
        report: REPORT_PATH,
    }, null, 2))
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})