import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const DATA_FILES = {
    brands: 'brands.json',
    productCategories: 'product-categories.json',
    postCategories: 'post-categories.json',
    products: 'products.json',
    posts: 'posts.json',
}

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

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

// Muốn lưu nguyên bản toàn bộ dữ liệu WordPress vào Payload thì set KEEP_RAW_WP=true
// Nhưng collection Payload của bạn phải có field wpId, wpRaw, wpLink.
const KEEP_RAW_WP = process.env.KEEP_RAW_WP === 'true'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const formatSlug = (val: string): string =>
    String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

const cleanDesc = (text: string) =>
    text ? String(text).replace(/\[html_block.*?\]/g, '').trim() : ''

const stripHTML = (html: string) =>
    html ? String(html).replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim() : ''

const toNumber = (value: any, fallback = 0) => {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
}

const withoutUndefined = (obj: Record<string, any>) => {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined))
}

const withWpRaw = (data: Record<string, any>, item: any) => {
    if (!KEEP_RAW_WP) return data

    return {
        ...data,
        wpId: item.id,
        wpLink: item.link || item.permalink || '',
        wpRaw: item,
    }
}

const readJSON = <T = any>(filename: string): T[] => {
    const filePath = path.resolve(__dirname, filename)

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Không tìm thấy file: ${filePath}`)
        return []
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

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
                            text: html || '',
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

    return accordions
}

function extractFirstImageFromHTML(html: string) {
    if (!html) return ''

    const dom = new JSDOM(html)
    const img = dom.window.document.querySelector('img')

    if (!img) return ''

    return img.getAttribute('data-src') || img.getAttribute('src') || ''
}

async function findOne(payload: any, collection: string, where: any) {
    const result = await payload.find({
        collection: collection as any,
        limit: 1,
        where,
    })

    return result.docs?.[0] || null
}

async function uploadMedia(payload: any, url: string, alt: string) {
    try {
        if (!url || SKIP_MEDIA) return null

        const filename = url.split('/').pop()?.split('?')[0] || `${Date.now()}.jpg`

        try {
            const existing = await findOne(payload, 'media', {
                filename: { equals: filename },
            })

            if (existing?.id) {
                return existing.id
            }
        } catch {
            // Nếu media collection không cho tìm theo filename thì bỏ qua check trùng.
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'image/*,*/*',
            },
        })

        if (!response.ok) {
            console.log(`   ⚠️ Không tải được ảnh: ${url}`)
            return null
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        const mimetype = response.headers.get('content-type') || 'image/jpeg'

        const media = await payload.create({
            collection: 'media',
            data: {
                alt: alt || 'MF Paris',
            },
            file: {
                data: buffer,
                name: filename,
                mimetype,
                size: buffer.length,
            },
        })

        await sleep(100)

        return media.id
    } catch (error: any) {
        console.error(`   ❌ Lỗi upload ảnh: ${url}`)
        console.error(`   ${error.message}`)
        return null
    }
}

async function createOrUpdateBySlug(payload: any, collection: string, slug: string, data: any) {
    const existing = await findOne(payload, collection, {
        slug: { equals: slug },
    })

    if (existing?.id) {
        if (!UPDATE_EXISTING) {
            return { id: existing.id, action: 'skip' }
        }

        const updated = await payload.update({
            collection: collection as any,
            id: existing.id,
            data,
        })

        return { id: updated.id, action: 'update' }
    }

    const created = await payload.create({
        collection: collection as any,
        data,
    })

    return { id: created.id, action: 'create' }
}

async function importBrands(payload: any) {
    const brandsData = readJSON<any>(DATA_FILES.brands)

    console.log(`\n📦 Import Brands: ${brandsData.length}`)

    for (const item of brandsData) {
        try {
            const slug = item.slug || formatSlug(item.name)
            const logoId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

            const data = withWpRaw(
                withoutUndefined({
                    name: item.name,
                    slug,
                    description: cleanDesc(item.description),
                    logo: logoId || undefined,
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'brands', slug, data)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Brand: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Brand lỗi: ${item.name} - ${error.message}`)
        }
    }
}

async function importProductCategories(payload: any) {
    const categoriesData = readJSON<any>(DATA_FILES.productCategories)

    console.log(`\n📦 Import Product Categories: ${categoriesData.length}`)

    const idMap = new Map<number, string>()

    for (const item of categoriesData) {
        try {
            const slug = item.slug || formatSlug(item.name)
            const imageId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

            const data = withWpRaw(
                withoutUndefined({
                    name: item.name,
                    slug,
                    description: cleanDesc(item.description),
                    image: imageId || undefined,
                    menuOrder: item.menu_order ?? undefined,
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'categories', slug, data)

            idMap.set(item.id, result.id)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Product Category: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Product Category lỗi: ${item.name} - ${error.message}`)
        }
    }

    // Cập nhật parent sau khi đã tạo hết category.
    // Nếu collection categories chưa có field parent thì đoạn này sẽ tự bỏ qua.
    console.log('\n🔗 Cập nhật parent cho Product Categories...')

    for (const item of categoriesData) {
        try {
            if (!item.parent || item.parent === 0) continue

            const currentId = idMap.get(item.id)
            const parentId = idMap.get(item.parent)

            if (!currentId || !parentId) continue

            await payload.update({
                collection: 'categories',
                id: currentId,
                data: {
                    parent: parentId,
                } as any,
            })

            console.log(`   ✅ Parent: ${item.name}`)
        } catch {
            console.log(`   ⚠️ Bỏ qua parent: ${item.name}`)
        }
    }
}

async function importPostCategories(payload: any) {
    const categoriesData = readJSON<any>(DATA_FILES.postCategories)

    console.log(`\n📦 Import Post Categories: ${categoriesData.length}`)

    const idMap = new Map<number, string>()

    for (const item of categoriesData) {
        try {
            const slug = item.slug || formatSlug(item.name)

            const data = withWpRaw(
                withoutUndefined({
                    title: item.name,
                    slug,
                    description: cleanDesc(item.description),
                }),
                item,
            )

            const result = await createOrUpdateBySlug(payload, 'post-categories', slug, data)

            idMap.set(item.id, result.id)

            console.log(`   ${result.action === 'skip' ? '⏩' : '✅'} Post Category: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Post Category lỗi: ${item.name} - ${error.message}`)
        }
    }

    console.log('\n🔗 Cập nhật parent cho Post Categories...')

    for (const item of categoriesData) {
        try {
            if (!item.parent || item.parent === 0) continue

            const currentId = idMap.get(item.id)
            const parentId = idMap.get(item.parent)

            if (!currentId || !parentId) continue

            await payload.update({
                collection: 'post-categories',
                id: currentId,
                data: {
                    parent: parentId,
                } as any,
            })

            console.log(`   ✅ Parent: ${item.name}`)
        } catch {
            console.log(`   ⚠️ Bỏ qua parent: ${item.name}`)
        }
    }
}

async function importProducts(payload: any) {
    const productsData = readJSON<any>(DATA_FILES.products)

    console.log(`\n📦 Import Products: ${productsData.length}`)

    for (const item of productsData) {
        try {
            const productSlug = item.slug || formatSlug(item.name)

            const existingProd = await findOne(payload, 'products', {
                slug: { equals: productSlug },
            })

            if (existingProd?.id && !UPDATE_EXISTING) {
                console.log(`   ⏩ Product đã tồn tại: ${item.name}`)
                continue
            }

            let brandId: string | undefined = undefined

            if (item.brands && item.brands.length > 0) {
                const brandSlug = item.brands[0].slug || formatSlug(item.brands[0].name)

                const existingBrand = await findOne(payload, 'brands', {
                    slug: { equals: brandSlug },
                })

                if (existingBrand?.id) {
                    brandId = existingBrand.id
                }
            }

            const categoryIds: string[] = []

            if (item.categories && item.categories.length > 0) {
                for (const cat of item.categories) {
                    const catSlug = cat.slug || formatSlug(cat.name)

                    const existingCat = await findOne(payload, 'categories', {
                        slug: { equals: catSlug },
                    })

                    if (existingCat?.id) {
                        categoryIds.push(existingCat.id)
                    }
                }
            }

            const uploadedImages: any[] = []

            if (item.images && item.images.length > 0) {
                for (const img of item.images) {
                    const mediaId = await uploadMedia(payload, img.src, img.alt || item.name)

                    if (mediaId) {
                        uploadedImages.push({ image: mediaId })
                    }
                }
            }

            const specs =
                item.attributes?.map((attr: any) => ({
                    label: attr.name,
                    value: attr.options ? attr.options.join(', ') : '',
                })) || []

            const wpDescription = item.description || ''
            const parsedAccordions = parseHTMLToAccordions(wpDescription)

            const basePrice =
                toNumber(item.regular_price, 0) || toNumber(item.price, 0)

            const salePrice = item.sale_price ? toNumber(item.sale_price, 0) : undefined

            const stock =
                item.stock_status === 'instock'
                    ? item.manage_stock
                        ? toNumber(item.stock_quantity, 0)
                        : 99
                    : 0

            const data = withWpRaw(
                withoutUndefined({
                    title: item.name,
                    sku: item.sku || '',
                    slug: productSlug,
                    brand: brandId,
                    categories: categoryIds,
                    price: {
                        basePrice,
                        salePrice,
                        stock,
                    },
                    images: uploadedImages,
                    specifications: specs,
                    accordions: parsedAccordions,
                    shortDescription: stripHTML(item.short_description || ''),
                    description: convertHTMLtoLexical(wpDescription),
                    status: 'published',
                    displayLocation: item.on_sale ? ['sale'] : ['new-arrival'],
                }),
                item,
            )

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

            console.log(`   ✅ Product: ${item.name}`)
        } catch (error: any) {
            console.error(`   ❌ Product lỗi: ${item.name} - ${error.message}`)
        }
    }
}

async function importPosts(payload: any) {
    const postsData = readJSON<any>(DATA_FILES.posts)
    const postCategoriesData = readJSON<any>(DATA_FILES.postCategories)

    console.log(`\n📦 Import Posts: ${postsData.length}`)

    const wpCatIdToSlug = new Map<number, string>()

    for (const cat of postCategoriesData) {
        wpCatIdToSlug.set(cat.id, cat.slug)
    }

    for (const item of postsData) {
        try {
            const title = item.title?.rendered || item.slug
            const postSlug = item.slug || formatSlug(title)

            const existingPost = await findOne(payload, 'posts', {
                slug: { equals: postSlug },
            })

            if (existingPost?.id && !UPDATE_EXISTING) {
                console.log(`   ⏩ Post đã tồn tại: ${title}`)
                continue
            }

            const postCategoryIds: string[] = []

            if (item.categories && item.categories.length > 0) {
                for (const wpCatId of item.categories) {
                    const slug = wpCatIdToSlug.get(wpCatId)

                    if (!slug) continue

                    const existingCat = await findOne(payload, 'post-categories', {
                        slug: { equals: slug },
                    })

                    if (existingCat?.id) {
                        postCategoryIds.push(existingCat.id)
                    }
                }
            }

            const contentHTML = item.content?.rendered || ''
            const excerptHTML = item.excerpt?.rendered || ''

            const firstImageUrl = extractFirstImageFromHTML(contentHTML)
            const featuredImageId = firstImageUrl
                ? await uploadMedia(payload, firstImageUrl, title)
                : null

            const data = withWpRaw(
                withoutUndefined({
                    title,
                    slug: postSlug,
                    excerpt: stripHTML(excerptHTML),
                    content: convertHTMLtoLexical(contentHTML),
                    categories: postCategoryIds,
                    featuredImage: featuredImageId || undefined,
                    publishedAt: item.date || undefined,
                    status: item.status === 'publish' ? 'published' : 'draft',
                }),
                item,
            )

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

run()