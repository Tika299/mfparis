import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import { parseCsv } from '@/lib/content-excel/workbook'

type AnyRecord = Record<string, any>

type PayloadCreateUpdateApi = {
    create: (args: AnyRecord) => Promise<AnyRecord>
    update: (args: AnyRecord) => Promise<AnyRecord>
}

const projectRoot = process.cwd()

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
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const FILE_PATH = path.resolve(
    getArg(
        '--file',
        path.resolve(projectRoot, 'src/scripts/import/product-reviews.csv'),
    ),
)

function cleanText(value: unknown) {
    return String(value ?? '').trim()
}

function getRowValue(row: AnyRecord, names: string[]) {
    for (const name of names) {
        const value = row[name]
        if (value !== undefined && String(value).trim()) {
            return String(value).trim()
        }
    }

    return ''
}

function normalizeStatus(value: unknown) {
    const status = cleanText(value).toLowerCase()

    if (status === 'pending' || status === 'rejected' || status === 'approved') {
        return status
    }

    return 'approved'
}

function normalizeRating(value: unknown) {
    const rating = Number(String(value ?? '').replace(',', '.'))

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new Error(`Rating không hợp lệ: ${value}. Rating phải từ 1 đến 5.`)
    }

    return Math.round(rating)
}

async function findProduct(payload: any, row: AnyRecord) {
    const productId = getRowValue(row, ['productId', 'product_id', 'product', 'productID'])

    if (productId) {
        try {
            return await payload.findByID({
                collection: 'products',
                id: productId,
                depth: 0,
                overrideAccess: true,
            })
        } catch {
            return null
        }
    }

    const productSlug = getRowValue(row, ['productSlug', 'product_slug', 'slug'])
    const sku = getRowValue(row, ['sku', 'SKU'])

    const or: AnyRecord[] = []

    if (productSlug) {
        or.push({
            slug: {
                equals: productSlug,
            },
        })
    }

    if (sku) {
        or.push({
            sku: {
                equals: sku,
            },
        })
    }

    if (or.length === 0) {
        return null
    }

    const result = await payload.find({
        collection: 'products',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        where: or.length === 1 ? or[0] : { or },
    })

    return result.docs[0] ?? null
}

function readRows() {
    if (!fs.existsSync(FILE_PATH)) {
        throw new Error(`Không tìm thấy file CSV: ${FILE_PATH}`)
    }

    const raw = fs.readFileSync(FILE_PATH, 'utf8')
    return parseCsv(raw)
}

async function importReviews() {
    const configPromise = (await import('@payload-config')).default
    const payload = await getPayload({ config: configPromise })
    const payloadApi = payload as unknown as PayloadCreateUpdateApi
    const rows = readRows()

    let scanned = 0
    let created = 0
    let wouldCreate = 0
    let skipped = 0
    let failed = 0

    const details: AnyRecord[] = []

    console.log('Import product reviews')
    console.log('Dry run:', DRY_RUN ? 'yes' : 'no')
    console.log('File:', FILE_PATH)

    for (const row of rows) {
        if (LIMIT > 0 && scanned >= LIMIT) {
            break
        }

        scanned += 1

        try {
            const product = await findProduct(payload, row)

            if (!product?.id) {
                skipped += 1
                details.push({
                    row: scanned,
                    status: 'skipped',
                    reason: 'Không tìm thấy sản phẩm',
                    product: getRowValue(row, ['productId', 'product_id', 'product', 'productID', 'slug', 'sku']),
                })
                continue
            }

            const rating = normalizeRating(getRowValue(row, ['rating', 'stars', 'score']))
            const comment = getRowValue(row, ['comment', 'review', 'content'])
            const status = normalizeStatus(getRowValue(row, ['status']))

            if (!comment) {
                skipped += 1
                details.push({
                    row: scanned,
                    productId: product.id,
                    status: 'skipped',
                    reason: 'Thiếu nội dung đánh giá',
                })
                continue
            }

            const createdAt = getRowValue(row, ['createdAt', 'date', 'created_at'])
            const reviewData: AnyRecord = {
                product: product.id,
                rating,
                comment,
            }

            if (createdAt) {
                reviewData.createdAt = createdAt
                reviewData.updatedAt = createdAt
            }

            if (DRY_RUN) {
                wouldCreate += 1
                details.push({
                    row: scanned,
                    status: 'would_create',
                    productId: product.id,
                    productTitle: product.title,
                    rating,
                    reviewStatus: status,
                })
                continue
            }

            const createdReview = await payloadApi.create({
                collection: 'reviews',
                depth: 0,
                overrideAccess: true,
                data: reviewData,
            })

            if (status !== 'pending') {
                await payloadApi.update({
                    collection: 'reviews',
                    id: createdReview.id,
                    depth: 0,
                    overrideAccess: true,
                    data: {
                        status,
                    },
                })
            }

            created += 1
            details.push({
                row: scanned,
                status: 'created',
                reviewId: createdReview.id,
                productId: product.id,
                productTitle: product.title,
                rating,
                reviewStatus: status,
            })
        } catch (error) {
            failed += 1
            details.push({
                row: scanned,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    console.log('')
    console.log('Done.')
    console.log(
        JSON.stringify(
            {
                scanned,
                wouldCreate,
                created,
                skipped,
                failed,
                details: details.slice(0, 50),
            },
            null,
            2,
        ),
    )

    if (DRY_RUN) {
        console.log('')
        console.log('Dry-run xong. Nếu đúng, chạy lại với --yes để tạo review.')
    }
}

importReviews().catch((error) => {
    console.error(
        'Import product reviews failed:',
        error instanceof Error ? error.message : error,
    )
    process.exit(1)
})