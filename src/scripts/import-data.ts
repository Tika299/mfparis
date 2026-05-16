import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

// 1. Cấu hình môi trường
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// 2. Hàm xóa dấu tiếng Việt để tạo Slug
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

const convertHTMLtoLexical = (html: string) => {
  return {
    root: {
      type: 'root',
      direction: 'ltr', // Thêm dòng này (ltr = left to right)
      format: '', // Thêm dòng này
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph', // Sử dụng paragraph thay vì node 'html' lạ
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
              text: html, // Chúng ta tạm thời để mã HTML vào đây
              type: 'text',
              version: 1,
            },
          ],
        },
      ],
    },
  } as any // Cực kỳ quan trọng để sửa lỗi "is not assignable"
}

// 3. Hàm tải ảnh từ URL và upload vào Payload Media
async function uploadMedia(payload: any, url: string, alt: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg'
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    const media = await payload.create({
      collection: 'media',
      data: { alt: alt || 'MF Paris Product Image' },
      file: {
        data: buffer,
        name: filename,
        mimetype: contentType,
        size: buffer.length,
      },
    })
    return media.id
  } catch (error: any) {
    console.error(`   ❌ Lỗi tải ảnh (${url}):`, error.message)
    return undefined
  }
}

async function run() {
  console.log('🚀 Bắt đầu quá trình Migration dữ liệu...')

  if (!process.env.PAYLOAD_SECRET) {
    console.error('❌ LỖI: Thiếu PAYLOAD_SECRET trong file .env')
    process.exit(1)
  }

  const payload = await getPayload({ config: configPromise })

  // Đọc file dữ liệu JSON
  const dataPath = path.resolve(__dirname, 'data.json')
  if (!fs.existsSync(dataPath)) {
    console.error('❌ LỖI: Không tìm thấy file src/scripts/data.json')
    process.exit(1)
  }

  const productsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`📦 Tìm thấy ${productsData.length} sản phẩm trong file JSON.`)

  for (const item of productsData) {
    try {
      console.log(`\n--- Đang xử lý: ${item.name} ---`)

      // A. XỬ LÝ BRAND (THƯƠNG HIỆU)
      let brandId = undefined
      if (item.brands && item.brands.length > 0) {
        const bName = item.brands[0].name
        const bSlug = item.brands[0].slug || formatSlug(bName)

        const existingBrand = await payload.find({
          collection: 'brands',
          where: { slug: { equals: bSlug } },
        })

        if (existingBrand.docs.length > 0) {
          brandId = existingBrand.docs[0].id
        } else {
          const newBrand = await payload.create({
            collection: 'brands',
            data: { name: bName, slug: bSlug },
          })
          brandId = newBrand.id
          console.log(`   ✅ Đã tạo Brand mới: ${bName}`)
        }
      }

      // B. XỬ LÝ CATEGORIES (DANH MỤC)
      const categoryIds = []
      for (const cat of item.categories) {
        const cSlug = cat.slug || formatSlug(cat.name)
        const existingCat = await payload.find({
          collection: 'categories',
          where: { slug: { equals: cSlug } },
        })

        if (existingCat.docs.length > 0) {
          categoryIds.push(existingCat.docs[0].id)
        } else {
          const newCat = await payload.create({
            collection: 'categories',
            data: { name: cat.name, slug: cSlug },
          })
          categoryIds.push(newCat.id)
          console.log(`   ✅ Đã tạo Danh mục mới: ${cat.name}`)
        }
      }

      // C. XỬ LÝ MEDIA (HÌNH ẢNH)
      const uploadedImageObjects = []
      if (item.images && item.images.length > 0) {
        for (const img of item.images) {
          const mediaId = await uploadMedia(payload, img.src, img.alt || item.name)
          if (mediaId) {
            uploadedImageObjects.push({ image: mediaId })
          }
        }
      }

      // D. XỬ LÝ ATTRIBUTES (THÔNG SỐ KỸ THUẬT)
      const specs =
        item.attributes?.map((attr: any) => ({
          label: attr.name,
          value: attr.options ? attr.options.join(', ') : '',
        })) || []

      // E. KIỂM TRA TRÙNG LẶP SẢN PHẨM
      const productSlug = item.slug || formatSlug(item.name)
      const existingProd = await payload.find({
        collection: 'products',
        where: { slug: { equals: productSlug } },
      })

      if (existingProd.docs.length > 0) {
        console.log(`   ⚠️ Bỏ qua: Sản phẩm đã tồn tại.`)
        continue
      }

      // F. TẠO SẢN PHẨM TRONG DATABASE
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
            stock: item.manage_stock ? item.stock_quantity || 0 : 99,
          },
          images: uploadedImageObjects,
          specifications: specs,
          description: convertHTMLtoLexical(item.description || ''),
          shortDescription: item.short_description?.replace(/<\/?[^>]+(>|$)/g, ''),
          status: 'published',
          displayLocation: ['new-arrival'],
        } as any, // THÊM "as any" Ở ĐÂY ĐỂ BỎ QUA KIỂM TRA TYPE KHẮT KHE
      })

      console.log(`   ✨ HOÀN THÀNH: ${item.name}`)
    } catch (error: any) {
      console.error(`   ❌ LỖI tại sản phẩm ${item.name}:`, error)
    }
  }

  console.log('\n\n🎉 CHÚC MỪNG: Quá trình Migration hoàn tất 100%!')
  process.exit(0)
}

run()
