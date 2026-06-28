import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import pLimit from 'p-limit'

/**
 * File: src/scripts/import-wp-data.ts
 *
 * Đặt các file JSON cùng thư mục với file này:
 * - brands.richtext.json
 * - product-categories.richtext.json
 * - post-categories.json
 * - products.converted.json
 * - posts.richtext.json
 *
 * Lệnh chạy:
 * npm run import:wp -- --only=brands --update
 * npm run import:wp -- --only=product-categories --update
 * npm run import:wp -- --only=products --update
 * npm run import:wp -- --only=posts --update --placeholder-featured
 *
 * Test trước:
 * npm run import:wp -- --only=products --update --limit=20 --skip-media
 */

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const args = process.argv.slice(2)

const getArg = (name: string, fallback = '') => {
    const found = args.find((arg) => arg.startsWith(`${name}=`))
    return found ? found.split('=').slice(1).join('=') : fallback
}

const hasFlag = (name: string) => args.includes(name)

const ONLY = getArg('--only', 'all')
// all | taxonomies | brands | product-categories | post-categories | products | posts

const UPDATE_EXISTING = hasFlag('--update')
const SKIP_MEDIA = hasFlag('--skip-media')
const DRY_RUN = hasFlag('--dry-run')
const USE_PLACEHOLDER_FEATURED = hasFlag('--placeholder-featured')
const DISABLE_FALLBACK_BRAND = hasFlag('--no-fallback-brand')

const KEEP_RAW_WP = process.env.KEEP_RAW_WP === 'true'

const MEDIA_CONCURRENCY = Math.max(1, Number(getArg('--media-concurrency', '2')) || 2)
const ITEM_LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const ITEM_OFFSET = Math.max(0, Number(getArg('--offset', '0')) || 0)

const mediaLimit = pLimit(MEDIA_CONCURRENCY)

const WP_BASE_URL = 'https://mfparis.vn'

const DATA_FILES = {
    brands: 'brands.richtext.json',
    productCategories: 'product-categories.richtext.json',
    postCategories: 'post-categories.json',
    products: 'products.converted.json',
    posts: 'posts.richtext.json',
}

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const formatSlug = (val: string): string =>
    String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/&/g, ' va ')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

const makeSafeSlug = (val: string, fallbackId?: string | number): string => {
    let slug = formatSlug(val)

    if (!slug) {
        slug = `item-${fallbackId || Date.now()}`
    }

    if (slug.length > 150) {
        slug = slug.slice(0, 150).replace(/-+$/g, '')
    }

    if (!slug) {
        slug = `item-${fallbackId || Date.now()}`
    }

    return slug
}

const stripHTML = (html: string) =>
    html
        ? String(html)
            .replace(/<\/?[^>]+(>|$)/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : ''

const toNumber = (value: any, fallback = 0) => {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
}

const withoutUndefined = (obj: AnyRecord) => {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined))
}

const withWpRaw = (data: AnyRecord, item: AnyRecord) => {
    if (!KEEP_RAW_WP) return data

    return {
        ...data,
        wpId: item.id,
        wpLink: item.link || item.permalink || item._links?.self?.[0]?.href || '',
        wpRaw: item,
    }
}

const applySlice = <T>(items: T[]) => {
    const offsetItems = ITEM_OFFSET > 0 ? items.slice(ITEM_OFFSET) : items
    return ITEM_LIMIT > 0 ? offsetItems.slice(0, ITEM_LIMIT) : offsetItems
}

const readJSON = <T = any>(filename: string): T[] => {
    const filePath = path.resolve(__dirname, filename)

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Không tìm thấy file: ${filePath}`)
        return []
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)

    if (!Array.isArray(data)) {
        console.warn(`⚠️ File không phải array JSON: ${filePath}`)
        return []
    }

    return applySlice(data)
}

const emptyRichText = () => ({
    root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        children: [],
        direction: null,
    },
})

const plainTextToRichText = (text: string) => {
    const value = String(text || '').trim()

    if (!value) return emptyRichText()

    return {
        root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: null,
            children: [
                {
                    type: 'paragraph',
                    format: '',
                    indent: 0,
                    version: 1,
                    direction: null,
                    textFormat: 0,
                    textStyle: '',
                    children: [
                        {
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text: value,
                            type: 'text',
                            version: 1,
                        },
                    ],
                },
            ],
        },
    }
}

const hasRichTextContent = (content: any) => {
    return (
        content &&
        typeof content === 'object' &&
        content.root &&
        Array.isArray(content.root.children) &&
        content.root.children.length > 0
    )
}

const extractTextFromLexicalNode = (node: any): string => {
    if (!node) return ''

    if (typeof node.text === 'string') {
        return node.text
    }

    if (Array.isArray(node.children)) {
        return node.children
            .map((child: any) => extractTextFromLexicalNode(child))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    return ''
}

const extractParagraphsFromRichText = (content: any): string[] => {
    if (!hasRichTextContent(content)) return []

    return content.root.children
        .map((node: any) => extractTextFromLexicalNode(node))
        .map((text: string) => text.trim())
        .filter(Boolean)
}

const textToSafeRichText = (paragraphs: string[]) => {
    const cleanParagraphs = paragraphs
        .map((text) => String(text || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)

    if (cleanParagraphs.length === 0) return undefined

    return {
        root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: null,
            children: cleanParagraphs.map((text) => ({
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                direction: null,
                textFormat: 0,
                textStyle: '',
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text,
                        type: 'text',
                        version: 1,
                    },
                ],
            })),
        },
    }
}

const cleanRichTextNode = (node: any): any => {
    if (!node?.type) return null

    if (node.type === 'upload') {
        return null
    }

    if (node.type === 'paragraph') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            ...node,
            type: 'paragraph',
            version: node.version || 1,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            textFormat: node.textFormat || 0,
            textStyle: node.textStyle || '',
            children,
        }
    }

    if (node.type === 'heading') {
        return {
            ...node,
            type: 'heading',
            tag: node.tag || 'h2',
            version: node.version || 1,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            children: Array.isArray(node.children)
                ? node.children.map(cleanRichTextNode).filter(Boolean)
                : [],
        }
    }

    if (node.type === 'list') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            ...node,
            type: 'list',
            version: node.version || 1,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            listType: node.listType || 'bullet',
            tag: node.tag || 'ul',
            start: node.start || 1,
            children,
        }
    }

    if (node.type === 'listitem') {
        return {
            ...node,
            type: 'listitem',
            version: node.version || 1,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            value: node.value || 1,
            children: Array.isArray(node.children)
                ? node.children.map(cleanRichTextNode).filter(Boolean)
                : [],
        }
    }

    if (node.type === 'link') {
        return {
            ...node,
            type: 'link',
            version: node.version || 3,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            fields: {
                linkType: node.fields?.linkType || 'custom',
                newTab: Boolean(node.fields?.newTab),
                url: node.fields?.url || '',
            },
            children: Array.isArray(node.children)
                ? node.children.map(cleanRichTextNode).filter(Boolean)
                : [],
        }
    }

    if (node.type === 'text') {
        return {
            detail: node.detail || 0,
            format: node.format || 0,
            mode: node.mode || 'normal',
            style: node.style || '',
            text: node.text || '',
            type: 'text',
            version: node.version || 1,
        }
    }

    return null
}

/**
 * Dùng cho brand/category/post.
 * Có clean upload pending từ WordPress để tránh invalid field.
 */
const normalizeRichText = (content: any) => {
    if (!hasRichTextContent(content)) return undefined

    const children = content.root.children.map(cleanRichTextNode).filter(Boolean)

    if (!children.length) return undefined

    return {
        root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: null,
            children,
        },
    }
}

/**
 * Dùng riêng cho product.description.
 * Không clean mạnh để giữ block do convertHTMLToLexical tạo ra:
 * heading, paragraph, list, quote, table, hr...
 */
const nodeToPlainText = (node: any): string => {
    if (!node) return ''

    if (typeof node.text === 'string') {
        return node.text
    }

    if (Array.isArray(node.children)) {
        return node.children
            .map(nodeToPlainText)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
    }

    return ''
}

const plainTextBlockToParagraph = (text: string) => {
    const value = String(text || '').replace(/\s+/g, ' ').trim()

    if (!value) return null

    return {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        textFormat: 0,
        textStyle: '',
        children: [
            {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: value,
                type: 'text',
                version: 1,
            },
        ],
    }
}

const cleanProductRichTextNode = (node: any): any => {
    if (!node?.type) return null

    if (node.type === 'text') {
        return {
            detail: node.detail || 0,
            format: node.format || 0,
            mode: node.mode || 'normal',
            style: node.style || '',
            text: node.text || '',
            type: 'text',
            version: node.version || 1,
        }
    }

    if (node.type === 'link') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanProductRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            type: 'link',
            version: node.version || 3,
            direction: node.direction ?? null,
            format: node.format || '',
            indent: node.indent || 0,
            fields: {
                linkType: node.fields?.linkType || 'custom',
                newTab: Boolean(node.fields?.newTab),
                url: node.fields?.url || '',
            },
            children,
        }
    }

    if (node.type === 'paragraph') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanProductRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            type: 'paragraph',
            format: node.format || '',
            indent: node.indent || 0,
            version: node.version || 1,
            direction: node.direction ?? null,
            textFormat: node.textFormat || 0,
            textStyle: node.textStyle || '',
            children,
        }
    }

    if (node.type === 'heading') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanProductRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            type: 'heading',
            tag: node.tag || 'h2',
            format: node.format || '',
            indent: node.indent || 0,
            version: node.version || 1,
            direction: node.direction ?? null,
            children,
        }
    }

    if (node.type === 'list') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanProductRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            type: 'list',
            listType: node.listType || 'bullet',
            tag: node.tag || 'ul',
            start: node.start || 1,
            format: node.format || '',
            indent: node.indent || 0,
            version: node.version || 1,
            direction: node.direction ?? null,
            children,
        }
    }

    if (node.type === 'listitem') {
        const children = Array.isArray(node.children)
            ? node.children.map(cleanProductRichTextNode).filter(Boolean)
            : []

        if (!children.length) return null

        return {
            type: 'listitem',
            value: node.value || 1,
            format: node.format || '',
            indent: node.indent || 0,
            version: node.version || 1,
            direction: node.direction ?? null,
            children,
        }
    }

    /**
     * Các node dễ gây lỗi:
     * table, tablerow, tablecell, quote, horizontalrule, upload, image...
     * Không import thẳng nữa, chuyển về paragraph text để không mất nội dung.
     */
    const text = nodeToPlainText(node)

    return plainTextBlockToParagraph(text)
}

const normalizeProductDescription = (content: any) => {
    if (!hasRichTextContent(content)) return emptyRichText()

    const children = content.root.children
        .map(cleanProductRichTextNode)
        .filter(Boolean)

    if (!children.length) return emptyRichText()

    return {
        root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: null,
            children,
        },
    }
}

const getRankMathMeta = (item: AnyRecord, key: string) => {
    const found = item.meta_data?.find((meta: AnyRecord) => meta.key === key)
    return typeof found?.value === 'string' ? found.value : ''
}

async function findOne(payload: any, collection: string, where: AnyRecord) {
    const result = await payload.find({
        collection: collection as any,
        limit: 1,
        where,
    })

    return result.docs?.[0] || null
}

async function findBySlug(payload: any, collection: string, slug: string) {
    return findOne(payload, collection, {
        slug: {
            equals: slug,
        },
    })
}

async function getAvailableSlug(
    payload: any,
    collection: string,
    desiredSlug: string,
    wpId?: string | number,
    currentId?: string | number,
) {
    const baseSlug = makeSafeSlug(desiredSlug, wpId)
    let candidate = baseSlug
    let index = 2

    while (true) {
        const existing = await findBySlug(payload, collection, candidate)

        if (!existing?.id) return candidate

        if (currentId && String(existing.id) === String(currentId)) return candidate

        if (wpId && !candidate.endsWith(`-${wpId}`)) {
            candidate = makeSafeSlug(`${baseSlug}-${wpId}`, wpId)
        } else {
            candidate = makeSafeSlug(`${baseSlug}-${index}`, wpId)
            index++
        }
    }
}

async function createOrUpdateBySlug(payload: any, collection: string, slug: string, data: AnyRecord) {
    const safeSlug = makeSafeSlug(slug)
    const existing = await findBySlug(payload, collection, safeSlug)

    if (existing?.id) {
        if (!UPDATE_EXISTING) {
            return { id: existing.id, action: 'skip' }
        }

        if (DRY_RUN) {
            return { id: existing.id, action: 'dry-update' }
        }

        const updated = await payload.update({
            collection: collection as any,
            id: existing.id,
            data: {
                ...data,
                slug: safeSlug,
            },
        })

        return { id: updated.id, action: 'update' }
    }

    if (DRY_RUN) {
        return { id: `dry-${safeSlug}`, action: 'dry-create' }
    }

    const created = await payload.create({
        collection: collection as any,
        data: {
            ...data,
            slug: safeSlug,
        },
    })

    return { id: created.id, action: 'create' }
}

async function fetchWithTimeout(url: string, timeoutMs = 30000, accept = 'image/*,*/*') {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': USER_AGENT,
                Accept: accept,
            },
        })
    } finally {
        clearTimeout(timeout)
    }
}

function extractImageFromSrcset(srcset: string | null) {
    if (!srcset) return ''
    const first = srcset.split(',')[0]?.trim()
    if (!first) return ''
    return first.split(/\s+/)[0] || ''
}

async function fetchWPFeaturedMediaUrl(mediaId: string | number | null | undefined) {
    if (!mediaId || Number(mediaId) <= 0) return ''

    try {
        const url = `${WP_BASE_URL}/wp-json/wp/v2/media/${mediaId}?_fields=id,source_url,alt_text,media_details`
        const response = await fetchWithTimeout(url, 30000, 'application/json,*/*')

        if (!response.ok) return ''

        const data: any = await response.json()

        const sourceUrl = data?.source_url
        if (typeof sourceUrl === 'string' && sourceUrl.startsWith('http')) {
            return sourceUrl
        }

        const sizes = data?.media_details?.sizes || {}
        const large = sizes?.large?.source_url
        const full = sizes?.full?.source_url
        const medium = sizes?.medium?.source_url

        return large || full || medium || ''
    } catch {
        return ''
    }
}

async function uploadMedia(payload: any, url: string, alt: string) {
    return mediaLimit(async () => {
        try {
            if (!url || !url.startsWith('http')) return null
            if (SKIP_MEDIA) return null

            const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `${Date.now()}.jpg`)

            try {
                const existing = await findOne(payload, 'media', {
                    filename: {
                        equals: filename,
                    },
                })

                if (existing?.id) return existing.id
            } catch {
                // Bỏ qua nếu collection media không query được filename.
            }

            const response = await fetchWithTimeout(url)

            if (!response.ok) {
                console.log(`   ⚠️ Không tải được ảnh ${response.status}: ${url}`)
                return null
            }

            const contentType = response.headers.get('content-type') || 'image/jpeg'

            if (!contentType.startsWith('image/')) {
                console.log(`   ⚠️ URL không phải ảnh: ${url}`)
                return null
            }

            const buffer = Buffer.from(await response.arrayBuffer())

            if (!buffer.length) return null

            const media = await payload.create({
                collection: 'media',
                data: {
                    alt: alt || 'MF Paris',
                },
                file: {
                    data: buffer,
                    name: filename,
                    mimetype: contentType,
                    size: buffer.length,
                },
            })

            await sleep(50)

            return media.id
        } catch (error: any) {
            console.log(`   ⚠️ Lỗi upload ảnh: ${url}`)
            console.log(`   ${error.message}`)
            return null
        }
    })
}

let cachedFallbackBrandId: string | number | undefined = undefined

async function getFallbackBrand(payload: any) {
    if (DISABLE_FALLBACK_BRAND) return undefined
    if (cachedFallbackBrandId !== undefined) return cachedFallbackBrandId

    const slug = 'khong-xac-dinh'
    const existing = await findBySlug(payload, 'brands', slug)

    if (existing?.id) {
        cachedFallbackBrandId = existing.id
        return cachedFallbackBrandId
    }

    if (DRY_RUN) {
        cachedFallbackBrandId = 'dry-fallback-brand'
        return cachedFallbackBrandId
    }

    const created = await payload.create({
        collection: 'brands',
        data: {
            name: 'Không xác định',
            slug,
            description: plainTextToRichText('Thương hiệu tạm dùng cho dữ liệu import chưa map được brand.'),
        } as any,
    })

    cachedFallbackBrandId = created.id
    return cachedFallbackBrandId
}

async function validateBrandId(payload: any, brandId: any) {
    if (!brandId) return undefined

    try {
        const found = await payload.findByID({
            collection: 'brands',
            id: brandId,
        })

        return found?.id ? found.id : undefined
    } catch {
        return undefined
    }
}

async function ensureBrand(payload: any, brand: AnyRecord) {
    if (!brand) return getFallbackBrand(payload)

    try {
        const slug = makeSafeSlug(brand.slug || brand.name || `brand-${brand.id}`, brand.id)

        const existing = await findBySlug(payload, 'brands', slug)

        if (existing?.id) {
            return existing.id
        }

        const logoId = brand.image?.src ? await uploadMedia(payload, brand.image.src, brand.name) : null

        const data = withWpRaw(
            withoutUndefined({
                name: brand.name || slug,
                slug,
                description: normalizeRichText(brand.description),
                logo: logoId || undefined,
            }),
            brand,
        )

        const result = await createOrUpdateBySlug(payload, 'brands', slug, data)
        const validId = await validateBrandId(payload, result.id)

        return validId || getFallbackBrand(payload)
    } catch (error: any) {
        console.log(`   ⚠️ Không tạo/map được brand: ${brand?.name || brand?.slug || brand?.id || 'unknown'}`)
        console.log(`   ${error.message}`)
        return getFallbackBrand(payload)
    }
}

async function ensureCategory(payload: any, category: AnyRecord) {
    if (!category) return undefined

    const slug = makeSafeSlug(category.slug || category.name || `category-${category.id}`, category.id)

    const existing = await findBySlug(payload, 'categories', slug)

    if (existing?.id) return existing.id

    const result = await createOrUpdateBySlug(
        payload,
        'categories',
        slug,
        withWpRaw(
            withoutUndefined({
                name: category.name || slug,
                slug,
                description: normalizeRichText(category.description),
            }),
            category,
        ),
    )

    return result.id
}

async function createPlaceholderMedia(payload: any) {
    const filename = 'mfparis-placeholder-featured.png'

    try {
        const existing = await findOne(payload, 'media', {
            filename: {
                equals: filename,
            },
        })

        if (existing?.id) return existing.id
    } catch {
        // Bỏ qua nếu không search được filename.
    }

    if (DRY_RUN) return 'dry-placeholder-media'

    const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
    const buffer = Buffer.from(pngBase64, 'base64')

    const media = await payload.create({
        collection: 'media',
        data: {
            alt: 'MF Paris Placeholder',
        },
        file: {
            data: buffer,
            name: filename,
            mimetype: 'image/png',
            size: buffer.length,
        },
    })

    return media.id
}

async function importBrands(payload: any) {
    const brandsData = readJSON<AnyRecord>(DATA_FILES.brands)
    const brandMap = new Map<number, string | number>()

    console.log(`\n📦 Import Brands: ${brandsData.length}`)

    for (const item of brandsData) {
        try {
            const slug = makeSafeSlug(item.slug || item.name || `brand-${item.id}`, item.id)
            const logoId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

            const data = withWpRaw(
                withoutUndefined({
                    name: item.name || slug,
                    slug,
                    description: normalizeRichText(item.description),
                    logo: logoId || undefined,
                }),
                item,
            )

            let result

            try {
                result = await createOrUpdateBySlug(payload, 'brands', slug, data)
            } catch (error: any) {
                const message = String(error?.message || '')

                if (message.includes('Mô tả thương hiệu') || message.includes('description')) {
                    console.log(`   ⚠️ Brand lỗi mô tả: ${item.name}`)
                    console.log(`   ${message}`)

                    const cleanedDescription = normalizeRichText(item.description)

                    const fallbackData = withWpRaw(
                        withoutUndefined({
                            name: item.name || slug,
                            slug,
                            description: cleanedDescription,
                            logo: logoId || undefined,
                        }),
                        item,
                    )

                    result = await createOrUpdateBySlug(payload, 'brands', slug, fallbackData)
                } else {
                    throw error
                }
            }

            brandMap.set(item.id, result.id)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Brand: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Brand lỗi: ${item.name} - ${error.message}`)
        }
    }

    await getFallbackBrand(payload)

    return brandMap
}

async function importProductCategories(payload: any) {
    const categoriesData = readJSON<AnyRecord>(DATA_FILES.productCategories)
    const catMap = new Map<number, string | number>()

    console.log(`\n📦 Import Product Categories: ${categoriesData.length}`)

    for (const item of categoriesData) {
        try {
            const slug = makeSafeSlug(item.slug || item.name || `product-category-${item.id}`, item.id)
            const imageId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

            const data = withWpRaw(
                withoutUndefined({
                    name: item.name || slug,
                    slug,
                    description: normalizeRichText(item.description),
                    image: imageId || undefined,
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'categories', slug, data)
            catMap.set(item.id, result.id)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Product Category: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Product Category lỗi: ${item.name} - ${error.message}`)
        }
    }

    console.log('\n🔗 Cập nhật parent Product Categories nếu collection có field parent...')

    for (const item of categoriesData) {
        try {
            if (!item.parent || item.parent === 0) continue

            const currentId = catMap.get(item.id)
            const parentId = catMap.get(item.parent)

            if (!currentId || !parentId) continue
            if (DRY_RUN) continue

            await payload.update({
                collection: 'categories',
                id: currentId,
                data: {
                    parent: parentId,
                } as any,
            })

            console.log(`   ✅ Parent Product Category: ${item.name}`)
        } catch {
            console.log(`   ⚠️ Bỏ qua parent Product Category: ${item.name}`)
        }
    }

    return catMap
}

async function importPostCategories(payload: any) {
    const categoriesData = readJSON<AnyRecord>(DATA_FILES.postCategories)
    const postCatMap = new Map<number, string | number>()

    console.log(`\n📦 Import Post Categories: ${categoriesData.length}`)

    for (const item of categoriesData) {
        try {
            const slug = makeSafeSlug(item.slug || item.name || `post-category-${item.id}`, item.id)

            const data = withWpRaw(
                withoutUndefined({
                    title: item.name || slug,
                    slug,
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'post-categories', slug, data)
            postCatMap.set(item.id, result.id)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Post Category: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Post Category lỗi: ${item.name} - ${error.message}`)
        }
    }

    console.log('\n🔗 Cập nhật parent Post Categories nếu collection có field parent...')

    for (const item of categoriesData) {
        try {
            if (!item.parent || item.parent === 0) continue

            const currentId = postCatMap.get(item.id)
            const parentId = postCatMap.get(item.parent)

            if (!currentId || !parentId) continue
            if (DRY_RUN) continue

            await payload.update({
                collection: 'post-categories',
                id: currentId,
                data: {
                    parent: parentId,
                } as any,
            })

            console.log(`   ✅ Parent Post Category: ${item.name}`)
        } catch {
            console.log(`   ⚠️ Bỏ qua parent Post Category: ${item.name}`)
        }
    }

    return postCatMap
}

async function saveProductWithRetry(
    payload: any,
    existingProd: AnyRecord | null,
    productData: AnyRecord,
    item: AnyRecord,
) {
    let data = { ...productData }
    let lastError: any = null

    const productName = item.title || item.name || item.slug || item.id || 'Không tên'

    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            if (DRY_RUN) {
                console.log(`   🧪 Dry-run Product: ${productName}`)
                return
            }

            if (existingProd?.id && UPDATE_EXISTING) {
                await payload.update({
                    collection: 'products',
                    id: existingProd.id,
                    data,
                })
            } else {
                await payload.create({
                    collection: 'products',
                    data,
                })
            }

            if (attempt > 1) {
                console.log(`   ✅ Product sau retry: ${productName}`)
            } else {
                console.log(`   ✅ Product: ${productName}`)
            }

            return
        } catch (error: any) {
            lastError = error
            const message = String(error?.message || '')

            let changed = false

            if (message.includes('slug')) {
                const nextSlugBase = `${data.slug || item.slug || item.title || item.name}-${item.id || Date.now()}-${attempt}`

                data.slug = await getAvailableSlug(
                    payload,
                    'products',
                    nextSlugBase,
                    item.id,
                    existingProd?.id,
                )

                console.log(`   ⚠️ Slug lỗi, thử slug mới: ${data.slug}`)
                changed = true
            }

            if (message.includes('Thương hiệu') || message.toLowerCase().includes('brand')) {
                const fallbackBrandId = await getFallbackBrand(payload)

                if (fallbackBrandId && data.brand !== fallbackBrandId) {
                    data.brand = fallbackBrandId
                    console.log(`   ⚠️ Brand lỗi, đổi sang fallback brand.`)
                } else {
                    delete data.brand
                    console.log(`   ⚠️ Brand lỗi, bỏ field brand.`)
                }

                changed = true
            }

            if (message.includes('Danh mục') || message.toLowerCase().includes('categories')) {
                delete data.categories
                console.log(`   ⚠️ Categories lỗi, bỏ field categories.`)
                changed = true
            }

            if (message.includes('Bộ sưu tập hình ảnh') || message.includes('images')) {
                delete data.images
                console.log(`   ⚠️ Images lỗi, bỏ field images.`)
                changed = true
            }

            if (message.includes('Danh sách biến thể') || message.includes('variants')) {
                delete data.variants
                data.productType = 'simple'
                console.log(`   ⚠️ Variants lỗi, đổi về simple và bỏ variants.`)
                changed = true
            }

            if (message.includes('Vị trí trang chủ') || message.includes('displayLocation')) {
                delete data.displayLocation
                console.log(`   ⚠️ Bỏ field displayLocation.`)
                changed = true
            }

            if (message.includes('Mô tả sản phẩm') || message.includes('description')) {
                console.log(`   ⚠️ Description lỗi chi tiết:`)
                console.log(`   ${message}`)

                data.description = emptyRichText()
                console.log(`   ⚠️ Description vẫn lỗi, đổi sang emptyRichText.`)

                changed = true
            }

            if (!changed) {
                break
            }
        }
    }

    throw lastError
}

async function importProducts(payload: any) {
    const productsData = readJSON<AnyRecord>(DATA_FILES.products)

    console.log(`\n📦 Import Products: ${productsData.length}`)

    const getProductName = (item: AnyRecord) => {
        return item.title || item.name || item.slug || item.id || 'Không tên'
    }

    const getImageSource = (img: AnyRecord) => {
        return img?.image?.src || img?.src || img?.thumbnail || ''
    }

    const getImageAlt = (img: AnyRecord, fallback: string) => {
        return img?.image?.alt || img?.image?.name || img?.alt || img?.name || fallback
    }

    const uploadProductImages = async (item: AnyRecord) => {
        const uploadedImages: any[] = []
        const productName = getProductName(item)

        if (!Array.isArray(item.images) || item.images.length === 0) {
            return uploadedImages
        }

        const imageIds = await Promise.all(
            item.images.map((img: AnyRecord) =>
                uploadMedia(
                    payload,
                    getImageSource(img),
                    getImageAlt(img, productName),
                ),
            ),
        )

        imageIds
            .filter((id) => Boolean(id))
            .forEach((id) => {
                uploadedImages.push({ image: id })
            })

        return uploadedImages
    }

    const uploadVariantImage = async (variant: AnyRecord, productName: string) => {
        const image = variant?.image

        if (!image?.src) return undefined

        const mediaId = await uploadMedia(
            payload,
            image.src,
            image.alt || image.name || productName,
        )

        return mediaId || undefined
    }

    const normalizeProductVariants = async (item: AnyRecord) => {
        const productName = getProductName(item)

        if (!Array.isArray(item.variants) || item.variants.length === 0) {
            return []
        }

        const variants = []

        for (const [index, variant] of item.variants.entries()) {
            const imageId = await uploadVariantImage(variant, productName)

            variants.push(
                withoutUndefined({
                    name: variant.name || `Phân loại ${index + 1}`,
                    sku: variant.sku || '',
                    isDefault: Boolean(variant.isDefault),
                    basePrice: toNumber(variant.basePrice, 0),
                    salePrice:
                        variant.salePrice === null ||
                            variant.salePrice === undefined ||
                            variant.salePrice === ''
                            ? undefined
                            : toNumber(variant.salePrice, 0),
                    stock: 99,
                    image: imageId || undefined,
                    isActive: variant.isActive !== false,
                }),
            )
        }

        const hasDefault = variants.some((variant) => variant.isDefault)

        if (!hasDefault && variants.length > 0) {
            variants[0].isDefault = true
        }

        return variants
    }

    const normalizePrice = (item: AnyRecord, variants: AnyRecord[]) => {
        const itemPrice = item.price || {}

        if (item.productType === 'variable' && variants.length > 0) {
            const activeVariants = variants.filter((variant) => variant.isActive !== false)
            const defaultVariant =
                activeVariants.find((variant) => variant.isDefault) ||
                activeVariants[0] ||
                variants[0]

            return {
                basePrice: toNumber(itemPrice.basePrice, toNumber(defaultVariant?.basePrice, 0)),
                salePrice:
                    itemPrice.salePrice === null ||
                        itemPrice.salePrice === undefined ||
                        itemPrice.salePrice === ''
                        ? undefined
                        : toNumber(itemPrice.salePrice, 0),
                stock: 99,
            }
        }

        return {
            basePrice: toNumber(itemPrice.basePrice, 0),
            salePrice:
                itemPrice.salePrice === null ||
                    itemPrice.salePrice === undefined ||
                    itemPrice.salePrice === ''
                    ? undefined
                    : toNumber(itemPrice.salePrice, 0),
            stock: 99,
        }
    }

    const normalizeSpecifications = (item: AnyRecord) => {
        if (!Array.isArray(item.specifications)) return []

        return item.specifications
            .map((spec: AnyRecord) => ({
                label: spec.label || '',
                value: spec.value || '',
            }))
            .filter((spec: AnyRecord) => spec.label && spec.value)
    }

    const normalizeDisplayLocation = (item: AnyRecord) => {
        const allowedValues = ['best-seller', 'combo', 'new-arrival']

        if (!Array.isArray(item.displayLocation)) return []

        return item.displayLocation.filter((value: string) => allowedValues.includes(value))
    }

    for (const item of productsData) {
        const productName = getProductName(item)

        try {
            const baseSlug = makeSafeSlug(
                item.slug || productName || `product-${item.id}`,
                item.id,
            )

            const existingProd = await findBySlug(payload, 'products', baseSlug)

            if (existingProd?.id && !UPDATE_EXISTING) {
                console.log(`   ⏩ Product đã tồn tại: ${productName}`)
                continue
            }

            const productSlug = existingProd?.id
                ? baseSlug
                : await getAvailableSlug(payload, 'products', baseSlug, item.id)

            let brandId: string | number | undefined = undefined

            /**
             * File converted dùng field "brand": []
             * Không còn dùng "brands" như WooCommerce gốc.
             */
            if (Array.isArray(item.brand) && item.brand.length > 0) {
                brandId = await ensureBrand(payload, item.brand[0])
                brandId = await validateBrandId(payload, brandId)
            }

            if (!brandId) {
                brandId = await getFallbackBrand(payload)
            }

            const categoryIds: Array<string | number> = []

            if (Array.isArray(item.categories) && item.categories.length > 0) {
                for (const cat of item.categories) {
                    const categoryId = await ensureCategory(payload, cat)
                    if (categoryId) categoryIds.push(categoryId)
                }
            }

            const uploadedImages = await uploadProductImages(item)

            const productType =
                item.productType === 'variable' && Array.isArray(item.variants) && item.variants.length > 0
                    ? 'variable'
                    : 'simple'

            const variants = productType === 'variable'
                ? await normalizeProductVariants(item)
                : []

            const price = normalizePrice(
                {
                    ...item,
                    productType,
                },
                variants,
            )

            const productData: AnyRecord = {
                title: item.title || productName,
                sku: item.sku || '',
                slug: productSlug,

                brand: brandId,
                categories: categoryIds,

                productType,

                price,

                shortDescription: item.shortDescription || '',

                specifications: normalizeSpecifications(item),

                description: normalizeProductDescription(item.description),

                isCombo: Boolean(item.isCombo),
                comboItems: Array.isArray(item.comboItems) ? item.comboItems : [],

                seoTitle: item.seoTitle || '',
                seoDescription: item.seoDescription || '',

                status: item.status === 'published' || item.status === 'publish'
                    ? 'published'
                    : 'draft',

                displayLocation: normalizeDisplayLocation(item),
            }

            if (uploadedImages.length > 0) {
                productData.images = uploadedImages
            }

            if (productType === 'variable' && variants.length > 0) {
                productData.variants = variants
            }

            /**
             * Nếu chưa muốn import displayLocation thì giữ dòng này.
             * Vì file converted hiện đang là [] nên có hay không đều được.
             */
            if (!productData.displayLocation?.length) {
                delete productData.displayLocation
            }

            const data = withWpRaw(withoutUndefined(productData), item)

            await saveProductWithRetry(payload, existingProd, data, item)
        } catch (error: any) {
            console.error(`   ❌ Product lỗi: ${productName} - ${error.message}`)
        }
    }
}

async function importPosts(payload: any) {
    const postsData = readJSON<AnyRecord>(DATA_FILES.posts)
    const postCategoriesData = readJSON<AnyRecord>(DATA_FILES.postCategories)

    console.log(`\n📦 Import Posts: ${postsData.length}`)

    const wpCatIdToSlug = new Map<number, string>()

    for (const cat of postCategoriesData) {
        wpCatIdToSlug.set(cat.id, cat.slug)
    }

    let placeholderMediaId: string | number | null = null

    if (USE_PLACEHOLDER_FEATURED && !SKIP_MEDIA) {
        placeholderMediaId = await createPlaceholderMedia(payload)
        console.log(`🖼️ Placeholder featured image: ${placeholderMediaId}`)
    }

    for (const item of postsData) {
        try {
            const title = stripHTML(item.title?.rendered || item.title || item.slug || `Post ${item.id}`)
            const baseSlug = makeSafeSlug(item.slug || title || `post-${item.id}`, item.id)
            const existingPost = await findBySlug(payload, 'posts', baseSlug)

            if (existingPost?.id && !UPDATE_EXISTING) {
                console.log(`   ⏩ Post đã tồn tại: ${title}`)
                continue
            }

            const postSlug = existingPost?.id
                ? baseSlug
                : await getAvailableSlug(payload, 'posts', baseSlug, item.id)

            const postCategoryIds: Array<string | number> = []

            if (item.categories && item.categories.length > 0) {
                for (const wpCatId of item.categories) {
                    const slug = wpCatIdToSlug.get(wpCatId)

                    if (!slug) continue

                    const existingCat = await findBySlug(payload, 'post-categories', makeSafeSlug(slug))

                    if (existingCat?.id) {
                        postCategoryIds.push(existingCat.id)
                    }
                }
            }

            const content = normalizeRichText(item.content) || emptyRichText()
            const excerpt = stripHTML(item.excerpt?.rendered || item.excerpt || '')

            let featuredImageId: string | number | null = null

            const featuredImageUrl = await fetchWPFeaturedMediaUrl(item.featured_media)

            if (featuredImageUrl) {
                featuredImageId = await uploadMedia(payload, featuredImageUrl, title)
            }

            if (!featuredImageId && USE_PLACEHOLDER_FEATURED && placeholderMediaId) {
                featuredImageId = placeholderMediaId
            }

            const postData: AnyRecord = {
                title,
                slug: postSlug,
                excerpt,
                content,
                categories: postCategoryIds,
                seo: withoutUndefined({
                    metaTitle: getRankMathMeta(item, 'rank_math_title') || undefined,
                    metaDescription: getRankMathMeta(item, 'rank_math_description') || undefined,
                }),
            }

            if (featuredImageId) {
                postData.thumbnail = featuredImageId
            }

            const data = withWpRaw(withoutUndefined(postData), item)

            if (DRY_RUN) {
                console.log(`   🧪 Dry-run Post: ${title}`)
                continue
            }

            try {
                if (existingPost?.id && UPDATE_EXISTING) {
                    await payload.update({
                        collection: 'posts',
                        id: existingPost.id,
                        data,
                    })
                } else {
                    await payload.create({
                        collection: 'posts',
                        data,
                    })
                }

                console.log(`   ✅ Post: ${title}`)
            } catch (error: any) {
                const message = String(error?.message || '')

                if (message.includes('Ảnh đại diện') || message.includes('thumbnail') || message.includes('featuredImage')) {
                    if (placeholderMediaId) {
                        data.thumbnail = placeholderMediaId

                        if (existingPost?.id && UPDATE_EXISTING) {
                            await payload.update({
                                collection: 'posts',
                                id: existingPost.id,
                                data,
                            })
                        } else {
                            await payload.create({
                                collection: 'posts',
                                data,
                            })
                        }

                        console.log(`   ✅ Post dùng ảnh placeholder: ${title}`)
                    } else {
                        throw error
                    }
                } else {
                    throw error
                }
            }
        } catch (error: any) {
            console.error(`   ❌ Post lỗi: ${item.slug || item.id} - ${error.message}`)
        }
    }
}

async function run() {
    console.log('🚀 Bắt đầu import dữ liệu WordPress / WooCommerce vào Payload...')
    console.log(`👉 Mode: ${ONLY}`)
    console.log(`👉 Update existing: ${UPDATE_EXISTING ? 'Có' : 'Không'}`)
    console.log(`👉 Skip media: ${SKIP_MEDIA ? 'Có' : 'Không'}`)
    console.log(`👉 Keep raw WP: ${KEEP_RAW_WP ? 'Có' : 'Không'}`)
    console.log(`👉 Dry-run: ${DRY_RUN ? 'Có' : 'Không'}`)
    console.log(`👉 Media concurrency: ${MEDIA_CONCURRENCY}`)
    console.log(`👉 Placeholder featured: ${USE_PLACEHOLDER_FEATURED ? 'Có' : 'Không'}`)
    console.log(`👉 Fallback brand: ${DISABLE_FALLBACK_BRAND ? 'Tắt' : 'Bật'}`)
    console.log(`👉 Limit: ${ITEM_LIMIT || 'Không giới hạn'}`)
    console.log(`👉 Offset: ${ITEM_OFFSET}`)

    if (!process.env.PAYLOAD_SECRET) {
        throw new Error('Thiếu PAYLOAD_SECRET trong .env hoặc .env.local')
    }

    const configPromise = (await import('@payload-config')).default
    const payload = await getPayload({ config: configPromise })

    if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'brands') {
        await importBrands(payload)
    }

    if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'product-categories') {
        await importProductCategories(payload)
    }

    if (ONLY === 'all' || ONLY === 'taxonomies' || ONLY === 'post-categories') {
        await importPostCategories(payload)
    }

    if (ONLY === 'all' || ONLY === 'products') {
        await importProducts(payload)
    }

    if (ONLY === 'all' || ONLY === 'posts') {
        await importPosts(payload)
    }

    console.log('\n✨ IMPORT HOÀN TẤT!')
    process.exit(0)
}

run().catch((error) => {
    console.error('\n❌ IMPORT THẤT BẠI:')
    console.error(error)
    process.exit(1)
})