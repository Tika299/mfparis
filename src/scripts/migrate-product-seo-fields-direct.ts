import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

type ProductRow = {
    id: number
    title: string | null
    slug: string | null
    seo_title: string | null
    seo_description: string | null
    seo_meta_title: string | null
    seo_meta_description: string | null
}

const projectRoot = process.cwd()

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const LIMIT = Number(args.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || 0
const REPORT_DIR = path.resolve('src/scripts/reports')
const REPORT_PATH = path.join(REPORT_DIR, 'migrate-product-seo-fields-direct.csv')

function cleanText(value: unknown) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function csvCell(value: unknown) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"'
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
        throw new Error('Missing DATABASE_URL')
    }

    const sql = postgres(databaseUrl, { max: 1 })

    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const rows = await sql<ProductRow[]>`
    select
      id,
      title,
      slug,
      seo_title,
      seo_description,
      seo_meta_title,
      seo_meta_description
    from products
    where
      (
        nullif(trim(coalesce(seo_meta_title, '')), '') is null
        and nullif(trim(coalesce(seo_title, '')), '') is not null
      )
      or
      (
        nullif(trim(coalesce(seo_meta_description, '')), '') is null
        and nullif(trim(coalesce(seo_description, '')), '') is not null
      )
    order by id
    ${LIMIT > 0 ? sql`limit ${LIMIT}` : sql``}
  `

    let changed = 0
    let updated = 0
    let failed = 0

    const reportRows: Array<Record<string, unknown>> = []

    console.log('Migrate product SEO fields direct')
    console.log('Dry run:', YES ? 'no' : 'yes')
    console.log('Rows:', rows.length)

    for (const row of rows) {
        const legacyTitle = cleanText(row.seo_title)
        const legacyDescription = cleanText(row.seo_description)
        const currentMetaTitle = cleanText(row.seo_meta_title)
        const currentMetaDescription = cleanText(row.seo_meta_description)

        const nextMetaTitle = currentMetaTitle || legacyTitle || null
        const nextMetaDescription = currentMetaDescription || legacyDescription || null

        const copiedFields: string[] = []

        if (!currentMetaTitle && legacyTitle) copiedFields.push('metaTitle')
        if (!currentMetaDescription && legacyDescription) copiedFields.push('metaDescription')

        if (copiedFields.length === 0) continue

        changed += 1

        try {
            if (YES) {
                await sql`
          update products
          set
            seo_meta_title = ${nextMetaTitle},
            seo_meta_description = ${nextMetaDescription},
            updated_at = now()
          where id = ${row.id}
        `
                updated += 1
            }

            reportRows.push({
                id: row.id,
                slug: row.slug,
                title: row.title,
                status: YES ? 'updated' : 'would-update',
                copiedFields: copiedFields.join('|'),
                legacySeoTitle: legacyTitle,
                legacySeoDescription: legacyDescription,
            })
        } catch (error) {
            failed += 1
            reportRows.push({
                id: row.id,
                slug: row.slug,
                title: row.title,
                status: 'failed',
                copiedFields: copiedFields.join('|'),
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const headers = [
        'id',
        'slug',
        'title',
        'status',
        'copiedFields',
        'legacySeoTitle',
        'legacySeoDescription',
        'error',
    ]

    const csv = [
        headers.join(','),
        ...reportRows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
    ].join('\n')

    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')
    await sql.end()

    console.log('')
    console.log('Done.')
    console.log(JSON.stringify({
        scanned: rows.length,
        changed,
        updated,
        failed,
        report: REPORT_PATH,
    }, null, 2))

    if (!YES) {
        console.log('')
        console.log('Dry-run xong. Neu dung, chay lai voi --yes.')
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})