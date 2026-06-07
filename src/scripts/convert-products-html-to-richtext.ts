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

// File nguồn từ script Python export
const SOURCE_FILE = path.resolve(__dirname, 'products.source.json')

// File sau khi description đã được convert sang richText
const OUTPUT_FILE = path.resolve(__dirname, 'products.converted.json')

function normalizeLooseJSON(raw: string) {
    let content = raw.trim()

    // Xóa BOM nếu file có
    content = content.replace(/^\uFEFF/, '')

    // Xóa dấu phẩy cuối file nếu có
    content = content.replace(/,\s*$/, '')

    return content
}

function readJSONFile(filePath: string): AnyRecord[] {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Không tìm thấy file: ${filePath}`)
    }

    const raw = fs.readFileSync(filePath, 'utf-8')
    const content = normalizeLooseJSON(raw)

    try {
        const data = JSON.parse(content)

        if (Array.isArray(data)) return data
        if (data && typeof data === 'object') return [data]

        throw new Error('File JSON phải là array sản phẩm hoặc 1 object sản phẩm')
    } catch {
        /**
         * Trường hợp file của bạn đang có dạng:
         *
         * { product 1 },
         * { product 2 },
         * { product 3 }
         *
         * Đây chưa phải JSON array hợp lệ.
         * Script sẽ tự bọc lại thành:
         *
         * [
         *   { product 1 },
         *   { product 2 },
         *   { product 3 }
         * ]
         */
        try {
            const wrapped = `[${content}]`
            const data = JSON.parse(wrapped)

            if (Array.isArray(data)) return data

            throw new Error('Không thể parse JSON sau khi bọc array')
        } catch (error: any) {
            throw new Error(`File JSON không hợp lệ: ${error.message}`)
        }
    }
}

function normalizeWPHTML(html: string) {
    if (!html) return ''

    return String(html)
        // Xóa shortcode WordPress/Woodmart không convert được
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

function isRichText(value: any) {
    return (
        value &&
        typeof value === 'object' &&
        value.root &&
        Array.isArray(value.root.children)
    )
}

function hasRichTextContent(data: any) {
    const children = data?.root?.children
    return Array.isArray(children) && children.length > 0
}

function getDescriptionHTML(item: AnyRecord) {
    return (
        item.description ||
        item.descriptionHTML ||
        item.descriptionHtml ||
        item.longDescription ||
        item.content ||
        ''
    )
}

async function convertHTMLToRichText(description: any, editorConfig: any) {
    // Nếu description đã là richText rồi thì giữ nguyên, tránh convert lại
    if (isRichText(description)) {
        return description
    }

    const normalizedHTML = normalizeWPHTML(String(description || ''))

    if (!normalizedHTML) {
        return emptyRichText()
    }

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
    const descriptionHTML = getDescriptionHTML(item)
    const description = await convertHTMLToRichText(descriptionHTML, editorConfig)

    // Chỉ thay field description.
    // Tất cả field khác giữ nguyên y như file nguồn.
    return {
        ...item,
        description,
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

    console.log(`🚀 Bắt đầu convert description cho ${products.length} sản phẩm...`)

    const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf-8' })

    await writeToStream(stream, '[\n')

    let successCount = 0
    let emptyCount = 0
    let errorCount = 0

    for (const [index, item] of products.entries()) {
        const name = item.title || item.name || item.slug || item.id || `Sản phẩm ${index + 1}`

        try {
            const product = await convertProduct(item, editorConfig)

            const blockCount = product.description?.root?.children?.length || 0

            if (blockCount === 0) {
                emptyCount++
            }

            if (index > 0) {
                await writeToStream(stream, ',\n')
            }

            await writeToStream(stream, JSON.stringify(product, null, 2))

            successCount++

            console.log(
                `✅ ${index + 1}/${products.length}: ${name} | richText: ${blockCount} blocks`,
            )
        } catch (error: any) {
            errorCount++

            console.log(`❌ Lỗi sản phẩm: ${name}`)
            console.log(`   ${error.message}`)

            const fallbackProduct = {
                ...item,
                description: emptyRichText(),
            }

            if (index > 0) {
                await writeToStream(stream, ',\n')
            }

            await writeToStream(stream, JSON.stringify(fallbackProduct, null, 2))
        }

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
    console.log(`⚠️ Description rỗng: ${emptyCount}`)
    console.log(`❌ Lỗi: ${errorCount}`)
    console.log(`📄 File xuất ra: ${OUTPUT_FILE}`)
}

main().catch((error) => {
    console.error('\n❌ CONVERT THẤT BẠI:')
    console.error(error)
    process.exit(1)
})