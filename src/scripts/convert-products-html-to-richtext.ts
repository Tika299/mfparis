import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { JSDOM } from 'jsdom'
import configPromise from '@payload-config'
import {
    convertHTMLToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical'

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const SOURCE_FILE = path.resolve(__dirname, 'products.source.json')
const OUTPUT_FILE = path.resolve(__dirname, 'products.converted.json')

function readJSONFile(filePath: string): AnyRecord[] {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Không tìm thấy file: ${filePath}`)
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)

    if (Array.isArray(data)) return data

    if (data && typeof data === 'object') return [data]

    throw new Error('File JSON phải là array sản phẩm hoặc 1 object sản phẩm')
}

function normalizeWPHTML(html: string) {
    if (!html) return ''

    return String(html)
        // Xóa shortcode không convert được
        .replace(/\[html_block.*?\]/gi, '')

        // Xử lý lazy image WordPress / Woodmart
        .replace(/src="[^"]*\/lazy\.svg"/gi, '')
        .replace(/data-src="([^"]+)"/gi, 'src="$1"')
        .replace(/data-srcset="([^"]+)"/gi, 'srcset="$1"')

        // Bỏ script/style
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')

        // Bỏ paragraph rỗng
        .replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '')

        .trim()
}

function stripHTML(html: string) {
    return String(html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function emptyRichText() {
    return {
        root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            children: [],
            direction: null,
        },
    }
}

function hasRichTextContent(data: any) {
    const children = data?.root?.children
    return Array.isArray(children) && children.length > 0
}

function splitHTMLByH2(html: string) {
    const normalized = normalizeWPHTML(html)

    if (!normalized) return []

    const dom = new JSDOM(normalized)
    const doc = dom.window.document
    const children = Array.from(doc.body.children)

    const accordions: Array<{
        title: string
        html: string
    }> = []

    let currentTitle = 'Mô tả sản phẩm'
    let currentContent = ''

    if (!children.length) {
        return [
            {
                title: currentTitle,
                html: normalized,
            },
        ]
    }

    children.forEach((child, index) => {
        const tagName = child.tagName?.toUpperCase()

        if (tagName === 'H2') {
            if (currentContent.trim()) {
                accordions.push({
                    title: currentTitle,
                    html: normalizeWPHTML(currentContent),
                })
            }

            currentTitle = child.textContent?.trim() || 'Thông tin sản phẩm'
            currentContent = ''
        } else {
            currentContent += child.outerHTML
        }

        if (index === children.length - 1 && currentContent.trim()) {
            accordions.push({
                title: currentTitle,
                html: normalizeWPHTML(currentContent),
            })
        }
    })

    return accordions.filter((item) => item.html.trim())
}

function getRankMathMeta(item: AnyRecord, key: string) {
    const found = item.meta_data?.find((meta: AnyRecord) => meta.key === key)
    return typeof found?.value === 'string' ? found.value : ''
}

async function convertHTMLToRichText(html: string, editorConfig: any) {
    const normalizedHTML = normalizeWPHTML(html)

    if (!normalizedHTML) return emptyRichText()

    try {
        const richText = convertHTMLToLexical({
            html: normalizedHTML,
            editorConfig,
            JSDOM,
        })

        return hasRichTextContent(richText) ? richText : emptyRichText()
    } catch (error: any) {
        console.log(`   ⚠️ Convert richText lỗi: ${error.message}`)
        return emptyRichText()
    }
}

async function convertProduct(item: AnyRecord, editorConfig: any) {
    const sourceDescriptionHTML = normalizeWPHTML(item.description || '')
    const sections = splitHTMLByH2(sourceDescriptionHTML)

    const accordions = await Promise.all(
        sections.map(async (section) => {
            const content = await convertHTMLToRichText(section.html, editorConfig)

            return {
                title: section.title,
                content,
            }
        }),
    )

    const seoTitle = getRankMathMeta(item, 'rank_math_title')
    const seoDescription = getRankMathMeta(item, 'rank_math_description')

    const stock =
        item.stock_status === 'instock'
            ? item.manage_stock
                ? Number(item.stock_quantity || 0)
                : 99
            : 0

    return {
        // Chỉ giữ field cần cho import Payload
        id: item.id,
        name: item.name,
        slug: item.slug,
        sku: item.sku || '',

        status: item.status,
        stock_status: item.stock_status,
        manage_stock: item.manage_stock,
        stock_quantity: item.stock_quantity,

        price: item.price,
        regular_price: item.regular_price,
        sale_price: item.sale_price,
        stock,

        categories: item.categories || [],
        brands: item.brands || [],
        images: item.images || [],
        attributes: item.attributes || [],

        shortDescription: stripHTML(item.short_description || item.shortDescription || ''),

        seoTitle: seoTitle || item.seoTitle || '',
        seoDescription: seoDescription || item.seoDescription || '',

        // Nội dung chi tiết duy nhất
        accordions,
    }
}

async function writeToStream(stream: fs.WriteStream, chunk: string) {
    if (!stream.write(chunk)) {
        await new Promise<void>((resolve) => stream.once('drain', resolve))
    }
}

async function main() {
    const products = readJSONFile(SOURCE_FILE)

    const config = await configPromise

    const factory = (editorConfigFactory as any).default || editorConfigFactory

    const editorConfig = await factory({
        config,
    })

    console.log(`🚀 Bắt đầu convert ${products.length} sản phẩm...`)

    const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf-8' })

    await writeToStream(stream, '[\n')

    let successCount = 0
    let errorCount = 0

    for (const [index, item] of products.entries()) {
        const name = item.name || item.title || item.slug || item.id

        try {
            const product = await convertProduct(item, editorConfig)

            if (index > 0) {
                await writeToStream(stream, ',\n')
            }

            await writeToStream(stream, JSON.stringify(product, null, 2))

            successCount++

            console.log(
                `✅ ${index + 1}/${products.length}: ${name} | accordions: ${product.accordions?.length || 0}`,
            )
        } catch (error: any) {
            errorCount++

            console.log(`❌ Lỗi sản phẩm: ${name}`)
            console.log(`   ${error.message}`)

            const fallbackProduct = {
                id: item.id,
                name: item.name,
                slug: item.slug,
                sku: item.sku || '',

                status: item.status,
                stock_status: item.stock_status,
                manage_stock: item.manage_stock,
                stock_quantity: item.stock_quantity,

                price: item.price,
                regular_price: item.regular_price,
                sale_price: item.sale_price,

                categories: item.categories || [],
                brands: item.brands || [],
                images: item.images || [],
                attributes: item.attributes || [],

                shortDescription: stripHTML(item.short_description || item.shortDescription || ''),

                seoTitle: getRankMathMeta(item, 'rank_math_title'),
                seoDescription: getRankMathMeta(item, 'rank_math_description'),

                accordions: [],
                convertError: error.message,
            }

            if (index > 0) {
                await writeToStream(stream, ',\n')
            }

            await writeToStream(stream, JSON.stringify(fallbackProduct, null, 2))
        }

        // Nhả event loop nhẹ, tránh nghẽn RAM khi convert nhiều sản phẩm
        if ((index + 1) % 50 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0))
        }
    }

    await writeToStream(stream, '\n]\n')

    stream.end()

    await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
    })

    console.log('\n✨ CONVERT HOÀN TẤT!')
    console.log(`✅ Thành công: ${successCount}`)
    console.log(`❌ Lỗi: ${errorCount}`)
    console.log(`📄 File xuất ra: ${OUTPUT_FILE}`)
}

main().catch((error) => {
    console.error('\n❌ CONVERT THẤT BẠI:')
    console.error(error)
    process.exit(1)
})