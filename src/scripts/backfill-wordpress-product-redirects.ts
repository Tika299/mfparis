import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
    ensureLegacyProductRedirect,
    type LegacyRedirectResult,
} from '@/utilities/legacyProductRedirects'

const PAGE_SIZE = 200

type Stats = Record<
    | 'conflicts'
    | 'created'
    | 'errors'
    | 'productsWithoutSlug'
    | 'scanned'
    | 'skipped',
    number
>

function incrementResult(
    stats: Stats,
    result: LegacyRedirectResult,
): void {
    if (result === 'created') {
        stats.created += 1
        return
    }

    if (result === 'conflict') {
        stats.conflicts += 1
        return
    }

    if (result === 'error') {
        stats.errors += 1
        return
    }

    stats.skipped += 1
}

async function run(): Promise<void> {
    const payload = await getPayload({
        config: configPromise,
    })

    const stats: Stats = {
        conflicts: 0,
        created: 0,
        errors: 0,
        productsWithoutSlug: 0,
        scanned: 0,
        skipped: 0,
    }

    let page = 1
    let totalPages = 1

    do {
        const result = await payload.find({
            collection: 'products',
            depth: 0,
            limit: PAGE_SIZE,
            page,
            pagination: true,
            overrideAccess: true,
            select: {
                slug: true,
                status: true,
            },
            where: {
                status: {
                    equals: 'published',
                },
            },
        })

        totalPages = result.totalPages || 1

        for (const product of result.docs) {
            stats.scanned += 1

            if (!product.slug?.trim()) {
                stats.productsWithoutSlug += 1
                stats.skipped += 1
                continue
            }

            const redirectResult =
                await ensureLegacyProductRedirect({
                    event: 'backfill',
                    payload,
                    productId: product.id,
                    sourceSlug: product.slug,
                    status: product.status,
                    targetSlug: product.slug,
                })

            incrementResult(stats, redirectResult.result)
        }

        page += 1
    } while (page <= totalPages)

    console.log('[LegacyProductRedirectBackfill] Summary', {
        'Errors': stats.errors,
        'Products without slug': stats.productsWithoutSlug,
        'Redirect conflicts': stats.conflicts,
        'Redirects created': stats.created,
        'Redirects skipped': stats.skipped,
        'Total products scanned': stats.scanned,
    })

    if (stats.errors > 0) {
        process.exitCode = 1
    }
}

run().catch((error: unknown) => {
    console.error(
        '[LegacyProductRedirectBackfill] Fatal error',
        error instanceof Error ? error.message : error,
    )
    process.exit(1)
})