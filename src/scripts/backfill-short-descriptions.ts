import dotenv from 'dotenv'
import path from 'path'
import { getPayload } from 'payload'

import { createAutoSummary, hasMeaningfulText } from '@/utilities/autoSummary'

type CollectionSlug = 'products' | 'posts'
type AnyDoc = Record<string, any>

type BackfillTarget = {
  collection: CollectionSlug
  label: string
  sourceField: string
  targetField: string
  maxLength: number
  titleField: string
}

const projectRoot = process.cwd()
dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const ONLY = args
  .find((arg) => arg.startsWith('--only='))
  ?.split('=')
  .slice(1)
  .join('=')
const LIMIT = Math.max(
  0,
  Number(args.find((arg) => arg.startsWith('--limit='))?.split('=').slice(1).join('=') || 0) || 0,
)
const PAGE_SIZE = Math.max(
  1,
  Math.min(
    200,
    Number(args.find((arg) => arg.startsWith('--page-size='))?.split('=').slice(1).join('=') || 100) ||
      100,
  ),
)

const targets: BackfillTarget[] = [
  {
    collection: 'products',
    label: 'san pham',
    sourceField: 'description',
    targetField: 'shortDescription',
    maxLength: 240,
    titleField: 'title',
  },
  {
    collection: 'posts',
    label: 'bai viet',
    sourceField: 'content',
    targetField: 'excerpt',
    maxLength: 240,
    titleField: 'title',
  },
]

function shouldRunTarget(target: BackfillTarget): boolean {
  if (!ONLY) {
    return true
  }

  return ONLY.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(target.collection)
}

async function backfillCollection(payload: any, target: BackfillTarget) {
  let page = 1
  let scanned = 0
  let missingTarget = 0
  let missingSource = 0
  let changed = 0
  let failed = 0

  console.log('')
  console.log('Backfill ' + target.label + ' (' + target.collection + ')')

  while (true) {
    const result = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    })

    for (const doc of result.docs as AnyDoc[]) {
      if (LIMIT > 0 && scanned >= LIMIT) {
        break
      }

      scanned += 1

      if (hasMeaningfulText(doc[target.targetField])) {
        continue
      }

      missingTarget += 1

      if (!hasMeaningfulText(doc[target.sourceField])) {
        missingSource += 1
        continue
      }

      const summary = createAutoSummary(doc[target.sourceField], {
        maxLength: target.maxLength,
      })

      if (!summary) {
        missingSource += 1
        continue
      }

      changed += 1
      const name = doc[target.titleField] || doc.slug || doc.id
      console.log((YES ? '[update] ' : '[dry-run] ') + '#' + doc.id + ' ' + name)
      console.log('   ' + target.targetField + ': ' + summary)

      if (YES) {
        try {
          await payload.update({
            collection: target.collection,
            id: doc.id,
            data: {
              [target.targetField]: summary,
            },
            depth: 0,
            overrideAccess: true,
          })
        } catch (error) {
          failed += 1
          console.error(
            '   failed #' +
              doc.id +
              ': ' +
              (error instanceof Error ? error.message : String(error)),
          )
        }
      }
    }

    if (LIMIT > 0 && scanned >= LIMIT) {
      break
    }

    if (!result.hasNextPage) {
      break
    }

    page = result.nextPage || page + 1
  }

  return {
    collection: target.collection,
    scanned,
    missingTarget,
    missingSource,
    changed,
    failed,
  }
}

async function main() {
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })
  const summaries = []

  console.log('Backfill short descriptions')
  console.log('Dry run:', YES ? 'no' : 'yes')
  console.log('Only:', ONLY || 'products, posts')

  for (const target of targets) {
    if (!shouldRunTarget(target)) {
      continue
    }

    summaries.push(await backfillCollection(payload, target))
  }

  console.log('')
  console.log('Done.')
  console.log(JSON.stringify(summaries, null, 2))

  if (!YES) {
    console.log('')
    console.log('Run with --yes to update database.')
  }
}

main().catch((error) => {
  console.error(
    'Backfill short descriptions failed:',
    error instanceof Error ? error.message : error,
  )
  process.exit(1)
})
