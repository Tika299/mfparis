import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import pLimit from 'p-limit'

/**
 * File: src/scripts/import-wp-data.ts
 *
 * Đặt các file JSON cùng thư mục với file này:
 * - brands.json
 * - product-categories.json
 * - post-categories.json
 * - products.json
 * - posts.json
 *
 * Lệnh chạy:
 * npm run import:wp:taxonomies
 * npm run import:wp:products
 * npm run import:wp:posts
 *
 * Test trước:
 * npm run import:wp:products -- --limit=20
 *
 * Update lại sản phẩm đã có:
 * npm run import:wp:products -- --update
 *
 * Chạy chậm hơn để tránh Cloudflare/server chặn ảnh:
 * npm run import:wp:products -- --update --media-concurrency=1
 */

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Bắt buộc load env trước khi dynamic import @payload-config
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

// Nếu muốn giữ nguyên JSON gốc, thêm các field wpId, wpLink, wpRaw vào collection rồi bật:
// Linux VPS: KEEP_RAW_WP=true npm run import:wp:products
// Windows CMD: set KEEP_RAW_WP=true && npm run import:wp:products
const KEEP_RAW_WP = process.env.KEEP_RAW_WP === 'true'

const MEDIA_CONCURRENCY = Math.max(1, Number(getArg('--media-concurrency', '2')) || 2)
const ITEM_LIMIT = Math.max(0, Number(getArg('--limit', '0')) || 0)
const ITEM_OFFSET = Math.max(0, Number(getArg('--offset', '0')) || 0)

const mediaLimit = pLimit(MEDIA_CONCURRENCY)

const DATA_FILES = {
    brands: 'brands.json',
    productCategories: 'product-categories.json',
    postCategories: 'post-categories.json',
    products: 'products.json',
    posts: 'posts.json',
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

    // Tránh slug quá dài gây lỗi validate/database index
    if (slug.length > 150) {
        slug = slug.slice(0, 150).replace(/-+$/g, '')
    }

    if (!slug) {
        slug = `item-${fallbackId || Date.now()}`
    }

    return slug
}

const cleanDesc = (text: string) =>
    text ? String(text).replace(/\[html_block.*?\]/g, '').trim() : ''

const stripHTML = (html: string) =>
    html ? String(html).replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim() : ''

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

/**
 * Bọc HTML thô vào Lexical JSON.
 * Cách này ưu tiên giữ nội dung HTML gốc thay vì cố convert phức tạp.
 */
const convertHTMLtoLexical = (html: string) => {
    return {
        root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [
                {
                    type: 'paragraph',
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    textFormat: 0,
                    version: 1,
                    children: [
                        {
                            detail: 0,
                            format: 0,
                            mode: 'normal',
                            style: '',
                            text: cleanDesc(html || ''),
                            type: 'text',
                            version: 1,
                        },
                    ],
                },
            ],
        },
    } as any
}

function parseHTMLToAccordions(html: string) {
    if (!html) return []

    const dom = new JSDOM(html)
    const doc = dom.window.document
    const children = Array.from(doc.body.children)

    const accordions: any[] = []
    let currentTitle = 'Mô tả sản phẩm'
    let currentContent = ''

    if (children.length === 0) {
        return [{ title: currentTitle, content: convertHTMLtoLexical(html) }]
    }

    children.forEach((child, index) => {
        if (child.tagName === 'H2') {
            if (currentContent.trim() !== '') {
                accordions.push({
                    title: currentTitle,
                    content: convertHTMLtoLexical(currentContent),
                })
            }

            currentTitle = child.textContent?.trim() || 'Thông tin'
            currentContent = ''
        } else {
            currentContent += child.outerHTML
        }

        if (index === children.length - 1 && currentContent.trim() !== '') {
            accordions.push({
                title: currentTitle,
                content: convertHTMLtoLexical(currentContent),
            })
        }
    })

    return accordions.length > 0
        ? accordions
        : [{ title: 'Mô tả', content: convertHTMLtoLexical(html) }]
}

function extractImageFromSrcset(srcset: string | null) {
    if (!srcset) return ''
    const first = srcset.split(',')[0]?.trim()
    if (!first) return ''
    return first.split(/\s+/)[0] || ''
}

function extractFirstImageFromHTML(html: string) {
    if (!html) return ''

    const dom = new JSDOM(html)
    const img = dom.window.document.querySelector('img')

    if (!img) return ''

    const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src')
    const src = img.getAttribute('src')
    const dataSrcset = img.getAttribute('data-srcset') || img.getAttribute('srcset')

    if (dataSrc && dataSrc.startsWith('http')) return dataSrc
    if (src && src.startsWith('http') && !src.includes('/lazy.svg')) return src

    const fromSrcset = extractImageFromSrcset(dataSrcset)
    if (fromSrcset && fromSrcset.startsWith('http')) return fromSrcset

    return ''
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

        // Khi update chính document đó thì giữ slug cũ
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

async function fetchWithTimeout(url: string, timeoutMs = 30000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'image/*,*/*',
            },
        })
    } finally {
        clearTimeout(timeout)
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
                // Nếu collection media không query được filename thì bỏ qua check trùng.
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
            description: 'Thương hiệu tạm dùng cho dữ liệu import chưa map được brand.',
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
                description: cleanDesc(brand.description || ''),
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
                description: cleanDesc(category.description || ''),
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

    // 1x1 transparent PNG
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
                    description: cleanDesc(item.description || ''),
                    logo: logoId || undefined,
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'brands', slug, data)
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
                    description: cleanDesc(item.description || ''),
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

    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            if (DRY_RUN) {
                console.log(`   🧪 Dry-run Product: ${item.name}`)
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
                console.log(`   ✅ Product sau retry: ${item.name}`)
            } else {
                console.log(`   ✅ Product: ${item.name}`)
            }

            return
        } catch (error: any) {
            lastError = error
            const message = String(error?.message || '')

            let changed = false

            if (message.includes('slug')) {
                const nextSlugBase = `${data.slug || item.slug || item.name}-${item.id || Date.now()}-${attempt}`
                data.slug = await getAvailableSlug(payload, 'products', nextSlugBase, item.id, existingProd?.id)
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

            if (message.includes('Vị trí trang chủ') || message.includes('displayLocation')) {
                delete data.displayLocation
                console.log(`   ⚠️ Bỏ field displayLocation.`)
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

    for (const item of productsData) {
        try {
            const baseSlug = makeSafeSlug(item.slug || item.name || `product-${item.id}`, item.id)
            const existingProd = await findBySlug(payload, 'products', baseSlug)

            if (existingProd?.id && !UPDATE_EXISTING) {
                console.log(`   ⏩ Product đã tồn tại: ${item.name}`)
                continue
            }

            const productSlug = existingProd?.id
                ? baseSlug
                : await getAvailableSlug(payload, 'products', baseSlug, item.id)

            let brandId: string | number | undefined = undefined

            if (item.brands && item.brands.length > 0) {
                brandId = await ensureBrand(payload, item.brands[0])
                brandId = await validateBrandId(payload, brandId)
            }

            if (!brandId) {
                brandId = await getFallbackBrand(payload)
            }

            const categoryIds: Array<string | number> = []

            if (item.categories && item.categories.length > 0) {
                for (const cat of item.categories) {
                    const categoryId = await ensureCategory(payload, cat)
                    if (categoryId) categoryIds.push(categoryId)
                }
            }

            const uploadedImages: any[] = []

            if (item.images && item.images.length > 0) {
                const imageIds = await Promise.all(
                    item.images.map((img: AnyRecord) => uploadMedia(payload, img.src, img.alt || item.name)),
                )

                imageIds
                    .filter((id) => Boolean(id))
                    .forEach((id) => {
                        uploadedImages.push({ image: id })
                    })
            }

            const specs =
                item.attributes?.map((attr: AnyRecord) => ({
                    label: attr.name,
                    value: attr.options ? attr.options.join(', ') : '',
                })) || []

            const wpDescription = item.description || ''
            const parsedAccordions = parseHTMLToAccordions(wpDescription)

            const basePrice = toNumber(item.regular_price, 0) || toNumber(item.price, 0)
            const salePrice = item.sale_price ? toNumber(item.sale_price, 0) : undefined

            const stock =
                item.stock_status === 'instock'
                    ? item.manage_stock
                        ? toNumber(item.stock_quantity, 0)
                        : 99
                    : 0

            const productData: AnyRecord = {
                title: item.name || productSlug,
                sku: item.sku || '',
                slug: productSlug,
                categories: categoryIds,
                price: {
                    basePrice,
                    salePrice,
                    stock,
                },
                specifications: specs,
                accordions: parsedAccordions,
                shortDescription: stripHTML(item.short_description || ''),
                description: convertHTMLtoLexical(wpDescription),
                status: 'published',
            }

            // Chỉ set brand khi có ID hợp lệ
            if (brandId) {
                productData.brand = brandId
            }

            // Quan trọng: chỉ set images nếu tải được ảnh.
            // Tránh chạy --update mà ảnh 403 làm gallery bị set thành [].
            if (uploadedImages.length > 0) {
                productData.images = uploadedImages
            }

            // Chắc chắn không gửi field Vị trí trang chủ.
            delete productData.displayLocation

            const data = withWpRaw(withoutUndefined(productData), item)

            await saveProductWithRetry(payload, existingProd, data, item)
        } catch (error: any) {
            console.error(`   ❌ Product lỗi: ${item.name} - ${error.message}`)
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
            const title = item.title?.rendered || item.slug || `Post ${item.id}`
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

            const contentHTML = item.content?.rendered || ''
            const excerptHTML = item.excerpt?.rendered || ''

            const firstImageUrl = extractFirstImageFromHTML(contentHTML)
            let featuredImageId = firstImageUrl ? await uploadMedia(payload, firstImageUrl, title) : null

            if (!featuredImageId && USE_PLACEHOLDER_FEATURED && placeholderMediaId) {
                featuredImageId = placeholderMediaId
            }

            const postData: AnyRecord = {
                title,
                slug: postSlug,
                excerpt: stripHTML(excerptHTML),
                content: convertHTMLtoLexical(contentHTML),
                categories: postCategoryIds,
                publishedAt: item.date || undefined,
                status: item.status === 'publish' ? 'published' : 'draft',
            }

            // Collection Posts của bạn dùng field thumbnail
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
