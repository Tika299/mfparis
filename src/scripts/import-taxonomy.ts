import { getPayload } from 'payload'
import configPromise from '@payload-config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { title } from 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Hàm hỗ trợ tải ảnh
async function uploadMedia(payload: any, url: string, alt: string) {
  try {
    if (!url) return null
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg'

    const media = await payload.create({
      collection: 'media',
      data: { alt: alt || 'MF Paris Taxonomy' },
      file: {
        data: buffer,
        name: filename,
        mimetype: response.headers.get('content-type') || 'image/jpeg',
        size: buffer.length,
      },
    })
    return media.id
  } catch (error) {
    return null
  }
}

// Hàm làm sạch description (Xóa mã [html_block...])
const cleanDesc = (text: string) => (text ? text.replace(/\[html_block.*?\]/g, '').trim() : '')

async function run() {
  const payload = await getPayload({ config: configPromise })
  console.log('🚀 Bắt đầu Import Taxonomy (Brands & Categories)...')

  // --- 1. IMPORT BRANDS ---
  const brandsData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'brands.json'), 'utf-8'))
  console.log(`\n📦 Đang xử lý ${brandsData.length} Thương hiệu...`)
  for (const item of brandsData) {
    const existing = await payload.find({
      collection: 'brands',
      where: { slug: { equals: item.slug } },
    })
    if (existing.docs.length > 0) continue

    const logoId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

    await payload.create({
      collection: 'brands',
      data: {
        name: item.name,
        slug: item.slug,
        description: cleanDesc(item.description),
        logo: logoId,
      } as any,
    })
    console.log(`✅ Đã xong Brand: ${item.name}`)
  }

  // --- 2. IMPORT PRODUCT CATEGORIES ---
  const pCatsData = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'product-categories.json'), 'utf-8'),
  )
  console.log(`\n📦 Đang xử lý ${pCatsData.length} Danh mục sản phẩm...`)
  for (const item of pCatsData) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: item.slug } },
    })
    if (existing.docs.length > 0) continue

    const imgId = item.image?.src ? await uploadMedia(payload, item.image.src, item.name) : null

    await payload.create({
      collection: 'categories',
      data: {
        name: item.name,
        slug: item.slug,
        image: imgId,
      } as any,
    })
    console.log(`✅ Đã xong Category: ${item.name}`)
  }

  // --- 3. IMPORT POST CATEGORIES (BLOG) ---
  const postCatsData = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'post-categories.json'), 'utf-8'),
  )
  console.log(`\n📦 Đang xử lý ${postCatsData.length} Danh mục bài viết...`)
  for (const item of postCatsData) {
    const existing = await payload.find({
      collection: 'post-categories',
      where: { slug: { equals: item.slug } },
    })
    if (existing.docs.length > 0) continue

    await payload.create({
      collection: 'post-categories',
      data: {
        title: item.name,
        slug: item.slug,
      } as any,
    })
    console.log(`✅ Đã xong Post Category: ${item.name}`)
  }

  console.log('\n✨ TẤT CẢ TAXONOMY ĐÃ ĐƯỢC IMPORT THÀNH CÔNG!')
  process.exit(0)
}

run()
