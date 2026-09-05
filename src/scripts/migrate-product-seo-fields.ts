import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

type AnyRecord = Record<string, unknown>

type ProductDoc = AnyRecord & {
    id: string | number
    title?: string | null
    slug?: string | null
    seoTitle?: string | null
    seoDescription?: string | null
    seo?: AnyRecord | null
}

type PayloadLike = {
    find: (args: AnyRecord) => Promise<{
        docs: ProductDoc[]
        hasNextPage?: boolean
        nextPage?: number | null
    }>
    update: (args: AnyRecord) => Promise<unknown>
}

const projectRoot = process.cwd()

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const DRY_RUN = !YES
const LIMIT = getNumberArg('--limit', 0)
const PAGE_SIZE = Math.max(1, Math.min(200, getNumberArg('--page-size', 100)))
const REPORT_DIR = path.resolve(getArg('--report-dir', 'src/scripts/reports'))
const REPORT_PATH = path.join(REPORT_DIR, 'migrate-product-seo-fields.csv')

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

function cleanText(value: unknown) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function getSeoText(seo: AnyRecord, key: string) {
    return cleanText(seo[key])
}

async function main() {
    const config = (await import('@payload-config')).default
    const payload = (await getPayload({ config })) as unknown as PayloadLike

    await fs.promises.mkdir(REPORT_DIR, { recursive: true })

    const reportRows: Array<Record<string, unknown>> = []
    let page = 1
    let scanned = 0
    let changed = 0
    let updated = 0
    let skippedNoLegacy = 0
    let skippedAlreadyFilled = 0
    let failed = 0
    let copiedTitle = 0
    let copiedDescription = 0

    console.log('Migrate product SEO fields')
    console.log('Dry run:', DRY_RUN ? 'yes' : 'no')
    console.log('Limit:', LIMIT || 'all')

    while (true) {
        const result = await payload.find({
            collection: 'products',
            depth: 0,
            limit: PAGE_SIZE,
            page,
            pagination: true,
            overrideAccess: true,
            sort: 'id',
        })

        if (!result.docs.length) break

        for (const product of result.docs) {
            if (LIMIT > 0 && scanned >= LIMIT) break

            scanned += 1

            const seo = isRecord(product.seo) ? product.seo : {}
            const legacyTitle = cleanText(product.seoTitle)
            const legacyDescription = cleanText(product.seoDescription)
            const currentMetaTitle = getSeoText(seo, 'metaTitle')
            const currentMetaDescription = getSeoText(seo, 'metaDescription')

            const nextSeo: AnyRecord = { ...seo }
            const copiedFields: string[] = []

            if (!currentMetaTitle && legacyTitle) {
                nextSeo.metaTitle = legacyTitle
                copiedFields.push('metaTitle')
                copiedTitle += 1
            }

            if (!currentMetaDescription && legacyDescription) {
                nextSeo.metaDescription = legacyDescription
                copiedFields.push('metaDescription')
                copiedDescription += 1
            }

            if (copiedFields.length === 0) {
                if (!legacyTitle && !legacyDescription) {
                    skippedNoLegacy += 1
                } else {
                    skippedAlreadyFilled += 1
                }

                reportRows.push({
                    id: product.id,
                    slug: product.slug,
                    title: product.title,
                    status: 'skipped',
                    copiedFields: '',
                    reason: !legacyTitle && !legacyDescription ? 'no legacy seo' : 'new seo already filled',
                })

                continue
            }

            changed += 1

            try {
                if (!DRY_RUN) {
                    await payload.update({
                        collection: 'products',
                        id: product.id,
                        depth: 0,
                        overrideAccess: true,
                        data: {
                            seo: nextSeo,
                        },
                    })

                    updated += 1
                }

                reportRows.push({
                    id: product.id,
                    slug: product.slug,
                    title: product.title,
                    status: DRY_RUN ? 'would-update' : 'updated',
                    copiedFields: copiedFields.join('|'),
                    legacySeoTitle: legacyTitle,
                    legacySeoDescription: legacyDescription,
                })
            } catch (error) {
                failed += 1
                reportRows.push({
                    id: product.id,
                    slug: product.slug,
                    title: product.title,
                    status: 'failed',
                    copiedFields: copiedFields.join('|'),
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }

        if (LIMIT > 0 && scanned >= LIMIT) break
        if (!result.hasNextPage) break

        page = result.nextPage || page + 1
    }

    const headers = [
        'id',
        'slug',
        'title',
        'status',
        'copiedFields',
        'reason',
        'legacySeoTitle',
        'legacySeoDescription',
        'error',
    ]

    const csv = [
        headers.join(','),
        ...reportRows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
    ].join('\n')

    await fs.promises.writeFile(REPORT_PATH, '\uFEFF' + csv, 'utf8')

    console.log('')
    console.log('Done.')
    console.log(JSON.stringify({
        scanned,
        changed,
        updated,
        skippedNoLegacy,
        skippedAlreadyFilled,
        copiedTitle,
        copiedDescription,
        failed,
        report: REPORT_PATH,
    }, null, 2))

    if (DRY_RUN) {
        console.log('')
        console.log('Dry-run xong. Neu dung, chay lai voi --yes de cap nhat database.')
    }
}

main().catch((error) => {
    console.error('Migrate product SEO fields failed:', error)
    process.exitCode = 1
})