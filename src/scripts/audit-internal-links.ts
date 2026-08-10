import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import {
  getInternalPathFromRedirectTarget,
  normalizeRedirectDestination,
  normalizeRedirectPathname,
  normalizeRedirectSource,
} from '@/utilities/redirects'

type CollectionSlug =
  | 'products'
  | 'posts'
  | 'brands'
  | 'categories'
  | 'post-categories'

type ContentFieldKind = 'html' | 'url'

type ContentFieldConfig = {
  path: string
  kind: ContentFieldKind
}

type CollectionConfig = {
  slug: CollectionSlug
  routePrefix: string
  titleFields: string[]
  fields: ContentFieldConfig[]
}

type AnyRecord = Record<string, unknown>

type PayloadFindResult = {
  docs: unknown[]
  hasNextPage?: boolean
}

type PayloadLike = {
  find(input: AnyRecord): Promise<PayloadFindResult>
  findByID(input: AnyRecord): Promise<unknown>
  update(input: AnyRecord): Promise<unknown>
}

type RouteResolution =
  | {
      status: 'ok'
      routeType: string
      targetPath: string
      targetTitle?: string
    }
  | {
      status: 'redirect'
      routeType: string
      targetPath: string
      targetTitle?: string
      reason: string
    }
  | {
      status: 'broken'
      routeType: string
      reason: string
    }
  | {
      status: 'ignored'
      routeType: string
      reason: string
    }

type LinkCandidate = {
  collection: CollectionSlug
  docId: string | number
  docTitle: string
  docSlug?: string
  sourceUrl: string
  fieldPath: string
  kind: ContentFieldKind
  rawHref: string
  normalizedPath: string
  anchorText: string
}

type AuditResult = LinkCandidate & {
  status: 'ok' | 'redirect' | 'broken' | 'ignored' | 'repaired' | 'repairable'
  routeType: string
  reason: string
  replacement: string
  repairSource: string
  httpStatus: number | ''
  httpFinalUrl: string
  httpReason: string
}

type Replacement = {
  to: string
  source: string
}

const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(name)
const getArg = (name: string, fallback = ''): string => {
  const prefix = `${name}=`
  const found = args.find((arg) => arg.startsWith(prefix))

  return found ? found.slice(prefix.length) : fallback
}

const PAGE_SIZE = Math.max(1, Math.min(200, Number(getArg('--page-size', '100')) || 100))
const LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const ONLY = getArg('--only', '')
const OUTPUT_DIR = path.resolve(getArg('--out-dir', 'src/scripts/reports'))
const CSV_OUTPUT = path.resolve(OUTPUT_DIR, getArg('--csv', 'internal-links-audit.csv'))
const JSON_OUTPUT = path.resolve(OUTPUT_DIR, getArg('--json', 'internal-links-audit.json'))
const BASE_URL = (
  getArg(
    '--base-url',
    process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      'https://mfparis.vn',
  ) || 'https://mfparis.vn'
).replace(/\/+$/u, '')
const MAP_FILE = getArg('--map', '')
const REPAIR = hasFlag('--repair')
const YES = hasFlag('--yes')
const HELP = hasFlag('--help')
const INCLUDE_OK = hasFlag('--include-ok')
const INCLUDE_IGNORED = hasFlag('--include-ignored')
const INCLUDE_REDIRECTS = hasFlag('--include-redirects')
const CHECK_HTTP = hasFlag('--check-http')
const TIMEOUT_MS = Math.max(1000, Number(getArg('--timeout-ms', '12000')) || 12000)
const CONCURRENCY = Math.max(1, Math.min(20, Number(getArg('--concurrency', '6')) || 6))
const DRY_RUN = !REPAIR || !YES || hasFlag('--dry-run')

function printHelp(): void {
  console.log(`
Audit internal links in Payload HTML content.

Usage:
  npm run audit:internal-links
  npm run audit:internal-links -- --only=posts,products --limit=50
  npm run audit:internal-links -- --repair
  npm run audit:internal-links -- --repair --yes

Default behavior:
  Dry-run. No database writes are made unless both --repair and --yes are present.

Safe flags:
  --dry-run                 Force preview mode, even with --repair.
  --repair                  Plan replacements for trusted mappings.
  --yes                     Apply repairs. Must be combined with --repair.
  --only=posts,products     Limit collections. Supports posts,products,brands,categories,post-categories.
  --limit=100               Limit docs per selected collection.
  --page-size=100           Payload page size, max 200.
  --map=path                CSV from,to or JSON {"from":"to"} manual replacements.
  --include-ok              Include healthy links in CSV report.
  --include-redirects       Include redirected/repairable links in CSV report.
  --check-http              Also request URLs against --base-url to detect runtime HTTP errors.
  --base-url=https://...    Base URL for --check-http.
  --out-dir=path            Report directory. Default src/scripts/reports.
  --csv=name.csv            CSV filename.
  --json=name.json          JSON filename with full results.
`)
}

const collectionConfigs: CollectionConfig[] = [
  {
    slug: 'posts',
    routePrefix: '/blog',
    titleFields: ['title', 'slug'],
    fields: [{ path: 'content', kind: 'html' }],
  },
  {
    slug: 'products',
    routePrefix: '/products',
    titleFields: ['title', 'name', 'slug'],
    fields: [
      { path: 'description', kind: 'html' },
      { path: 'shortDescription', kind: 'html' },
    ],
  },
  {
    slug: 'brands',
    routePrefix: '/brands',
    titleFields: ['name', 'title', 'slug'],
    fields: [
      { path: 'description', kind: 'html' },
      { path: 'introHtml', kind: 'html' },
      { path: 'bottomContentHtml', kind: 'html' },
    ],
  },
  {
    slug: 'categories',
    routePrefix: '/categories',
    titleFields: ['name', 'title', 'slug'],
    fields: [
      { path: 'description', kind: 'html' },
      { path: 'introHtml', kind: 'html' },
      { path: 'bottomContentHtml', kind: 'html' },
    ],
  },
  {
    slug: 'post-categories',
    routePrefix: '/blog/category',
    titleFields: ['title', 'name', 'slug'],
    fields: [
      { path: 'description', kind: 'html' },
      { path: 'introHtml', kind: 'html' },
      { path: 'bottomContentHtml', kind: 'html' },
      { path: 'internalLinks.*.url', kind: 'url' },
    ],
  },
]

function selectedCollection(slug: CollectionSlug): boolean {
  if (!ONLY) {
    return true
  }

  const selected = ONLY.split(',').map((item) => item.trim()).filter(Boolean)

  return selected.includes(slug)
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null
}

function asRecord(value: unknown): AnyRecord | null {
  return isRecord(value) ? value : null
}

function getRelationshipId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  return typeof id === 'string' || typeof id === 'number' ? id : null
}

function getTitle(doc: AnyRecord, fields: string[]): string {
  for (const field of fields) {
    const value = doc[field]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return `#${String(doc.id || '')}`
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getCurrentUrl(config: CollectionConfig, doc: AnyRecord): string {
  const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''

  return slug ? normalizeRedirectPathname(`${config.routePrefix}/${slug}`) : ''
}

function getValuesAtPath(value: unknown, fieldPath: string): Array<{ path: string; value: unknown }> {
  const parts = fieldPath.split('.')

  function visit(current: unknown, index: number, currentPath: string): Array<{ path: string; value: unknown }> {
    if (index >= parts.length) {
      return [{ path: currentPath, value: current }]
    }

    const part = parts[index]

    if (part === '*') {
      if (!Array.isArray(current)) {
        return []
      }

      return current.flatMap((item, itemIndex) =>
        visit(item, index + 1, currentPath ? `${currentPath}.${itemIndex}` : String(itemIndex)),
      )
    }

    if (!isRecord(current)) {
      return []
    }

    return visit(current[part], index + 1, currentPath ? `${currentPath}.${part}` : part)
  }

  return visit(value, 0, '')
}

function setValueAtPath(record: AnyRecord, fieldPath: string, value: unknown): void {
  const parts = fieldPath.split('.')
  let current: AnyRecord | unknown[] = record

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    const nextPart = parts[index + 1]

    if (Array.isArray(current)) {
      const arrayIndex = Number(part)

      if (!current[arrayIndex]) {
        current[arrayIndex] = /^\d+$/u.test(nextPart) ? [] : {}
      }

      current = current[arrayIndex] as AnyRecord | unknown[]
      continue
    }

    if (!isRecord(current[part])) {
      current[part] = /^\d+$/u.test(nextPart) ? [] : {}
    }

    current = current[part] as AnyRecord | unknown[]
  }

  const finalPart = parts[parts.length - 1]

  if (Array.isArray(current)) {
    current[Number(finalPart)] = value
    return
  }

  if (isRecord(current)) {
    current[finalPart] = value
  }
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/"/gu, '&quot;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
}

function getHrefFromTag(tag: string): string {
  const match = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/iu)

  return (match?.[1] || match?.[2] || match?.[3] || '').trim()
}

function extractHtmlLinks(html: string): Array<{ href: string; anchorText: string }> {
  const links: Array<{ href: string; anchorText: string }> = []
  const anchorPattern = /<a\b[^>]*>([\s\S]*?)<\/a>/giu

  for (const match of html.matchAll(anchorPattern)) {
    const tag = match[0].split('>', 1)[0] || ''
    const href = getHrefFromTag(tag)

    if (href) {
      links.push({
        href,
        anchorText: decodeBasicHtmlEntities(stripHtmlTags(match[1] || '')),
      })
    }
  }

  return links
}

function normalizeCandidatePath(rawHref: string): string | null {
  const trimmed = rawHref.trim()

  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    /^(?:mailto|tel|sms|javascript|data|blob):/iu.test(trimmed)
  ) {
    return null
  }

  return normalizeRedirectSource(trimmed)
}

function addCandidate(
  candidates: LinkCandidate[],
  seen: Set<string>,
  input: Omit<LinkCandidate, 'normalizedPath'>,
): void {
  const normalizedPath = normalizeCandidatePath(input.rawHref)

  if (!normalizedPath) {
    return
  }

  const key = [
    input.collection,
    input.docId,
    input.fieldPath,
    input.kind,
    input.rawHref,
    input.anchorText,
  ].join(':')

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  candidates.push({
    ...input,
    normalizedPath,
  })
}

function getStaticFrontendPaths(): Set<string> {
  const root = path.resolve(process.cwd(), 'src/app/(frontend)')
  const paths = new Set<string>(['/'])

  if (!fs.existsSync(root)) {
    return paths
  }

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }

      if (entry.name !== 'page.tsx' && entry.name !== 'route.ts') {
        continue
      }

      const relativeDirectory = path.relative(root, directory)
      const segments = relativeDirectory
        .split(path.sep)
        .filter(Boolean)
        .filter((segment) => !segment.startsWith('(') && !segment.endsWith(')'))

      if (segments.some((segment) => segment.includes('['))) {
        continue
      }

      paths.add(normalizeRedirectPathname(segments.join('/')))
    }
  }

  walk(root)

  return paths
}

async function findBySlug(payload: PayloadLike, collection: CollectionSlug, slug: string): Promise<AnyRecord | null> {
  const result = await payload.find({
    collection,
    depth: 1,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return asRecord(result.docs[0]) ?? null
}

function stripRoutePrefix(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(`${prefix}/`)) {
    return null
  }

  const slug = pathname.slice(prefix.length + 1)

  if (!slug || slug.includes('/')) {
    return null
  }

  return slug
}

async function resolveProductLifecycleRedirect(
  payload: PayloadLike,
  product: AnyRecord,
): Promise<RouteResolution> {
  const visitedProductIds = new Set<string>([String(product.id)])
  let relatedProductValue = product.relatedProduct

  for (let hop = 0; hop < 5; hop += 1) {
    const relatedProductId = getRelationshipId(relatedProductValue)

    if (!relatedProductId) {
      return {
        status: 'broken',
        routeType: 'product',
        reason: 'product discontinued_redirect without relatedProduct',
      }
    }

    if (visitedProductIds.has(String(relatedProductId))) {
      return {
        status: 'broken',
        routeType: 'product',
        reason: 'product discontinued_redirect loop',
      }
    }

    visitedProductIds.add(String(relatedProductId))

    const relatedProduct = asRecord(await payload.findByID({
      collection: 'products',
      id: relatedProductId,
      depth: 1,
      overrideAccess: true,
    }))

    if (!relatedProduct || relatedProduct.status !== 'published' || !relatedProduct.slug) {
      return {
        status: 'broken',
        routeType: 'product',
        reason: 'product discontinued_redirect target missing or unpublished',
      }
    }

    const seoStatus = relatedProduct.seoStatus || 'active'

    if (seoStatus === 'active' || seoStatus === 'temporarily_out_of_stock') {
      return {
        status: 'redirect',
        routeType: 'product',
        targetPath: normalizeRedirectPathname(`/products/${String(relatedProduct.slug)}`),
        targetTitle: getOptionalString(relatedProduct.title),
        reason: 'product lifecycle redirect',
      }
    }

    if (seoStatus !== 'discontinued_redirect') {
      return {
        status: 'broken',
        routeType: 'product',
        reason: `product lifecycle target is ${seoStatus}`,
      }
    }

    relatedProductValue = relatedProduct.relatedProduct
  }

  return {
    status: 'broken',
    routeType: 'product',
    reason: 'product discontinued_redirect chain too long',
  }
}

async function resolveRedirectChain(payload: PayloadLike, sourcePath: string): Promise<Replacement | null> {
  const visitedPaths = new Set<string>()
  let currentPath = sourcePath
  let finalDestination = ''

  for (let hop = 0; hop < 8; hop += 1) {
    if (visitedPaths.has(currentPath)) {
      return null
    }

    visitedPaths.add(currentPath)

    const result = await payload.find({
      collection: 'redirects',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: {
        and: [
          {
            from: {
              equals: currentPath,
            },
          },
          {
            active: {
              equals: true,
            },
          },
        ],
      },
    })

    const redirect = asRecord(result.docs[0])

    if (typeof redirect?.to !== 'string' || !redirect.to.trim()) {
      return finalDestination
        ? {
            to: finalDestination,
            source: 'redirects',
          }
        : null
    }

    const normalizedDestination = normalizeRedirectDestination(redirect.to)

    if (!normalizedDestination) {
      return null
    }

    finalDestination = normalizedDestination

    const nextInternalPath = getInternalPathFromRedirectTarget(normalizedDestination)

    if (!nextInternalPath || normalizedDestination.includes('?')) {
      return {
        to: normalizedDestination,
        source: 'redirects',
      }
    }

    currentPath = nextInternalPath
  }

  return null
}

async function resolveRoute(payload: PayloadLike, staticPaths: Set<string>, pathname: string): Promise<RouteResolution> {
  if (staticPaths.has(pathname)) {
    return {
      status: 'ok',
      routeType: 'static',
      targetPath: pathname,
    }
  }

  const productSlug = stripRoutePrefix(pathname, '/products')

  if (productSlug) {
    const product = await findBySlug(payload, 'products', productSlug)

    if (!product) {
      return {
        status: 'broken',
        routeType: 'product',
        reason: 'product slug not found',
      }
    }

    if (product.status !== 'published') {
      return {
        status: 'broken',
        routeType: 'product',
        reason: `product is not published (${product.status || 'empty status'})`,
      }
    }

    const seoStatus = product.seoStatus || 'active'

    if (seoStatus === 'discontinued_redirect') {
      return resolveProductLifecycleRedirect(payload, product)
    }

    return {
      status: 'ok',
      routeType: 'product',
      targetPath: pathname,
      targetTitle: getOptionalString(product.title),
    }
  }

  const postSlug = stripRoutePrefix(pathname, '/blog')

  if (postSlug && postSlug !== 'category') {
    const post = await findBySlug(payload, 'posts', postSlug)

    return post
      ? {
          status: 'ok',
          routeType: 'post',
          targetPath: pathname,
          targetTitle: getOptionalString(post.title),
        }
      : {
          status: 'broken',
          routeType: 'post',
          reason: 'post slug not found',
        }
  }

  const postCategorySlug = stripRoutePrefix(pathname, '/blog/category')

  if (postCategorySlug) {
    const category = await findBySlug(payload, 'post-categories', postCategorySlug)

    return category
      ? {
          status: 'ok',
          routeType: 'post-category',
          targetPath: pathname,
          targetTitle: getOptionalString(category.title),
        }
      : {
          status: 'broken',
          routeType: 'post-category',
          reason: 'post category slug not found',
        }
  }

  const categorySlug = stripRoutePrefix(pathname, '/categories')

  if (categorySlug) {
    const category = await findBySlug(payload, 'categories', categorySlug)

    return category
      ? {
          status: 'ok',
          routeType: 'category',
          targetPath: pathname,
          targetTitle: getOptionalString(category.name),
        }
      : {
          status: 'broken',
          routeType: 'category',
          reason: 'category slug not found',
        }
  }

  const brandSlug = stripRoutePrefix(pathname, '/brands')

  if (brandSlug) {
    const brand = await findBySlug(payload, 'brands', brandSlug)

    return brand
      ? {
          status: 'ok',
          routeType: 'brand',
          targetPath: pathname,
          targetTitle: getOptionalString(brand.name),
        }
      : {
          status: 'broken',
          routeType: 'brand',
          reason: 'brand slug not found',
        }
  }

  return {
    status: 'broken',
    routeType: 'unknown',
    reason: 'no matching frontend route',
  }
}

async function resolveReplacement(
  payload: PayloadLike,
  staticPaths: Set<string>,
  manualMap: Map<string, string>,
  sourcePath: string,
  routeResolution: RouteResolution,
): Promise<Replacement | null> {
  const manualTarget = manualMap.get(sourcePath)

  if (manualTarget) {
    const manualPath = getInternalPathFromRedirectTarget(manualTarget) || normalizeRedirectSource(manualTarget)

    if (manualPath) {
      const manualResolution = await resolveRoute(payload, staticPaths, manualPath)

      if (manualResolution.status === 'ok' || manualResolution.status === 'redirect') {
        return {
          to: manualResolution.status === 'redirect' ? manualResolution.targetPath : manualPath,
          source: 'manual-map',
        }
      }
    }
  }

  if (routeResolution.status === 'redirect') {
    return {
      to: routeResolution.targetPath,
      source: routeResolution.reason,
    }
  }

  const redirectTarget = await resolveRedirectChain(payload, sourcePath)

  if (!redirectTarget) {
    return null
  }

  const internalRedirectPath =
    getInternalPathFromRedirectTarget(redirectTarget.to) || normalizeRedirectSource(redirectTarget.to)

  if (!internalRedirectPath) {
    return null
  }

  const redirectResolution = await resolveRoute(payload, staticPaths, internalRedirectPath)

  if (redirectResolution.status !== 'ok' && redirectResolution.status !== 'redirect') {
    return null
  }

  return {
    to: redirectResolution.status === 'redirect' ? redirectResolution.targetPath : internalRedirectPath,
    source: redirectTarget.source,
  }
}

async function collectCandidates(payload: PayloadLike): Promise<LinkCandidate[]> {
  const candidates: LinkCandidate[] = []
  const seen = new Set<string>()

  for (const config of collectionConfigs) {
    if (!selectedCollection(config.slug)) {
      continue
    }

    let page = 1
    let scanned = 0

    while (true) {
      const result = await payload.find({
        collection: config.slug,
        depth: 0,
        limit: PAGE_SIZE,
        page,
        pagination: true,
        overrideAccess: true,
        sort: 'id',
      })

      for (const rawDoc of result.docs || []) {
        const doc = asRecord(rawDoc)

        if (!doc) {
          continue
        }

        scanned += 1

        const docId = getRelationshipId(doc.id) ?? String(doc.id ?? '')
        const docTitle = getTitle(doc, config.titleFields)
        const sourceUrl = getCurrentUrl(config, doc)
        const docSlug = getOptionalString(doc.slug)

        for (const field of config.fields) {
          for (const fieldValue of getValuesAtPath(doc, field.path)) {
            if (typeof fieldValue.value !== 'string' || !fieldValue.value.trim()) {
              continue
            }

            if (field.kind === 'html') {
              for (const link of extractHtmlLinks(fieldValue.value)) {
                addCandidate(candidates, seen, {
                  collection: config.slug,
                  docId,
                  docTitle,
                  docSlug,
                  sourceUrl,
                  fieldPath: fieldValue.path,
                  kind: field.kind,
                  rawHref: link.href,
                  anchorText: link.anchorText,
                })
              }
            } else {
              addCandidate(candidates, seen, {
                collection: config.slug,
                docId,
                docTitle,
                docSlug,
                sourceUrl,
                fieldPath: fieldValue.path,
                kind: field.kind,
                rawHref: fieldValue.value,
                anchorText: '',
              })
            }
          }
        }

        if (LIMIT && scanned >= LIMIT) {
          break
        }
      }

      if ((LIMIT && scanned >= LIMIT) || !result.hasNextPage) {
        break
      }

      page += 1
    }
  }

  return candidates
}

function replaceHrefInHtml(html: string, replacements: Map<string, string>): string {
  return html.replace(/<a\b[^>]*>/giu, (tag) => {
    const hrefMatch = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/iu)

    if (!hrefMatch) {
      return tag
    }

    const href = (hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '').trim()
    const normalizedPath = href ? normalizeCandidatePath(href) : null
    const replacement = normalizedPath ? replacements.get(normalizedPath) : undefined

    if (!replacement) {
      return tag
    }

    return `${tag.slice(0, hrefMatch.index)}href="${escapeAttribute(replacement)}"${tag.slice(
      (hrefMatch.index || 0) + hrefMatch[0].length,
    )}`
  })
}

async function applyRepairs(payload: PayloadLike, results: AuditResult[]): Promise<void> {
  const repairable = results.filter((result) => result.replacement)
  const byDoc = new Map<string, AuditResult[]>()

  for (const result of repairable) {
    const key = `${result.collection}:${result.docId}`
    const items = byDoc.get(key) ?? []
    items.push(result)
    byDoc.set(key, items)
  }

  for (const items of byDoc.values()) {
    const first = items[0]
    const currentDoc = asRecord(await payload.findByID({
      collection: first.collection,
      id: first.docId,
      depth: 0,
      overrideAccess: true,
    }))

    if (!currentDoc) {
      continue
    }
    const patch: AnyRecord = {}
    const fieldPaths = [...new Set(items.map((item) => item.fieldPath))]

    for (const fieldPath of fieldPaths) {
      const fieldItems = items.filter((item) => item.fieldPath === fieldPath)
      const currentValue = getValuesAtPath(currentDoc, fieldPath)[0]?.value

      if (typeof currentValue !== 'string') {
        continue
      }

      const replacementMap = new Map<string, string>()

      for (const item of fieldItems) {
        replacementMap.set(item.normalizedPath, item.replacement)
      }

      const nextValue =
        fieldItems[0].kind === 'html'
          ? replaceHrefInHtml(currentValue, replacementMap)
          : replacementMap.get(normalizeCandidatePath(currentValue) || '') || currentValue

      if (nextValue !== currentValue) {
        const topLevelField = fieldPath.split('.')[0]

        if (fieldPath.includes('.') && !(topLevelField in patch)) {
          patch[topLevelField] = cloneValue(currentDoc[topLevelField])
        }

        setValueAtPath(patch, fieldPath, nextValue)
      }
    }

    if (Object.keys(patch).length === 0) {
      continue
    }

    await payload.update({
      collection: first.collection,
      id: first.docId,
      overrideAccess: true,
      data: patch,
    })
  }
}

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; MFParisInternalLinkAudit/1.0; +https://mfparis.vn)',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function auditHttp(pathname: string): Promise<Pick<AuditResult, 'httpStatus' | 'httpFinalUrl' | 'httpReason'>> {
  if (!CHECK_HTTP) {
    return {
      httpStatus: '',
      httpFinalUrl: '',
      httpReason: '',
    }
  }

  const url = new URL(pathname, BASE_URL)

  try {
    let response = await fetchWithTimeout(url.toString(), 'HEAD')

    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url.toString(), 'GET')
    }

    return {
      httpStatus: response.status,
      httpFinalUrl: response.url,
      httpReason: response.status >= 200 && response.status < 400 ? 'http ok' : `http ${response.status}`,
    }
  } catch (error: unknown) {
    const errorRecord = isRecord(error) ? error : {}
    const errorName = typeof errorRecord.name === 'string' ? errorRecord.name : ''
    const errorMessage = typeof errorRecord.message === 'string' ? errorRecord.message : String(error)

    return {
      httpStatus: '',
      httpFinalUrl: '',
      httpReason: errorName === 'AbortError' ? 'timeout' : errorMessage,
    }
  }
}

async function runLimited<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index
      index += 1
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, runWorker))

  return results
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }

      continue
    }

    if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())

  return values
}

function loadManualMap(filePath: string): Map<string, string> {
  const map = new Map<string, string>()

  if (!filePath) {
    return map
  }

  const resolvedPath = path.resolve(filePath)
  const raw = fs.readFileSync(resolvedPath, 'utf8')

  if (resolvedPath.endsWith('.json')) {
    const parsed = JSON.parse(raw)

    for (const [from, to] of Object.entries(parsed)) {
      if (typeof to !== 'string') {
        continue
      }

      const normalizedFrom = normalizeRedirectSource(from)

      if (normalizedFrom) {
        map.set(normalizedFrom, to)
      }
    }

    return map
  }

  const lines = raw.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const [headerLine, ...dataLines] = lines
  const headers = parseCsvLine(headerLine ?? '')
  const fromIndex = headers.indexOf('from')
  const toIndex = headers.indexOf('to')

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error('Mapping CSV must include from,to headers.')
  }

  for (const line of dataLines) {
    const values = parseCsvLine(line)
    const normalizedFrom = normalizeRedirectSource(values[fromIndex] || '')
    const to = values[toIndex] || ''

    if (normalizedFrom && to) {
      map.set(normalizedFrom, to)
    }
  }

  return map
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')

  if (/[",\r\n]/u.test(text)) {
    return `"${text.replace(/"/gu, '""')}"`
  }

  return text
}

function writeReports(results: AuditResult[], allResults: AuditResult[], summary: AnyRecord): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const headers: Array<keyof AuditResult> = [
    'status',
    'reason',
    'routeType',
    'collection',
    'docId',
    'docTitle',
    'sourceUrl',
    'fieldPath',
    'kind',
    'anchorText',
    'rawHref',
    'normalizedPath',
    'replacement',
    'repairSource',
    'httpStatus',
    'httpFinalUrl',
    'httpReason',
  ]

  const rows = [
    headers.join(','),
    ...results.map((result) => headers.map((header) => csvEscape(result[header])).join(',')),
  ]

  fs.writeFileSync(CSV_OUTPUT, `${rows.join('\n')}\n`, 'utf8')
  fs.writeFileSync(
    JSON_OUTPUT,
    `${JSON.stringify(
      {
        summary,
        results: allResults,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

async function main(): Promise<void> {
  if (HELP) {
    printHelp()
    return
  }

  const [{ default: configPromise }, { getPayload }] = await Promise.all([
    import('@payload-config'),
    import('payload'),
  ])
  const payload = await getPayload({ config: configPromise })
  const staticPaths = getStaticFrontendPaths()
  const manualMap = loadManualMap(MAP_FILE)

  console.log('Audit internal links')
  console.log(`Only: ${ONLY || 'posts,products,brands,categories,post-categories'}`)
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'repair'}`)
  console.log(`HTTP check: ${CHECK_HTTP ? BASE_URL : 'off'}`)
  console.log(`Manual map: ${MAP_FILE || 'none'}`)

  const candidates = await collectCandidates(payload)

  const allResults = await runLimited(candidates, async (candidate): Promise<AuditResult> => {
    const routeResolution = await resolveRoute(payload, staticPaths, candidate.normalizedPath)
    const replacement = await resolveReplacement(
      payload,
      staticPaths,
      manualMap,
      candidate.normalizedPath,
      routeResolution,
    )
    const http = await auditHttp(candidate.normalizedPath)
    const httpBroken = CHECK_HTTP && http.httpStatus !== '' && (http.httpStatus < 200 || http.httpStatus >= 400)
    const needsRepair =
      routeResolution.status === 'broken' || routeResolution.status === 'redirect' || httpBroken
    const baseStatus = replacement && needsRepair
      ? DRY_RUN
        ? 'repairable'
        : 'repaired'
      : httpBroken
        ? 'broken'
        : routeResolution.status

    return {
      ...candidate,
      status: baseStatus,
      routeType: routeResolution.routeType,
      reason:
        httpBroken
          ? http.httpReason
          : 'reason' in routeResolution
          ? routeResolution.reason
          : routeResolution.status,
      replacement: replacement?.to || '',
      repairSource: replacement?.source || '',
      ...http,
    }
  })

  if (!DRY_RUN) {
    await applyRepairs(payload, allResults)
  }

  const reportResults = allResults.filter((result) => {
    if (result.status === 'ok') {
      return INCLUDE_OK
    }

    if (result.status === 'ignored') {
      return INCLUDE_IGNORED
    }

    if (result.status === 'redirect') {
      return INCLUDE_REDIRECTS || Boolean(result.replacement)
    }

    return true
  })

  const summary = {
    checked: allResults.length,
    ok: allResults.filter((item) => item.status === 'ok').length,
    broken: allResults.filter((item) => item.status === 'broken').length,
    redirected: allResults.filter((item) => item.status === 'redirect').length,
    repairable: allResults.filter((item) => item.status === 'repairable').length,
    repaired: allResults.filter((item) => item.status === 'repaired').length,
    dryRun: DRY_RUN,
    csv: CSV_OUTPUT,
    json: JSON_OUTPUT,
  }

  writeReports(reportResults, allResults, summary)

  console.log('')
  console.log('Done.')
  console.log(JSON.stringify(summary, null, 2))

  if (summary.broken > 0) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error('Audit internal links failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
