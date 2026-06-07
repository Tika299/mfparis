import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { JSDOM } from 'jsdom'
import {
    convertHTMLToLexical,
    editorConfigFactory,
} from '@payloadcms/richtext-lexical'

type AnyRecord = Record<string, any>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const INPUT_FILE = path.resolve(__dirname, 'product-categories.json')
const OUTPUT_FILE = path.resolve(__dirname, 'product-categories.richtext.json')

function readJSON(filePath: string): AnyRecord[] {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)

    if (!Array.isArray(data)) {
        throw new Error(`${filePath} phải là array JSON`)
    }

    return data
}

function writeJSON(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function normalizeWPHTML(html: string) {
    return String(html || '')
        .replace(/\[html_block.*?\]/gi, '')
        .replace(/src="[^"]*\/lazy\.svg"/gi, '')
        .replace(/data-src="([^"]+)"/gi, 'src="$1"')
        .replace(/data-srcset="([^"]+)"/gi, 'srcset="$1"')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
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

function hasRichTextContent(content: any) {
    return (
        content &&
        typeof content === 'object' &&
        Array.isArray(content.root?.children) &&
        content.root.children.length > 0
    )
}

function convertHTML(html: string, editorConfig: any) {
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
        console.log(`⚠️ Convert lỗi: ${error.message}`)
        return emptyRichText()
    }
}

async function getEditorConfig() {
    const configModule = await import('@payload-config')
    const payloadConfig = await configModule.default
    const factory = (editorConfigFactory as any).default || editorConfigFactory

    return factory({
        config: payloadConfig,
    })
}

async function main() {
    const items = readJSON(INPUT_FILE)
    const editorConfig = await getEditorConfig()

    let convertedCount = 0

    const converted = items.map((item) => {
        const richText = convertHTML(item.description || '', editorConfig)

        if (hasRichTextContent(richText)) convertedCount++

        return {
            ...item,

            // Ghi đè description từ HTML string sang richText JSON
            description: richText,
        }
    })

    writeJSON(OUTPUT_FILE, converted)

    console.log('✅ Convert product categories hoàn tất')
    console.log(`Tổng: ${items.length}`)
    console.log(`Có nội dung richText: ${convertedCount}`)
    console.log(`Output: ${OUTPUT_FILE}`)
}

main().catch((error) => {
    console.error('❌ Convert product categories thất bại:')
    console.error(error)
    process.exit(1)
})