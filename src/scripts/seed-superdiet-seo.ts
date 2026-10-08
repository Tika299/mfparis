import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const args = new Set(process.argv.slice(2))
const DRY_RUN = !args.has('--yes')

const PRODUCT_DEFINITIONS = [
  {
    slug: 'nuoc-uong-giam-can-superdiet-actimincyl-bio-20-ong',
    metaTitle: 'Superdiet Actimincyl Bio Có Tốt Không? | MF Paris',
    metaDescription:
      'Tìm hiểu Superdiet Actimincyl Bio: thành phần, cách dùng, đối tượng cần lưu ý và cách lựa chọn sản phẩm phù hợp tại MF Paris.',
    focusKeyword: 'superdiet actimincyl bio có tốt không',
  },
  {
    slug: 'nuoc-uong-thanh-loc-co-the-drainaflore-bio-detox',
    metaTitle: 'Superdiet Drainaflore Bio Có Tốt Không? | MF Paris',
    metaDescription:
      'Review Superdiet Drainaflore Bio: thành phần, cách uống, liệu trình 20 ngày và những trường hợp cần thận trọng trước khi sử dụng.',
    focusKeyword: 'superdiet drainaflore bio có tốt không',
  },
  {
    slug: 'nuoc-uong-bo-sung-collagen-superdiet-5000mg-20-ong',
    metaTitle: 'Collagen Superdiet 5000mg Chính Hãng | MF Paris',
    metaDescription:
      'Thông tin Collagen Superdiet 5000mg: dạng dùng, thành phần, cách sử dụng và lưu ý khi lựa chọn sản phẩm bổ sung collagen.',
    focusKeyword: 'collagen superdiet 5000mg',
  },
  {
    slug: 'superdiet-omega-3-junior',
    metaTitle: 'Superdiet Omega 3 Junior Chính Hãng | MF Paris',
    metaDescription:
      'Tìm hiểu Superdiet Omega 3 Junior, sản phẩm bổ sung omega 3 dành cho trẻ em và những thông tin cần biết trước khi sử dụng.',
    focusKeyword: 'superdiet omega 3 junior',
  },
] as const

const BRAND_UPDATE = {
  h1Override: 'Superdiet Chính Hãng',
  description: `
    <p><strong>Superdiet</strong> là thương hiệu thực phẩm bổ sung của Pháp, được biết đến với các sản phẩm có nguồn gốc thực vật, vitamin, khoáng chất và các công thức hỗ trợ sức khỏe hằng ngày.</p>
    <p>Tại MF Paris, bạn có thể tìm hiểu và lựa chọn các sản phẩm Superdiet theo nhu cầu cụ thể như hỗ trợ vóc dáng, bổ sung collagen hoặc omega 3. Mỗi sản phẩm cần được sử dụng đúng hướng dẫn trên bao bì và không thay thế thuốc chữa bệnh.</p>
  `.trim(),
  introHtml: `
    <p>Khám phá các sản phẩm Superdiet chính hãng tại MF Paris. Xem thông tin thành phần, cách dùng và lưu ý trước khi lựa chọn.</p>
  `.trim(),
  bottomContentHtml: `
    <h2>Sản phẩm Superdiet được quan tâm</h2>
    <p><a href="/products/nuoc-uong-giam-can-superdiet-actimincyl-bio-20-ong">Superdiet Actimincyl Bio</a> phù hợp với người đang tìm hiểu sản phẩm hỗ trợ kiểm soát cân nặng.</p>
    <p><a href="/products/nuoc-uong-thanh-loc-co-the-drainaflore-bio-detox">Superdiet Drainaflore Bio</a> được quan tâm trong nhóm sản phẩm hỗ trợ đào thải và sử dụng theo liệu trình ngắn.</p>
    <p><a href="/products/nuoc-uong-bo-sung-collagen-superdiet-5000mg-20-ong">Collagen Superdiet 5000mg</a> và <a href="/products/superdiet-omega-3-junior">Superdiet Omega 3 Junior</a> phục vụ các nhu cầu bổ sung khác nhau.</p>
    <h2>Lưu ý khi chọn sản phẩm Superdiet</h2>
    <p>Hãy đọc kỹ thành phần, liều dùng và cảnh báo trên bao bì. Nếu đang mang thai, cho con bú, có bệnh nền hoặc đang dùng thuốc, nên hỏi chuyên môn phù hợp trước khi sử dụng.</p>
  `.trim(),
  faq: [
    {
      question: 'Superdiet là thương hiệu của nước nào?',
      answer: 'Superdiet là thương hiệu thực phẩm bổ sung của Pháp.',
    },
    {
      question: 'Sản phẩm Superdiet có phải là thuốc không?',
      answer: 'Sản phẩm bổ sung Superdiet không phải là thuốc và không thay thế thuốc chữa bệnh. Hãy sử dụng theo hướng dẫn trên bao bì.',
    },
    {
      question: 'Có nên dùng nhiều sản phẩm Superdiet cùng lúc không?',
      answer: 'Không nên tự kết hợp nhiều sản phẩm khi chưa kiểm tra thành phần, liều dùng và khả năng tương tác. Nếu đang dùng thuốc hoặc có bệnh nền, hãy hỏi chuyên môn phù hợp.',
    },
  ],
  seo: {
    metaTitle: 'Superdiet Chính Hãng | Thực Phẩm Bổ Sung Pháp | MF Paris',
    metaDescription:
      'Khám phá Superdiet chính hãng tại MF Paris: Actimincyl Bio, Drainaflore Bio, Collagen 5000mg và Omega 3 Junior cùng thông tin cách dùng, thành phần và lưu ý.',
    focusKeyword: 'superdiet',
    breadcrumbLabel: 'Superdiet',
    robotsIndex: 'index',
    robotsFollow: 'follow',
    sitemapInclude: true,
    sitemapPriority: 0.8,
    sitemapChangeFrequency: 'weekly',
    schemaType: 'CollectionPage',
  },
  inboundInternalLinks: {
    enabled: true,
    keywords: [
      { keyword: 'Superdiet' },
      { keyword: 'sản phẩm Superdiet' },
      { keyword: 'Superdiet chính hãng' },
    ],
    scope: ['posts', 'products', 'categories'],
    maxInsertionsPerPage: 1,
  },
} as const

function getRelationshipId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value

  if (value && typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }

  return null
}

function logChange(label: string, data: unknown) {
  console.log(`${DRY_RUN ? '[dry-run] ' : ''}${label}`)
  if (DRY_RUN) console.log(JSON.stringify(data, null, 2))
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const brandResult = await payload.find({
    collection: 'brands',
    where: { slug: { equals: 'superdiet' } },
    depth: 1,
    limit: 1,
    pagination: false,
  })
  const brand = brandResult.docs[0]

  if (!brand) {
    throw new Error('Không tìm thấy brand slug "superdiet". Hãy tạo brand trước khi chạy script.')
  }

  const productDocs: any[] = []
  const unresolved: string[] = []

  for (const definition of PRODUCT_DEFINITIONS) {
    const result = await payload.find({
      collection: 'products',
      where: {
        and: [
          { slug: { equals: definition.slug } },
          { brand: { equals: brand.id } },
        ],
      },
      depth: 0,
      limit: 1,
      pagination: false,
    })

    const product = result.docs[0]
    if (!product) {
      unresolved.push(definition.slug)
      continue
    }

    productDocs.push({ product, definition })
  }

  if (unresolved.length > 0 && !DRY_RUN) {
    throw new Error(
      `Không ghi dữ liệu vì còn sản phẩm chưa khớp: ${unresolved.join(', ')}. ` +
      'Kiểm tra slug/brand rồi chạy lại.',
    )
  }

  const featuredProducts = productDocs.map(({ product }) => product.id)
  const brandData = {
    ...BRAND_UPDATE,
    featuredProducts,
  }

  logChange(`Cập nhật brand #${brand.id} (${brand.name})`, {
    fields: Object.keys(brandData),
    featuredProducts,
  })

  if (!DRY_RUN) {
    await payload.update({
      collection: 'brands',
      id: brand.id,
      data: brandData as any,
      overrideAccess: true,
    })
  }

  for (const { product, definition } of productDocs) {
    const productData = {
      seo: {
        ...(product.seo || {}),
        metaTitle: definition.metaTitle,
        metaDescription: definition.metaDescription,
        focusKeyword: definition.focusKeyword,
        robotsIndex: 'index',
        robotsFollow: 'follow',
        sitemapInclude: true,
        sitemapChangeFrequency: 'weekly',
        schemaType: 'Product',
      },
    }

    logChange(`Cập nhật SEO sản phẩm #${product.id} (${product.title})`, productData)

    if (!DRY_RUN) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: productData as any,
        overrideAccess: true,
      })
    }
  }

  console.log('\nHoàn tất seed SEO Superdiet.')
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    brandId: getRelationshipId(brand),
    productsMatched: productDocs.length,
    productsUnresolved: unresolved,
    featuredProducts,
  }, null, 2))

  if (DRY_RUN) {
    console.log('\nChạy lại với --yes để ghi thay đổi vào Payload.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
