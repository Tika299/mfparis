import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

dotenv.config({ path: path.resolve(projectRoot, '.env') })
dotenv.config({ path: path.resolve(projectRoot, '.env.local') })

const args = process.argv.slice(2)

const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const found = args.find((arg) => arg.startsWith(`${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}

const DRY_RUN = hasFlag('--dry-run')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)

type Target = {
  collection: string
  fields: string[]
}

const TARGETS: Target[] = [
  {
    collection: 'products',
    fields: ['description'],
  },
  {
    collection: 'posts',
    fields: ['content'],
  },
  {
    collection: 'brands',
    fields: ['description'],
  },
  {
    collection: 'categories',
    fields: ['description'],
  },
  {
    collection: 'post-categories',
    fields: ['description'],
  },
]

function getAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'))
  return match?.[1] || ''
}

function removeAttribute(tag: string, attribute: string) {
  return tag.replace(new RegExp(`\\s${attribute}=["'][^"']*["']`, 'gi'), '')
}

function setAttribute(tag: string, attribute: string, value: string) {
  const escapedValue = value.replace(/"/g, '&quot;')
  const attributePattern = new RegExp(`(\\s${attribute}=)["'][^"']*["']`, 'i')

  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, `$1"${escapedValue}"`)
  }

  return tag.replace(/\/?>$/, (ending) => ` ${attribute}="${escapedValue}"${ending}`)
}

function isWoodmartLazyPlaceholder(value: string) {
  return /\/themes\/woodmart\/images\/lazy\.svg(?:$|[?#])/i.test(value)
}

function getRealImageSrc(tag: string) {
  const currentSrc = getAttribute(tag, 'src')
  const dataSrc =
    getAttribute(tag, 'data-src') ||
    getAttribute(tag, 'data-lazy-src') ||
    getAttribute(tag, 'data-original')

  if (dataSrc && (!currentSrc || isWoodmartLazyPlaceholder(currentSrc))) {
    return dataSrc
  }

  return ''
}

function repairHtml(value: unknown) {
  if (typeof value !== 'string' || !value.includes('<img')) {
    return typeof value === 'string' ? value : ''
  }

  return value.replace(/<img\b[^>]*>/gi, (tag) => {
    const realSrc = getRealImageSrc(tag)

    if (!realSrc) {
      return tag
    }

    let nextTag = setAttribute(tag, 'src', realSrc)

    nextTag = removeAttribute(nextTag, 'srcset')
    nextTag = removeAttribute(nextTag, 'data-src')
    nextTag = removeAttribute(nextTag, 'data-lazy-src')
    nextTag = removeAttribute(nextTag, 'data-original')
    nextTag = removeAttribute(nextTag, 'data-srcset')
    nextTag = removeAttribute(nextTag, 'data-lazy-srcset')

    return nextTag
  })
}

async function repairCollection(payload: any, target: Target) {
  let page = 1
  let changed = 0
  let scanned = 0

  while (true) {
    const result = await payload.find({
      collection: target.collection,
      depth: 0,
      limit: 100,
      page,
      overrideAccess: true,
      pagination: true,
    })

    if (!result.docs.length) {
      break
    }

    for (const doc of result.docs as AnyRecord[]) {
      if (LIMIT > 0 && scanned >= LIMIT) {
        return { changed, scanned }
      }

      scanned += 1
      const data: AnyRecord = {}

      for (const field of target.fields) {
        const before = doc[field]
        const after = repairHtml(before)

        if (typeof before === 'string' && after !== before) {
          data[field] = after
        }
      }

      if (Object.keys(data).length === 0) {
        continue
      }

      changed += 1

      if (DRY_RUN) {
        console.log(`[dry-run] ${target.collection} #${doc.id}: repaired ${Object.keys(data).join(', ')}`)
        continue
      }

      await payload.update({
        collection: target.collection,
        id: doc.id,
        data,
        overrideAccess: true,
      })

      console.log(`${target.collection} #${doc.id}: repaired ${Object.keys(data).join(', ')}`)
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  return { changed, scanned }
}

async function run() {
  console.log(`Repair WordPress lazy images`)
  console.log(`Dry run: ${DRY_RUN ? 'yes' : 'no'}`)
  console.log(`Limit: ${LIMIT || 'none'}`)

  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  for (const target of TARGETS) {
    const result = await repairCollection(payload, target)
    console.log(
      `${target.collection}: scanned ${result.scanned}, changed ${result.changed}`,
    )
  }

  process.exit(0)
}

run().catch((error) => {
  console.error('Repair failed:', error)
  process.exit(1)
})
