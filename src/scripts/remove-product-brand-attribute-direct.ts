import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const YES = process.argv.includes('--yes')
const LIMIT =
    Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0) || 0

const REPORT_DIR = path.resolve('src/scripts/reports')
const REPORT_PATH = path.join(REPORT_DIR, 'remove-product-brand-attribute-direct.csv')

function csvCell(value: unknown) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('Missing DATABASE_URL')

    const sql = postgres(databaseUrl, { max: 1 })
    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const [brandAttr] = await sql<{ id: number }[]>`
    select id from attributes where slug = 'thuong-hieu' limit 1
  `

    if (!brandAttr) throw new Error('Cannot find attribute slug thuong-hieu')

    const products = await sql<{ id: number; slug: string | null; title: string | null }[]>`
    select distinct p.id, p.slug, p.title
    from products p
    join products_product_attributes ppa on ppa._parent_id = p.id
    where ppa.attribute_id = ${brandAttr.id}
    order by p.id
    ${LIMIT > 0 ? sql`limit ${LIMIT}` : sql``}
  `

    let changed = 0
    let updated = 0
    let failed = 0
    const reportRows: Record<string, unknown>[] = []

    console.log('Remove product brand attribute direct')
    console.log('Dry run:', YES ? 'no' : 'yes')
    console.log('Products:', products.length)

    for (const product of products) {
        try {
            const result = await sql.begin(async (tx) => {
                const rows = await tx<{ id: string; _order: number; attribute_id: number }[]>`
          select id, _order, attribute_id
          from products_product_attributes
          where _parent_id = ${product.id}
          order by _order
        `

                const removeRows = rows.filter((row) => row.attribute_id === brandAttr.id)
                const keepRows = rows.filter((row) => row.attribute_id !== brandAttr.id)

                if (removeRows.length === 0) {
                    return { removedAttrs: 0, removedRels: 0, remaining: keepRows.length }
                }

                changed += 1

                if (!YES) {
                    return {
                        removedAttrs: removeRows.length,
                        removedRels: removeRows.length,
                        remaining: keepRows.length,
                    }
                }

                for (const row of keepRows) {
                    await tx`
            update products_rels
            set path = ${`__tmp_productAttributes.${row.id}.values`}
            where parent_id = ${product.id}
              and path = ${`productAttributes.${row._order - 1}.values`}
          `
                }

                let removedRels = 0
                for (const row of removeRows) {
                    const relDelete = await tx`
            delete from products_rels
            where parent_id = ${product.id}
              and path = ${`productAttributes.${row._order - 1}.values`}
          `
                    removedRels += relDelete.count
                }

                await tx`
          delete from products_product_attributes
          where _parent_id = ${product.id}
            and attribute_id = ${brandAttr.id}
        `

                for (let index = 0; index < keepRows.length; index += 1) {
                    const row = keepRows[index]
                    const nextOrder = index + 1

                    await tx`
            update products_product_attributes
            set _order = ${nextOrder}
            where id = ${row.id}
          `

                    await tx`
            update products_rels
            set path = ${`productAttributes.${index}.values`}
            where parent_id = ${product.id}
              and path = ${`__tmp_productAttributes.${row.id}.values`}
          `
                }

                await tx`update products set updated_at = now() where id = ${product.id}`

                return {
                    removedAttrs: removeRows.length,
                    removedRels,
                    remaining: keepRows.length,
                }
            })

            if (YES && result.removedAttrs > 0) updated += 1

            reportRows.push({
                productId: product.id,
                slug: product.slug,
                title: product.title,
                status: YES ? 'updated' : 'would-update',
                ...result,
            })
        } catch (error) {
            failed += 1
            reportRows.push({
                productId: product.id,
                slug: product.slug,
                title: product.title,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    const headers = ['productId', 'slug', 'title', 'status', 'removedAttrs', 'removedRels', 'remaining', 'error']
    const csv = [headers.join(','), ...reportRows.map((r) => headers.map((h) => csvCell(r[h])).join(','))].join('\n')
    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')

    await sql.end()

    console.log('Done.')
    console.log(JSON.stringify({ scanned: products.length, changed, updated, failed, report: REPORT_PATH }, null, 2))
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})