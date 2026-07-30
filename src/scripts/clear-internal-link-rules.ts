import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)

const DRY_RUN = hasFlag('--dry-run')
const YES = hasFlag('--yes')
const INCLUDE_LOGS = hasFlag('--include-logs')
const ONLY_DISABLED = hasFlag('--only-disabled')

const TARGETS = [
  ...(INCLUDE_LOGS
    ? [
        {
          collection: 'internal-link-logs' as const,
          label: 'log internal link',
          where: undefined,
        },
      ]
    : []),
  {
    collection: 'internal-link-rules' as const,
    label: ONLY_DISABLED ? 'rule internal link dang tat' : 'rule internal link',
    where: ONLY_DISABLED
      ? {
          enabled: {
            equals: false,
          },
        }
      : undefined,
  },
]

type Target = (typeof TARGETS)[number]

async function countCollection(payload: any, target: Target) {
  const result = await payload.find({
    collection: target.collection,
    depth: 0,
    limit: 1,
    pagination: true,
    overrideAccess: true,
    ...(target.where ? { where: target.where } : {}),
  })

  return Number(result.totalDocs || 0)
}

async function clearCollection(payload: any, target: Target) {
  let deleted = 0

  while (true) {
    const result = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: 200,
      pagination: false,
      overrideAccess: true,
      ...(target.where ? { where: target.where } : {}),
    })

    const docs = result.docs || []

    if (docs.length === 0) break

    for (const doc of docs) {
      await payload.delete({
        collection: target.collection,
        id: doc.id,
        overrideAccess: true,
      })

      deleted += 1
    }

    console.log(`   Da xoa ${deleted} ${target.label}...`)
  }

  return deleted
}

async function main() {
  if (!YES && !DRY_RUN) {
    console.error('Lenh nay se xoa Internal Link Rules.')
    console.error('Chay thu truoc: npm run clear:internal-links -- --dry-run')
    console.error('Xoa rule: npm run clear:internal-links -- --yes')
    console.error('Xoa rule va log: npm run clear:internal-links -- --yes --include-logs')
    console.error('Chi xoa rule dang tat: npm run clear:internal-links -- --yes --only-disabled')
    process.exit(1)
  }

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  console.log('Bat dau clear internal link data...')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Include logs: ${INCLUDE_LOGS ? 'yes' : 'no'}`)
  console.log(`Only disabled rules: ${ONLY_DISABLED ? 'yes' : 'no'}`)
  console.log('')

  console.log('So luong se xoa:')
  for (const target of TARGETS) {
    const count = await countCollection(payload, target)
    console.log(`   ${target.collection}: ${count}`)
  }

  if (DRY_RUN) {
    console.log('')
    console.log('Dry run hoan tat, chua xoa du lieu nao.')
    return
  }

  for (const target of TARGETS) {
    console.log('')
    console.log(`Dang xoa ${target.label}...`)
    const deleted = await clearCollection(payload, target)
    console.log(`Da xoa ${deleted} ${target.label}.`)
  }

  console.log('')
  console.log('Clear internal link data hoan tat.')
}

main().catch((error) => {
  console.error('Clear internal link data that bai:', error)
  process.exit(1)
})
