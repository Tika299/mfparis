import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import { buildProductSearchKeywords } from '@/utilities/searchKeywords'

type ProductDoc = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const LIMIT = Math.max(
  0,
  Number(
    args
      .find((arg) => arg.startsWith('--limit='))
      ?.split('=')
      .slice(1)
      .join('=') || 0,
  ) || 0,
)
const PAGE_SIZE = Math.max(
  1,
  Math.min(
    200,
    Number(
      args
        .find((arg) => arg.startsWith('--page-size='))
        ?.split('=')
        .slice(1)
        .join('=') || 100,
    ) || 100,
  ),
)

async function main() {
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  let page = 1
  let scanned = 0
  let changed = 0
  let failed = 0

  console.log('Backfill product searchKeywords')
  console.log('Dry run:', YES ? 'no' : 'yes')

  while (true) {
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const product of result.docs as ProductDoc[]) {
      if (LIMIT > 0 && scanned >= LIMIT) {
        break
      }

      scanned += 1
      const nextKeywords = buildProductSearchKeywords(product)

      if (nextKeywords === (product.searchKeywords || '')) {
        continue
      }

      changed += 1
      console.log(
        (YES ? '[update] ' : '[dry-run] ') +
          '#' +
          product.id +
          ' ' +
          (product.title || product.slug) +
          ': ' +
          nextKeywords.length +
          ' chars',
      )

      if (YES) {
        try {
          await payload.update({
            collection: 'products',
            id: product.id,
            data: {
              searchKeywords: nextKeywords,
            },
            depth: 0,
            overrideAccess: true,
          })
        } catch (error) {
          failed += 1
          console.warn(
            'Failed #' +
              product.id +
              ': ' +
              (error instanceof Error ? error.message : String(error)),
          )
        }
      }
    }

    if (!result.hasNextPage || (LIMIT > 0 && scanned >= LIMIT)) {
      break
    }

    page += 1
  }

  console.log('Scanned:', scanned)
  console.log(YES ? 'Updated:' : 'Would update:', changed)
  console.log('Failed:', failed)

  if (!YES) {
    console.log('Run with --yes to write changes.')
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
