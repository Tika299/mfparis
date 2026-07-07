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
const KEEP_MEDIA = hasFlag('--keep-media')
const KEEP_ORDERS = hasFlag('--keep-orders')

type ClearCollection =
  | 'voucher-redemptions'
  | 'orders'
  | 'carts'
  | 'reviews'
  | 'posts'
  | 'products'
  | 'post-categories'
  | 'categories'
  | 'brands'
  | 'media'

type ClearTarget = {
  collection: ClearCollection
  label: string
  reason?: string
  skipIds?: Set<string>
}

const dependencyTargets: ClearTarget[] = [
  {
    collection: 'carts',
    label: 'gio hang',
    reason: 'co the tham chieu san pham',
  },
  {
    collection: 'reviews',
    label: 'danh gia',
    reason: 'tham chieu san pham',
  },
  {
    collection: 'voucher-redemptions',
    label: 'luot dung voucher',
    reason: 'tham chieu don hang',
  },
  {
    collection: 'orders',
    label: 'don hang',
    reason:
      'orders_items.product_id dang chan viec xoa products trong database',
  },
]

const importTargets: ClearTarget[] = [
  {
    collection: 'posts',
    label: 'bai viet',
  },
  {
    collection: 'products',
    label: 'san pham',
  },
  {
    collection: 'post-categories',
    label: 'danh muc bai viet',
  },
  {
    collection: 'categories',
    label: 'danh muc san pham',
  },
  {
    collection: 'brands',
    label: 'thuong hieu',
  },
  {
    collection: 'media',
    label: 'anh/media',
  },
]

function getTargets() {
  const dependencies = KEEP_ORDERS
    ? dependencyTargets.filter((target) => target.collection !== 'orders')
    : dependencyTargets

  const imports = KEEP_MEDIA
    ? importTargets.filter((target) => target.collection !== 'media')
    : importTargets

  return [...dependencies, ...imports]
}

async function countCollection(payload: any, collection: ClearCollection) {
  const result = await payload.find({
    collection,
    limit: 1,
    depth: 0,
    pagination: true,
    overrideAccess: true,
  })

  return Number(result.totalDocs || 0)
}

function addMediaId(ids: Set<string>, value: unknown) {
  if (!value) {
    return
  }

  if (typeof value === 'object' && 'id' in value) {
    ids.add(String((value as { id: string | number }).id))
    return
  }

  ids.add(String(value))
}

async function getProtectedMediaIds(payload: any) {
  const ids = new Set<string>()

  try {
    const settings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })

    for (const slider of settings?.heroSliders || []) {
      addMediaId(ids, slider?.imageDesktop)
      addMediaId(ids, slider?.imageTablet)
      addMediaId(ids, slider?.imageMobile)
    }

    addMediaId(ids, settings?.header?.logo)
    addMediaId(ids, settings?.payment?.bankQrImage)
  } catch (error) {
    console.warn(
      'Khong doc duoc site-settings de bao ve media dang dung:',
      error,
    )
  }

  try {
    const fragranceNotes = await payload.find({
      collection: 'fragrance-notes',
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    for (const note of fragranceNotes.docs || []) {
      addMediaId(ids, note?.icon)
    }
  } catch (error) {
    console.warn(
      'Khong doc duoc fragrance-notes de bao ve media dang dung:',
      error,
    )
  }

  return ids
}

async function countDeletableCollection(payload: any, target: ClearTarget) {
  if (!target.skipIds?.size) {
    return countCollection(payload, target.collection)
  }

  const result = await payload.find({
    collection: target.collection,
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  return (result.docs || []).filter(
    (doc: { id: string | number }) => !target.skipIds?.has(String(doc.id)),
  ).length
}

async function clearCollection(payload: any, target: ClearTarget) {
  let totalDeleted = 0
  let totalSkipped = 0

  while (true) {
    const result = await payload.find({
      collection: target.collection,
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    const docs = result.docs || []
    const deletableDocs = docs.filter(
      (doc: { id: string | number }) => !target.skipIds?.has(String(doc.id)),
    )
    totalSkipped = docs.length - deletableDocs.length

    if (deletableDocs.length === 0) {
      break
    }

    for (const doc of deletableDocs) {
      await payload.delete({
        collection: target.collection,
        id: doc.id,
        overrideAccess: true,
      })

      totalDeleted += 1
    }

    console.log(`   Da xoa ${totalDeleted} ${target.label}...`)
  }

  if (totalSkipped > 0) {
    console.log(
      `   Giu lai ${totalSkipped} ${target.label} dang duoc cau hinh site dung.`,
    )
  }

  return totalDeleted
}

async function clearImportedData() {
  if (!YES && !DRY_RUN) {
    console.error(
      'Lenh nay se xoa du lieu import va cac du lieu phu thuoc vao products.',
    )
    console.error('Chay thu truoc: npm run clear:products -- --dry-run')
    console.error('Xoa that: npm run clear:products -- --yes')
    console.error('Neu muon giu media: them --keep-media')
    console.error(
      'Neu muon giu orders: them --keep-orders, nhung products co the khong xoa duoc neu orders dang tham chieu.',
    )
    process.exit(1)
  }

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({
    config: configPromise,
  })

  const protectedMediaIds = KEEP_MEDIA
    ? new Set<string>()
    : await getProtectedMediaIds(payload)
  const targets = getTargets().map((target) =>
    target.collection === 'media'
      ? {
          ...target,
          skipIds: protectedMediaIds,
          reason:
            protectedMediaIds.size > 0
              ? `giu lai ${protectedMediaIds.size} media dang duoc cau hinh khac dung`
              : target.reason,
        }
      : target,
  )
  const counts: Record<string, number> = {}

  console.log('Bat dau clear du lieu import...')
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Keep media: ${KEEP_MEDIA ? 'yes' : 'no'}`)
  console.log(`Keep orders: ${KEEP_ORDERS ? 'yes' : 'no'}`)

  for (const target of targets) {
    counts[target.collection] = await countDeletableCollection(payload, target)
  }

  console.log('\nSo luong se xoa:')

  for (const target of targets) {
    const reason = target.reason ? ` (${target.reason})` : ''

    console.log(
      `   ${target.collection}: ${counts[target.collection] || 0}${reason}`,
    )
  }

  if (DRY_RUN) {
    console.log('\nDry run xong. Chua xoa du lieu nao.')
    process.exit(0)
  }

  for (const target of targets) {
    console.log(`\nDang xoa ${target.label} (${target.collection})...`)

    const deletedCount = await clearCollection(payload, target)

    console.log(`Da xoa ${deletedCount} ${target.label}.`)
  }

  console.log('\nClear du lieu import hoan tat.')
  process.exit(0)
}

clearImportedData().catch((error) => {
  console.error('Clear du lieu import that bai:', error)
  process.exit(1)
})
