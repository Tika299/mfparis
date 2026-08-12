import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { parseDocument } from 'htmlparser2'
import serialize from 'dom-serializer'
import { Element, Text, type Node } from 'domhandler'
import { getPayload } from 'payload'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

type CollectionSlug = 'posts' | 'products' | 'brands' | 'categories' | 'post-categories'

type FieldConfig = {
  path: string
}

type CollectionConfig = {
  slug: CollectionSlug
  titleFields: string[]
  fields: FieldConfig[]
}

type AnyRecord = Record<string, any>

type RepairItem = {
  collection: CollectionSlug
  docId: string | number
  title: string
  field: string
  href: string
  anchor: string
  reason: string
}

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = '') => {
  const prefix = `${name}=`
  const found = args.find((arg) => arg.startsWith(prefix))

  return found ? found.slice(prefix.length) : fallback
}

const YES = hasFlag('--yes')
const DRY_RUN = !YES || hasFlag('--dry-run')
const INCLUDE_INTERNAL_HREFS = hasFlag('--include-internal-hrefs')
const ONLY = getArg('--only', '')
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const OUTPUT_DIR = path.resolve(getArg('--out-dir', 'src/scripts/reports'))
const CSV_OUTPUT = path.resolve(
  OUTPUT_DIR,
  getArg('--csv', 'repair-internal-link-anchors.csv'),
)

const BLOCKED_TAGS = new Set([
  'a',
  'button',
  'script',
  'style',
  'textarea',
  'pre',
  'code',
  'kbd',
  'samp',
  'select',
  'option',
  'input',
  'label',
  'iframe',
  'noscript',
  'nav',
  'header',
  'footer',
  'form',
  'strong',
  'b',
  'em',
  'i',
  'figcaption',
  'caption',
  'summary',
  'details',
  'svg',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
])

const BLOCKED_CLASS_TOKENS = new Set([
  'breadcrumb',
  'breadcrumbs',
  'toc',
  'table-of-contents',
  'product-title',
  'product-name',
  'product-card',
  'post-title',
  'post-card',
  'entry-title',
  'page-title',
  'card-title',
  'menu',
  'nav',
  'button',
  'btn',
  'wp-block-button',
])

const GENERIC_ANCHOR_PHRASES = new Set([
  'san pham',
  'thuong hieu',
  'danh muc',
  'bai viet',
  'nuoc hoa',
  'my pham',
  'cham soc da',
  'hang phap',
  'chinh hang',
  'cao cap',
  'tot nhat',
  'nen mua',
  'tai day',
  'xem them',
  'chi tiet',
  'click vao day',
  'san pham nay',
  'dong nay',
  'loai nay',
  'chai nay',
  'mui nay',
  'tham khao',
  'doc tiep',
])

const GENERIC_ANCHOR_WORDS = new Set([
  'san',
  'pham',
  'thuong',
  'hieu',
  'danh',
  'muc',
  'bai',
  'viet',
  'nuoc',
  'hoa',
  'my',
  'chinh',
  'hang',
  'cao',
  'cap',
  'tot',
  'nhat',
  'mua',
  'gia',
  'review',
  'xem',
  'them',
  'tai',
  'day',
  'chi',
  'tiet',
])

const PRODUCT_CONTEXT_HINTS = new Set([
  'edp',
  'edt',
  'edc',
  'eau',
  'parfum',
  'perfume',
  'toilette',
  'cologne',
  'extrait',
  'intense',
  'absolu',
  'elixir',
  'le',
  'la',
  'pour',
  'homme',
  'femme',
  'black',
  'blue',
  'bleu',
  'sauvage',
  'opium',
  'effaclar',
  'sebiaclear',
  'gel',
  'cream',
  'serum',
  'spf',
  'ml',
  '100ml',
  '50ml',
])

const BRAND_INTENT_BEFORE_ENDINGS = [
  'thuong hieu',
  'brand',
  'nha mot',
  'cua',
  'tu',
  'den tu',
  'dna cua',
  'phong cach cua',
  'cac dong',
  'nhom',
]

const collectionConfigs: CollectionConfig[] = [
  {
    slug: 'posts',
    titleFields: ['title', 'slug'],
    fields: [{ path: 'content' }],
  },
  {
    slug: 'products',
    titleFields: ['title', 'name', 'slug'],
    fields: [{ path: 'description' }, { path: 'shortDescription' }],
  },
  {
    slug: 'brands',
    titleFields: ['name', 'title', 'slug'],
    fields: [{ path: 'description' }, { path: 'introHtml' }, { path: 'bottomContentHtml' }],
  },
  {
    slug: 'categories',
    titleFields: ['name', 'title', 'slug'],
    fields: [{ path: 'description' }, { path: 'introHtml' }, { path: 'bottomContentHtml' }],
  },
  {
    slug: 'post-categories',
    titleFields: ['title', 'name', 'slug'],
    fields: [{ path: 'description' }, { path: 'introHtml' }, { path: 'bottomContentHtml' }],
  },
]

function selectedCollection(slug: CollectionSlug): boolean {
  if (!ONLY) return true

  return ONLY.split(',').map((item) => item.trim()).filter(Boolean).includes(slug)
}

function normalizeChar(char: string): string {
  return char
    .replace(/Ä‘/g, 'd')
    .replace(/Ä/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeTextWithSpaces(value: string): string {
  return Array.from(value)
    .map((char) => normalizeChar(char))
    .join('')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isElement(node: Node): node is Element {
  return node.type === 'tag'
}

function isText(node: Node): node is Text {
  return node.type === 'text'
}

function getClassTokens(element: Element): string[] {
  const className = element.attribs?.class

  if (typeof className !== 'string') return []

  return className
    .split(/\s+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function hasClass(element: Element, className: string): boolean {
  return getClassTokens(element).includes(className)
}

function hasBlockedClass(element: Element): boolean {
  for (const token of getClassTokens(element)) {
    if (BLOCKED_CLASS_TOKENS.has(token)) return true
    if (token.includes('breadcrumb')) return true
    if (token.includes('product-card')) return true
    if (token.includes('post-card')) return true
    if (token.includes('related')) return true
  }

  return false
}

function getTextContent(node: Node): string {
  if (isText(node)) return node.data

  if (!('children' in node) || !Array.isArray(node.children)) return ''

  return node.children.map((child) => getTextContent(child as Node)).join('')
}

function getSiblingText(element: Element, direction: 'before' | 'after', limit = 120): string {
  const parent = element.parent

  if (!parent || !('children' in parent) || !Array.isArray(parent.children)) return ''

  const siblings = parent.children as Node[]
  const index = siblings.indexOf(element)

  if (index < 0) return ''

  const selected =
    direction === 'before'
      ? siblings.slice(0, index).reverse()
      : siblings.slice(index + 1)

  let text = ''

  for (const sibling of selected) {
    text = direction === 'before' ? getTextContent(sibling) + text : text + getTextContent(sibling)
    if (text.length >= limit) break
  }

  return direction === 'before' ? text.slice(-limit) : text.slice(0, limit)
}

function isInternalHref(href: string): boolean {
  const normalized = href.trim()

  if (!normalized) return false
  if (normalized.startsWith('/')) return true

  try {
    const url = new URL(normalized)

    return ['mfparis.vn', 'maraisdefrance.vn'].includes(url.hostname.replace(/^www\./, ''))
  } catch {
    return false
  }
}

function isInternalRouteHref(href: string): boolean {
  if (!isInternalHref(href)) return false

  try {
    const url = new URL(href, 'https://mfparis.vn')
    const pathname = url.pathname.replace(/\/+$/u, '')

    return (
      pathname.startsWith('/brands/') ||
      pathname.startsWith('/categories/') ||
      pathname.startsWith('/products/') ||
      pathname.startsWith('/blog/')
    )
  } catch {
    return false
  }
}

function getHrefTargetType(href: string): 'brand' | 'category' | 'product' | 'post' | 'unknown' {
  try {
    const pathname = new URL(href, 'https://mfparis.vn').pathname

    if (pathname.startsWith('/brands/')) return 'brand'
    if (pathname.startsWith('/categories/')) return 'category'
    if (pathname.startsWith('/products/')) return 'product'
    if (pathname.startsWith('/blog/')) return 'post'
  } catch {
    return 'unknown'
  }

  return 'unknown'
}

function getBlockedAncestorReason(element: Element): string {
  let current = element.parent

  while (current) {
    if (isElement(current)) {
      const tagName = current.name.toLowerCase()

      if (/^h[1-6]$/.test(tagName)) return 'inside_heading'
      if (BLOCKED_TAGS.has(tagName)) return `inside_${tagName}`
      if (hasBlockedClass(current)) return 'inside_blocked_ui'
    }

    current = current.parent
  }

  return ''
}

function isGenericAnchorText(anchorText: string): boolean {
  const normalized = normalizeTextWithSpaces(anchorText)
  const words = normalized.split(' ').filter(Boolean)

  if (!normalized || normalized.length < 3) return true
  if (GENERIC_ANCHOR_PHRASES.has(normalized)) return true
  if (words.length <= 2 && words.every((word) => GENERIC_ANCHOR_WORDS.has(word))) return true

  return false
}

function hasBrandIntent(before: string): boolean {
  const normalizedBefore = normalizeTextWithSpaces(before)

  return BRAND_INTENT_BEFORE_ENDINGS.some((ending) => normalizedBefore.endsWith(ending))
}

function hasProductNameContinuation(rawAfter: string): boolean {
  const tokens = rawAfter
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)

  if (tokens.length < 2) return false

  const titleLikeCount = tokens.filter((token) => /^[A-Z0-9À-Ỵ]/.test(token)).length

  return titleLikeCount >= 2
}

function isLikelyProductNameFragment(element: Element, targetType: string): boolean {
  if (targetType !== 'brand' && targetType !== 'category') return false

  const before = getSiblingText(element, 'before', 80)
  const after = getSiblingText(element, 'after', 120)

  if (targetType === 'brand' && hasBrandIntent(before)) return false

  const afterWords = normalizeTextWithSpaces(after).split(' ').filter(Boolean).slice(0, 8)

  if (afterWords.some((word) => PRODUCT_CONTEXT_HINTS.has(word))) return true
  if (targetType === 'brand' && hasProductNameContinuation(after)) return true

  return false
}

function unwrapElement(element: Element): void {
  const parent = element.parent

  if (!parent || !('children' in parent) || !Array.isArray(parent.children)) return

  const children = (element.children || []) as Node[]
  const siblings = parent.children as Node[]
  const index = siblings.indexOf(element)

  if (index < 0) return

  siblings.splice(index, 1, ...children)

  for (const child of children) {
    child.parent = parent
  }
}

function walk(node: Node, callback: (node: Element) => void): void {
  if (isElement(node)) {
    callback(node)
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of [...node.children]) {
      walk(child as Node, callback)
    }
  }
}

function repairHtml(
  html: string,
  context: Omit<RepairItem, 'href' | 'anchor' | 'reason'>,
): { html: string; changed: boolean; items: RepairItem[] } {
  if (!html || !html.includes('<a')) {
    return { html, changed: false, items: [] }
  }

  const document = parseDocument(html, { decodeEntities: false })
  const anchorsToUnwrap: Array<{ element: Element; item: RepairItem }> = []

  walk(document as unknown as Node, (element) => {
    if (element.name.toLowerCase() !== 'a') return

    const href = String(element.attribs?.href || '')
    if (!isInternalRouteHref(href)) return

    const anchor = getTextContent(element).replace(/\s+/g, ' ').trim()
    const hasInternalLinkClass = hasClass(element, 'internal-link')
    const blockedReason = getBlockedAncestorReason(element)

    let reason = ''

    if (blockedReason) {
      reason = blockedReason
    } else if (hasInternalLinkClass || INCLUDE_INTERNAL_HREFS) {
      if (isGenericAnchorText(anchor)) {
        reason = 'generic_anchor'
      } else if (isLikelyProductNameFragment(element, getHrefTargetType(href))) {
        reason = 'product_name_fragment'
      }
    }

    if (!reason) return

    anchorsToUnwrap.push({
      element,
      item: {
        ...context,
        href,
        anchor,
        reason,
      },
    })
  })

  for (const item of anchorsToUnwrap) {
    unwrapElement(item.element)
  }

  if (!anchorsToUnwrap.length) {
    return { html, changed: false, items: [] }
  }

  return {
    html: serialize(document, { encodeEntities: false }),
    changed: true,
    items: anchorsToUnwrap.map((item) => item.item),
  }
}

function getValue(doc: AnyRecord, fieldPath: string): unknown {
  return fieldPath.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined

    return (current as AnyRecord)[segment]
  }, doc)
}

function setValue(doc: AnyRecord, fieldPath: string, value: unknown): void {
  const segments = fieldPath.split('.')
  let current = doc

  for (const segment of segments.slice(0, -1)) {
    if (!current[segment] || typeof current[segment] !== 'object') {
      current[segment] = {}
    }

    current = current[segment]
  }

  current[segments[segments.length - 1]] = value
}

function getTitle(doc: AnyRecord, fields: string[]): string {
  for (const field of fields) {
    const value = doc[field]

    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return `#${String(doc.id || '')}`
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function writeReport(items: RepairItem[]): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const lines = [
    ['collection', 'docId', 'title', 'field', 'reason', 'anchor', 'href'].map(csvEscape).join(','),
    ...items.map((item) =>
      [
        item.collection,
        item.docId,
        item.title,
        item.field,
        item.reason,
        item.anchor,
        item.href,
      ].map(csvEscape).join(','),
    ),
  ]

  fs.writeFileSync(CSV_OUTPUT, lines.join('\n'), 'utf8')
}

async function main(): Promise<void> {
  const config = (await import('@/payload.config')).default
  const payload = await getPayload({ config })
  const reportItems: RepairItem[] = []
  const summary = {
    scanned: 0,
    matchedDocs: 0,
    changedDocs: 0,
    unwrappedLinks: 0,
    failed: 0,
  }

  console.log('Repair unsafe internal link anchors')
  console.log('Dry run:', DRY_RUN ? 'yes' : 'no')
  console.log('Include internal hrefs without class:', INCLUDE_INTERNAL_HREFS ? 'yes' : 'no')
  console.log('Only:', ONLY || 'all')

  for (const collection of collectionConfigs.filter((item) => selectedCollection(item.slug))) {
    let page = 1
    let hasNextPage = true
    let scannedInCollection = 0

    while (hasNextPage) {
      const result = await payload.find({
        collection: collection.slug as any,
        depth: 0,
        limit: PAGE_SIZE,
        page,
        overrideAccess: true,
      })

      for (const rawDoc of result.docs as AnyRecord[]) {
        if (LIMIT > 0 && scannedInCollection >= LIMIT) break

        summary.scanned += 1
        scannedInCollection += 1

        const title = getTitle(rawDoc, collection.titleFields)
        const data: AnyRecord = {}
        let docChanged = false
        const docItems: RepairItem[] = []

        for (const field of collection.fields) {
          const value = getValue(rawDoc, field.path)

          if (typeof value !== 'string' || !value.includes('<a')) continue

          const repaired = repairHtml(value, {
            collection: collection.slug,
            docId: rawDoc.id,
            title,
            field: field.path,
          })

          if (!repaired.changed) continue

          docChanged = true
          setValue(data, field.path, repaired.html)
          docItems.push(...repaired.items)
        }

        if (!docChanged) continue

        summary.matchedDocs += 1
        summary.unwrappedLinks += docItems.length
        reportItems.push(...docItems)

        if (!DRY_RUN) {
          try {
            await payload.update({
              collection: collection.slug as any,
              id: rawDoc.id,
              data,
              depth: 0,
              overrideAccess: true,
            })

            summary.changedDocs += 1
          } catch (error) {
            summary.failed += 1
            console.error(
              `Update failed ${collection.slug} #${String(rawDoc.id)}:`,
              error instanceof Error ? error.message : error,
            )
          }
        }
      }

      if (LIMIT > 0 && scannedInCollection >= LIMIT) break

      hasNextPage = Boolean((result as any).hasNextPage)
      page += 1
    }
  }

  writeReport(reportItems)

  console.log('\nDone.')
  console.log(JSON.stringify(summary, null, 2))
  console.log('Report:', CSV_OUTPUT)

  if (DRY_RUN) {
    console.log('\nDry-run xong. Neu dung, chay lai voi --yes de cap nhat database.')
  }
}

main().catch((error) => {
  console.error('Repair unsafe internal links failed:', error)
  process.exit(1)
})
