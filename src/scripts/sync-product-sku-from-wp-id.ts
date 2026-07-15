import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

type VariantRow = Record<string, any>
type ProductDoc = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)
const YES = args.includes('--yes')
const DRY_RUN = !YES
const LIMIT = Math.max(1, Number(args.find((arg) => arg.startsWith('--limit='))?.split('=').slice(1).join('=') || 100) || 100)

function normalizeSku(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return String(value)
}

function normalizeVariants(variants: unknown): { variants?: VariantRow[]; changed: boolean } {
  if (!Array.isArray(variants)) {
    return { changed: false }
  }

  let changed = false
  const nextVariants = variants.map((variant) => {
    const nextSku = normalizeSku(variant?.wpVariationId) || normalizeSku(variant?.sku) || ''

    if (nextSku !== (variant?.sku || '')) {
      changed = true
    }

    return {
      ...variant,
      sku: nextSku,
    }
  })

  return {
    variants: nextVariants,
    changed,
  }
}

async function run() {
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  console.log('Sync product SKU from WooCommerce IDs')
  console.log('Dry run:', DRY_RUN ? 'yes' : 'no')

  let page = 1
  let updated = 0
  let scanned = 0

  while (true) {
    const result = await payload.find({
      collection: 'products',
      depth: 0,
      limit: LIMIT,
      page,
      overrideAccess: true,
      where: {
        wpId: {
          exists: true,
        },
      },
    })

    const docs = result.docs as ProductDoc[]

    for (const product of docs) {
      scanned++

      const nextSku = normalizeSku(product.wpId) || normalizeSku(product.sku) || ''
      const variantsResult = normalizeVariants(product.variants)
      const data: Record<string, unknown> = {}

      if (nextSku !== (product.sku || '')) {
        data.sku = nextSku
      }

      if (variantsResult.changed && variantsResult.variants) {
        data.variants = variantsResult.variants
      }

      if (!Object.keys(data).length) {
        continue
      }

      updated++
      console.log(
        (DRY_RUN ? '[dry-run] ' : '') +
          (product.title || product.slug || product.id) +
          ': sku ' +
          (product.sku || '(empty)') +
          ' -> ' +
          nextSku,
      )

      if (!DRY_RUN) {
        await payload.update({
          collection: 'products',
          id: product.id,
          data,
          overrideAccess: true,
        })
      }
    }

    if (!result.hasNextPage) {
      break
    }

    page++
  }

  console.log('Scanned: ' + scanned)
  console.log((DRY_RUN ? 'Would update: ' : 'Updated: ') + updated)

  if (DRY_RUN) {
    console.log('Run with --yes to write changes.')
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Sync failed:', error)
  process.exit(1)
})
