import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import {
    isReservedRootPath,
    normalizeProductSlug,
    normalizeRedirectDestination,
    normalizeRedirectPathname,
} from '@/utilities/redirects'

const PAGE_SIZE = 200

const targets = {
    categories: '/categories',
    posts: '/blog',
} as const

async function runCollection(payload: any, collection: 'categories' | 'posts') {
    let page = 1
    let totalPages = 1
    let created = 0
    let skipped = 0
    let conflicts = 0

    do {
        const result = await payload.find({
            collection,
            depth: 0,
            limit: PAGE_SIZE,
            page,
            pagination: true,
            overrideAccess: true,
            select: { slug: true },
        })

        totalPages = result.totalPages || 1

        for (const doc of result.docs) {
            const slug = normalizeProductSlug(doc.slug)

            if (!slug || isReservedRootPath(slug)) {
                skipped += 1
                continue
            }

            const from = normalizeRedirectPathname(slug)
            const to = normalizeRedirectPathname(`${targets[collection]}/${slug}`)

            const existing = await payload.find({
                collection: 'redirects',
                depth: 0,
                limit: 1,
                pagination: false,
                overrideAccess: true,
                where: { from: { equals: from } },
            })

            const current = existing.docs[0]

            if (!current) {
                await payload.create({
                    collection: 'redirects',
                    overrideAccess: true,
                    data: { active: true, from, to, type: '301' },
                })
                created += 1
                console.info('[LegacyContentRedirect]', { from, to, result: 'created' })
                continue
            }

            if (normalizeRedirectDestination(current.to || '') !== normalizeRedirectDestination(to)) {
                conflicts += 1
                console.warn('[LegacyContentRedirect] conflict', {
                    from,
                    existingTo: current.to,
                    expectedTo: to,
                })
                continue
            }

            skipped += 1
        }

        page += 1
    } while (page <= totalPages)

    console.log(`[LegacyContentRedirect] ${collection}`, { created, skipped, conflicts })

    return conflicts
}

async function run() {
    const payload = await getPayload({ config: configPromise })

    const categoryConflicts = await runCollection(payload, 'categories')
    const postConflicts = await runCollection(payload, 'posts')

    if (categoryConflicts > 0 || postConflicts > 0) {
        process.exitCode = 1
    }
}

run().catch((error) => {
    console.error('[LegacyContentRedirect] Fatal error', error)
    process.exit(1)
})