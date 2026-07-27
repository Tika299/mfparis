import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false })

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  isReservedRootPath,
  normalizeProductSlug,
  normalizeRedirectDestination,
  normalizeRedirectPathname,
} from '@/utilities/redirects'

const PAGE_SIZE = 200

const args = new Set(process.argv.slice(2))
const YES = args.has('--yes')
const FORCE = args.has('--force')
const ONLY_PUBLISHED = !args.has('--all-status')

type LegacyBlogRedirectStats = {
  alreadyExists: number
  conflicts: number
  created: number
  invalidSlug: number
  reservedSlug: number
  scanned: number
  updated: number
}

function getPostStatus(post: Record<string, unknown>): string | null {
  const status = post.status ?? post._status
  return typeof status === 'string' ? status : null
}

function isPublishedPost(post: Record<string, unknown>): boolean {
  const status = getPostStatus(post)

  if (!status) {
    return true
  }

  return status === 'published' || status === 'publish'
}

async function main(): Promise<void> {
  const payload = await getPayload({ config: configPromise })

  const stats: LegacyBlogRedirectStats = {
    alreadyExists: 0,
    conflicts: 0,
    created: 0,
    invalidSlug: 0,
    reservedSlug: 0,
    scanned: 0,
    updated: 0,
  }

  console.log('Legacy blog root redirect backfill')
  console.log('From: /{post-slug}')
  console.log('To  : /blog/{post-slug}')
  console.log('Dry run:', YES ? 'no' : 'yes')
  console.log('Force conflicts:', FORCE ? 'yes' : 'no')
  console.log('Only published:', ONLY_PUBLISHED ? 'yes' : 'no')

  let page = 1
  let totalPages = 1

  do {
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      pagination: true,
      overrideAccess: true,
      select: {
        slug: true,
        status: true,
        _status: true,
        title: true,
      },
    })

    totalPages = result.totalPages || 1

    for (const post of result.docs as Array<Record<string, unknown>>) {
      stats.scanned += 1

      if (ONLY_PUBLISHED && !isPublishedPost(post)) {
        continue
      }

      const slug = normalizeProductSlug(
        typeof post.slug === 'string' ? post.slug : null,
      )

      if (!slug) {
        stats.invalidSlug += 1
        continue
      }

      if (isReservedRootPath(slug)) {
        stats.reservedSlug += 1
        continue
      }

      const from = normalizeRedirectPathname(slug)
      const to = normalizeRedirectPathname('/blog/' + slug)

      const existing = await payload.find({
        collection: 'redirects',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        where: {
          from: {
            equals: from,
          },
        },
      })

      const current = existing.docs[0] as
        | { id: number | string; to?: string | null; type?: string | null; active?: boolean | null }
        | undefined

      if (!current) {
        console.log((YES ? 'create' : 'preview create') + ' ' + from + ' -> ' + to)

        if (YES) {
          await payload.create({
            collection: 'redirects',
            overrideAccess: true,
            data: {
              active: true,
              from,
              to,
              type: '301',
            },
          })
          stats.created += 1
        }

        continue
      }

      const existingTarget =
        normalizeRedirectDestination(current.to || '') || ''

      if (existingTarget === to && current.active !== false) {
        stats.alreadyExists += 1
        continue
      }

      if (!FORCE) {
        stats.conflicts += 1
        console.warn('conflict', {
          from,
          existingTo: current.to,
          expectedTo: to,
        })
        continue
      }

      console.log(
        (YES ? 'update' : 'preview update') +
          ' ' +
          from +
          ': ' +
          (current.to || '(empty)') +
          ' -> ' +
          to,
      )

      if (YES) {
        await payload.update({
          collection: 'redirects',
          id: current.id,
          overrideAccess: true,
          data: {
            active: true,
            to,
            type: '301',
          },
        })
        stats.updated += 1
      }
    }

    page += 1
  } while (page <= totalPages)

  console.log('\nSummary:', stats)

  if (stats.conflicts > 0) {
    console.log('\nCo conflict. Kiem tra ky truoc khi chay lai voi --force.')
    process.exitCode = 1
  }

  if (!YES) {
    console.log('\nDry-run xong. Neu dung, chay lai voi --yes de ghi redirect.')
  }
}

main().catch((error: unknown) => {
  console.error('[LegacyBlogRedirectBackfill] Fatal error', error)
  process.exit(1)
})
