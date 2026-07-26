import { getPayload } from 'payload'
import configPromise from '@payload-config'

const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--yes')
const FORCE = args.includes('--force')
const LIMIT = Math.max(1, Number(getArg('--limit', '100')) || 100)

const DEFAULT_BLOG_AUTHOR_DATA = {
  name: 'Marais de France',
  slug: 'mfparis',
  title: 'MF Paris Editorial',
  url: '/author/mfparis/',
  bio: 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.',
  isDefault: true,
}

function getArg(name: string, fallback = ''): string {
  const prefix = name + '='
  const value = args.find((item) => item.startsWith(prefix))
  return value ? value.slice(prefix.length) : fallback
}

function getRelationshipId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const id = (value as { id?: number | string }).id

    if (typeof id === 'number' || typeof id === 'string') {
      return id
    }
  }

  return null
}

function getNumericRelationshipId(value: unknown): number | null {
  const id = getRelationshipId(value)
  const numericId = Number(id)

  return Number.isFinite(numericId) && numericId > 0
    ? numericId
    : null
}

async function ensureDefaultBlogAuthor(payload: any): Promise<number> {
  const defaultResult = await payload.find({
    collection: 'blog-authors',
    depth: 0,
    limit: 1,
    pagination: false,
    sort: '-updatedAt',
    where: {
      isDefault: {
        equals: true,
      },
    },
  })

  const defaultId = getNumericRelationshipId(defaultResult.docs?.[0])

  if (defaultId) {
    return defaultId
  }

  const slugResult = await payload.find({
    collection: 'blog-authors',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      slug: {
        equals: DEFAULT_BLOG_AUTHOR_DATA.slug,
      },
    },
  })

  const slugDoc = slugResult.docs?.[0]
  const slugId = getNumericRelationshipId(slugDoc)

  if (slugId) {
    if (!DRY_RUN && !slugDoc.isDefault) {
      await payload.update({
        collection: 'blog-authors',
        id: slugId,
        data: { isDefault: true },
        overrideAccess: true,
      })
    }

    return slugId
  }

  if (DRY_RUN) {
    return 0
  }

  const created = await payload.create({
    collection: 'blog-authors',
    data: DEFAULT_BLOG_AUTHOR_DATA,
    overrideAccess: true,
  })

  const createdId = getNumericRelationshipId(created)

  if (!createdId) {
    throw new Error('Không tạo được tác giả mặc định.')
  }

  return createdId
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const defaultAuthorId = await ensureDefaultBlogAuthor(payload)

  console.log('Assign default blog author')
  console.log('Dry run: ' + (DRY_RUN ? 'yes' : 'no'))
  console.log('Force overwrite: ' + (FORCE ? 'yes' : 'no'))
  console.log('Default author ID: ' + defaultAuthorId)

  let page = 1
  let scanned = 0
  let updated = 0
  let skipped = 0

  while (true) {
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      limit: LIMIT,
      page,
      pagination: true,
      sort: 'id',
    })

    for (const post of result.docs) {
      scanned += 1

      const currentAuthorId = getRelationshipId(post.authorProfile)

      if (currentAuthorId && !FORCE) {
        skipped += 1
        continue
      }

      updated += 1
      console.log((DRY_RUN ? 'would update' : 'update') + ' post #' + post.id + ': ' + post.title)

      if (!DRY_RUN) {
        await payload.update({
          collection: 'posts',
          id: post.id,
          data: {
            authorProfile: defaultAuthorId,
          },
          overrideAccess: true,
        })
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  console.log('\nDone.')
  console.log('Scanned: ' + scanned)
  console.log('Updated: ' + updated)
  console.log('Skipped: ' + skipped)
}

main().catch((error) => {
  console.error('Assign default blog author failed:', error)
  process.exit(1)
})
