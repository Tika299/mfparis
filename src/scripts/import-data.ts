import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'

// 1. CẤU HÌNH MÔI TRƯỜNG
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// 2. HÀM HỖ TRỢ XÓA DẤU TIẾNG VIỆT CHO SLUG
const formatSlug = (val: string): string =>
  val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

// 3. HÀM BỌC HTML VÀO CẤU TRÚC LEXICAL (JSON) CỦA PAYLOAD 3.0
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
              text: html, // Chứa mã HTML thô để RichText component render
              type: 'text',
              version: 1,
            },
          ],
        },
      ],
    },
  } as any
}

// 4. HÀM BÓC TÁCH HTML THEO THẺ H2 THÀNH ACCORDIONS
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

// 5. HÀM TẢI ẢNH VÀ UPLOAD VÀO MEDIA
async function uploadMedia(payload: any, url: string, alt: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = url.split('/').pop()?.split('?')[0] || `${Date.now()}.jpg`

    const media = await payload.create({
      collection: 'media',
      data: { alt: alt || 'MF Paris' },
      file: {
        data: buffer,
        name: filename,
        mimetype: response.headers.get('content-type') || 'image/jpeg',
        size: buffer.length,
      },
    })
    return media.id
  } catch (error: any) {
    console.error(`   ❌ Lỗi tải ảnh: ${url}`)
    return null
  }
}

// 6. LUỒNG XỬ LÝ CHÍNH
async function run() {
  console.log('🚀 Bắt đầu quá trình Migration tổng lực cho mfparis.vn...')

  const payload = await getPayload({ config: configPromise })

  const dataPath = path.resolve(__dirname, 'data.json')
  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  for (const item of productsData) {
    try {
      console.log(`\n📦 Đang xử lý: ${item.name}`)

      // A. XỬ LÝ BRAND
      let brandId = undefined
      if (item.brands && item.brands.length > 0) {
        const bName = item.brands[0].name
        const bSlug = item.brands[0].slug || formatSlug(bName)
        const existing = await payload.find({ collection: 'brands', where: { slug: { equals: bSlug } } })
        brandId = existing.docs.length > 0 ? existing.docs[0].id : (await payload.create({ collection: 'brands', data: { name: bName, slug: bSlug } })).id
      }

      // B. XỬ LÝ CATEGORIES
      const categoryIds = []
      for (const cat of item.categories) {
        const cSlug = cat.slug || formatSlug(cat.name)
        const existing = await payload.find({ collection: 'categories', where: { slug: { equals: cSlug } } })
        const id = existing.docs.length > 0 ? existing.docs[0].id : (await payload.create({ collection: 'categories', data: { name: cat.name, slug: cSlug } })).id
        categoryIds.push(id)
      }

      // C. XỬ LÝ MEDIA (HÌNH ẢNH)
      const uploadedImages = []
      if (item.images && item.images.length > 0) {
        for (const img of item.images) {
          const mid = await uploadMedia(payload, img.src, item.name)
          if (mid) uploadedImages.push({ image: mid })
        }
      }

      // D. XỬ LÝ THÔNG SỐ (ATTRIBUTES)
      const specs = item.attributes?.map((attr: any) => ({
        label: attr.name,
        value: attr.options ? attr.options.join(', ') : '',
      })) || []

      // E. XỬ LÝ ACCORDIONS (MÔ TẢ CHIA MỤC)
      const wpDescription = item.description || ''
      const parsedAccordions = parseHTMLToAccordions(wpDescription)

      // F. KIỂM TRA TRÙNG LẶP
      const productSlug = item.slug || formatSlug(item.name)
      const existingProd = await payload.find({ collection: 'products', where: { slug: { equals: productSlug } } })
      if (existingProd.docs.length > 0) {
        console.log(`   ⚠️ Sản phẩm đã tồn tại, bỏ qua.`)
        continue
      }

      // G. TẠO SẢN PHẨM HOÀN CHỈNH
      await payload.create({
        collection: 'products',
        data: {
          title: item.name,
          sku: item.sku || '',
          slug: productSlug,
          brand: brandId,
          categories: categoryIds,
          price: {
            basePrice: Number(item.regular_price) || 0,
            salePrice: item.sale_price ? Number(item.sale_price) : undefined,
            stock: item.manage_stock ? (item.stock_quantity || 0) : 99,
          },
          images: uploadedImages,
          specifications: specs,
          accordions: parsedAccordions, // Toàn bộ H2 sẽ bay vào đây
          shortDescription: item.short_description?.replace(/<\/?[^>]+(>|$)/g, ""),
          description: convertHTMLtoLexical(wpDescription), // Vẫn giữ 1 bản full ở đây
          status: 'published',
          displayLocation: ['new-arrival']
        } as any,
      })

      console.log(`   ✅ Thành công: ${item.name}`)
    } catch (error: any) {
      console.error(`   ❌ Lỗi:`, error.message)
    }
  }

  console.log('\n✨ MIGRATION HOÀN TẤT!')
  process.exit(0)
}

run()