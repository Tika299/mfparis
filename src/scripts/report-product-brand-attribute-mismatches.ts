import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

type ID = string | number

type AnyRecord = Record<string, unknown>

type ProductDoc = {
    id: ID
    title?: string | null
    slug?: string | null
    brand?: ID | AnyRecord | null
    productAttributes?: Array<{
        attribute?: ID | AnyRecord | null
        values?: Array<ID | AnyRecord> | null
    }> | null
}

const projectRoot = process.cwd()

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const LIMIT = getNumberArg('--limit', 0)
const PAGE_SIZE = Math.max(1, Math.min(200, getNumberArg('--page-size', 100)))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const REPORT_PATH = path.join(REPORT_DIR, 'product-brand-attribute-mismatches.csv')

function getArg(name: string, fallback = '') {
    const found = args.find((arg) => arg.startsWith(name + '='))
    return found ? found.split('=').slice(1).join('=') : fallback
}

function getNumberArg(name: string, fallback: number) {
    const value = Number(getArg(name, String(fallback)))
    return Number.isFinite(value) ? value : fallback
}

function csvCell(value: unknown) {
    const text = String(value ?? '')
    return '"' + text.replace(/"/g, '""') + '"'
}

function isRecord(value: unknown): value is AnyRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getID(value: unknown): ID | null {
    if (typeof value === 'string' || typeof value === 'number') return value

    if (isRecord(value)) {
        const id = value.id
        if (typeof id === 'string' || typeof id === 'number') return id
    }

    return null
}

function getSlug(value: unknown) {
    if (!isRecord(value)) return ''
    return typeof value.slug === 'string' ? value.slug : ''
}

function getName(value: unknown) {
    if (!isRecord(value)) return ''
    const name = value.name || value.title || value.label
    return typeof name === 'string' ? name : ''
}

function getRelationshipLabel(value: unknown) {
    const id = getID(value)
    const slug = getSlug(value)
    const name = getName(value)

    return {
        id: id === null ? '' : String(id),
        slug,
        name,
    }
}

async function main() {
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const attributes = await payload.find({
        collection: 'attributes',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
            slug: {
                equals: 'thuong-hieu',
            },
        },
    })

    const brandAttribute = attributes.docs[0]

    if (!brandAttribute) {
        throw new Error('Không tìm thấy attribute slug thuong-hieu')
    }

    const brandAttributeID = String(brandAttribute.id)

    let page = 1
    let scanned = 0
    let withBrandAttribute = 0
    let matched = 0
    let mismatched = 0
    let missingMainBrand = 0
    let missingAttributeBrand = 0

    const rows: Array<Record<string, unknown>> = []

    console.log('Report product brand attribute mismatches')
    console.log('Limit:', LIMIT || 'all')
    console.log('Brand attribute ID:', brandAttributeID)

    while (true) {
        const result = await payload.find({
            collection: 'products',
            depth: 2,
            limit: PAGE_SIZE,
            page,
            pagination: true,
            overrideAccess: true,
            sort: 'id',
            select: {
                title: true,
                slug: true,
                brand: true,
                productAttributes: true,
            },
        })

        for (const product of result.docs as ProductDoc[]) {
            if (LIMIT > 0 && scanned >= LIMIT) break

            scanned += 1

            const mainBrand = getRelationshipLabel(product.brand)

            if (!mainBrand.id) {
                missingMainBrand += 1
            }

            const brandRows = Array.isArray(product.productAttributes)
                ? product.productAttributes.filter((row) => {
                    const attributeID = getID(row.attribute)
                    return attributeID !== null && String(attributeID) === brandAttributeID
                })
                : []

            if (brandRows.length === 0) {
                missingAttributeBrand += 1
                continue
            }

            withBrandAttribute += 1

            const attributeBrands = brandRows.flatMap((row) =>
                Array.isArray(row.values) ? row.values : [],
            )

            const attributeBrandLabels = attributeBrands.map(getRelationshipLabel)
            const attributeBrandIDs = attributeBrandLabels
                .map((item) => item.id)
                .filter(Boolean)

            const isMatch =
                mainBrand.id &&
                attributeBrandIDs.some((id) => String(id) === String(mainBrand.id))

            if (isMatch) {
                matched += 1
                continue
            }

            mismatched += 1

            rows.push({
                productId: product.id,
                productSlug: product.slug,
                productTitle: product.title,
                mainBrandId: mainBrand.id,
                mainBrandSlug: mainBrand.slug,
                mainBrandName: mainBrand.name,
                attributeBrandIds: attributeBrandLabels.map((item) => item.id).join('|'),
                attributeBrandSlugs: attributeBrandLabels.map((item) => item.slug).join('|'),
                attributeBrandNames: attributeBrandLabels.map((item) => item.name).join('|'),
            })
        }

        if (LIMIT > 0 && scanned >= LIMIT) break
        if (!result.hasNextPage) break

        page = result.nextPage || page + 1
    }

    const headers = [
        'productId',
        'productSlug',
        'productTitle',
        'mainBrandId',
        'mainBrandSlug',
        'mainBrandName',
        'attributeBrandIds',
        'attributeBrandSlugs',
        'attributeBrandNames',
    ]

    const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
    ].join('\n')

    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')

    console.log('')
    console.log('Done.')
    console.log(JSON.stringify({
        scanned,
        withBrandAttribute,
        matched,
        mismatched,
        missingMainBrand,
        missingAttributeBrand,
        report: REPORT_PATH,
    }, null, 2))
}

main().catch((error) => {
    console.error('Report product brand attribute mismatches failed:', error)
    process.exitCode = 1
})