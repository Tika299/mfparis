import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  buildIndexableFacetPath,
  normalizeIndexableFacetKey,
  type IndexableFacetConfig,
} from '@/lib/indexableCategoryFacets'

const args = new Set(process.argv.slice(2))
const DRY_RUN = !args.has('--yes')
const MIN_PRODUCTS = 8

type LandingDefinition = {
  categorySlug: string
  key: string
  value: string
  h1: string
  metaTitle: string
  metaDescription: string
  introHtml: string
  bottomContentHtml: string
}

const LANDINGS: LandingDefinition[] = [
  {
    categorySlug: 'nuoc-hoa-nam',
    key: 'attr_thoi-diem-su-dung',
    value: 'van-phong',
    h1: 'Nước Hoa Nam Văn Phòng',
    metaTitle: 'Nước Hoa Nam Văn Phòng Thanh Lịch, Dễ Dùng | MF Paris',
    metaDescription: 'Chọn nước hoa nam văn phòng thanh lịch, tỏa hương vừa phải và dễ dùng hằng ngày. Xem sản phẩm chính hãng tại MF Paris.',
    introHtml: '<p>Khám phá các mẫu <strong>nước hoa nam văn phòng</strong> có mùi hương sạch, lịch sự và độ tỏa vừa phải. Danh sách được lọc từ sản phẩm có thuộc tính Thời điểm sử dụng: Văn phòng.</p>',
    bottomContentHtml: '<h2>Cách chọn nước hoa nam dùng ở văn phòng</h2><p>Ưu tiên mùi hương gọn gàng, không quá ngọt hoặc quá nồng. Nhóm cam chanh, hương gỗ nhẹ, hương thơm sạch và nước hoa có độ tỏa vừa phải thường dễ sử dụng trong phòng kín. Nên xịt lượng vừa đủ và chọn nồng độ phù hợp với thời tiết.</p><p>Xem thông tin nồng độ, nhóm hương và độ lưu hương trên từng trang sản phẩm trước khi lựa chọn.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nam',
    key: 'attr_phong-cach',
    value: 'lich-lam',
    h1: 'Nước Hoa Nam Lịch Lãm',
    metaTitle: 'Nước Hoa Nam Lịch Lãm, Sang Trọng Chính Hãng | MF Paris',
    metaDescription: 'Tham khảo nước hoa nam lịch lãm với phong cách chỉn chu, trưởng thành và dễ phối trong nhiều hoàn cảnh tại MF Paris.',
    introHtml: '<p>Bộ sưu tập <strong>nước hoa nam lịch lãm</strong> dành cho người yêu thích phong cách chỉn chu, trưởng thành và tinh tế. Sản phẩm được lọc theo thuộc tính Phong cách: Lịch lãm.</p>',
    bottomContentHtml: '<h2>Nước hoa nam lịch lãm nên có đặc điểm gì?</h2><p>Mùi hương lịch lãm thường có cấu trúc cân bằng, không quá gắt và không phụ thuộc vào một nốt hương duy nhất. Hương gỗ, cam chanh, gia vị nhẹ hoặc hổ phách có thể tạo cảm giác trưởng thành khi được phối với độ tỏa hợp lý.</p><p>Hãy xem mô tả mùi hương, nồng độ và thời điểm sử dụng để chọn chai phù hợp với công việc, gặp gỡ hoặc sự kiện trang trọng.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nam',
    key: 'attr_nhom-huong',
    value: 'go',
    h1: 'Nước Hoa Nam Hương Gỗ',
    metaTitle: 'Nước Hoa Nam Hương Gỗ Nam Tính, Sang Trọng | MF Paris',
    metaDescription: 'Khám phá nước hoa nam hương gỗ với sắc thái nam tính, ấm áp và sang trọng. Chọn nước hoa chính hãng tại MF Paris.',
    introHtml: '<p><strong>Nước hoa nam hương gỗ</strong> thường mang cảm giác khô, ấm và nam tính. Trang này tập hợp các sản phẩm được gắn thuộc tính Nhóm hương: Gỗ để bạn dễ tham khảo.</p>',
    bottomContentHtml: '<h2>Hương gỗ phù hợp với thời điểm nào?</h2><p>Hương gỗ có thể dùng quanh năm, nhưng thường nổi bật hơn trong thời tiết mát, buổi tối hoặc những dịp cần phong cách trưởng thành. Với môi trường nóng, hãy ưu tiên công thức có lớp cam chanh hoặc hương thơm thoáng để tổng thể không bị nặng.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nam',
    key: 'attr_do-luu-huong',
    value: '6-tieng-8-tieng',
    h1: 'Nước Hoa Nam Lưu Hương 6–8 Tiếng',
    metaTitle: 'Nước Hoa Nam Lưu Hương 6–8 Tiếng Chính Hãng | MF Paris',
    metaDescription: 'Tham khảo nước hoa nam có độ lưu hương khoảng 6–8 tiếng, phù hợp đi làm, đi chơi và sử dụng hằng ngày tại MF Paris.',
    introHtml: '<p>Danh sách <strong>nước hoa nam lưu hương 6–8 tiếng</strong> giúp bạn tìm sản phẩm có thời gian bám mùi ở mức cân bằng. Độ lưu hương thực tế còn phụ thuộc cơ địa, thời tiết và số lần xịt.</p>',
    bottomContentHtml: '<h2>Độ lưu hương 6–8 tiếng có phù hợp không?</h2><p>Đây là khoảng thời gian phù hợp với nhiều nhu cầu hằng ngày. Khi chọn nước hoa, không nên chỉ nhìn vào số giờ lưu hương; hãy cân nhắc cả độ tỏa, nồng độ, không gian sử dụng và sở thích cá nhân.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nu',
    key: 'attr_thoi-diem-su-dung',
    value: 'van-phong',
    h1: 'Nước Hoa Nữ Văn Phòng',
    metaTitle: 'Nước Hoa Nữ Văn Phòng Thanh Lịch, Dễ Chịu | MF Paris',
    metaDescription: 'Chọn nước hoa nữ văn phòng thanh lịch, sạch sẽ và tỏa hương vừa phải để dùng đi làm mỗi ngày tại MF Paris.',
    introHtml: '<p>Khám phá các mẫu <strong>nước hoa nữ văn phòng</strong> có phong cách thanh lịch, dễ chịu và phù hợp không gian kín. Danh sách được lọc theo nhu cầu sử dụng tại văn phòng.</p>',
    bottomContentHtml: '<h2>Cách chọn nước hoa nữ đi làm</h2><p>Mùi hương hoa sạch, cam chanh, xạ hương nhẹ hoặc gỗ mềm thường dễ dùng trong môi trường công sở. Tránh xịt quá nhiều trong phòng kín và nên thử trên da trước khi mua fullsize.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nu',
    key: 'attr_phong-cach',
    value: 'thanh-lich',
    h1: 'Nước Hoa Nữ Thanh Lịch',
    metaTitle: 'Nước Hoa Nữ Thanh Lịch, Tinh Tế Chính Hãng | MF Paris',
    metaDescription: 'Tham khảo nước hoa nữ thanh lịch, tinh tế và dễ sử dụng trong nhiều hoàn cảnh. Sản phẩm chính hãng tại MF Paris.',
    introHtml: '<p>Bộ sưu tập <strong>nước hoa nữ thanh lịch</strong> dành cho phong cách nhẹ nhàng, chỉn chu và không phô trương. Xem nhóm hương, độ lưu hương và thời điểm sử dụng của từng sản phẩm.</p>',
    bottomContentHtml: '<h2>Nước hoa nữ thanh lịch nên có mùi như thế nào?</h2><p>Một mùi hương thanh lịch thường có độ cân bằng tốt, không quá ngọt và không tỏa quá mạnh. Hoa cỏ, xạ hương sạch, cam chanh hoặc gỗ mềm là những hướng mùi dễ phối với trang phục hằng ngày.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-nu',
    key: 'attr_nhom-huong',
    value: 'vanilla-phuong-dong',
    h1: 'Nước Hoa Nữ Hương Vanilla Phương Đông',
    metaTitle: 'Nước Hoa Nữ Hương Vanilla Phương Đông | MF Paris',
    metaDescription: 'Khám phá nước hoa nữ hương vanilla phương Đông ngọt ấm, quyến rũ và nổi bật cho buổi tối hoặc thời tiết mát.',
    introHtml: '<p><strong>Nước hoa nữ hương vanilla phương Đông</strong> thường có sắc thái ngọt ấm, mềm và quyến rũ. Danh sách này giúp bạn tham khảo các sản phẩm được gắn đúng nhóm hương.</p>',
    bottomContentHtml: '<h2>Hương vanilla phương Đông hợp dùng khi nào?</h2><p>Nhóm hương này thường nổi bật vào buổi tối, mùa thu hoặc mùa đông. Trong thời tiết nóng, nên xịt lượng vừa phải để mùi hương giữ được sự dễ chịu và không bị quá dày.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-unisex',
    key: 'attr_nhom-huong',
    value: 'go',
    h1: 'Nước Hoa Unisex Hương Gỗ',
    metaTitle: 'Nước Hoa Unisex Hương Gỗ Chính Hãng | MF Paris',
    metaDescription: 'Tham khảo nước hoa unisex hương gỗ với phong cách cân bằng, hiện đại và dễ dùng cho cả nam lẫn nữ tại MF Paris.',
    introHtml: '<p><strong>Nước hoa unisex hương gỗ</strong> mang lại cảm giác cân bằng, khô và hiện đại. Đây là lựa chọn phù hợp khi bạn muốn một mùi hương không bị giới hạn theo giới tính.</p>',
    bottomContentHtml: '<h2>Cách chọn nước hoa unisex hương gỗ</h2><p>Hãy xem lớp hương đi kèm như cam chanh, hoa, xạ hương hoặc gia vị để biết tổng thể nghiêng về tươi mát, mềm mại hay ấm sâu. Khả năng hợp mùi còn phụ thuộc vào cơ địa và cách mùi hương phát triển trên da.</p>',
  },
  {
    categorySlug: 'nuoc-hoa-unisex',
    key: 'attr_phong-cach',
    value: 'sang-trong',
    h1: 'Nước Hoa Unisex Sang Trọng',
    metaTitle: 'Nước Hoa Unisex Sang Trọng, Tinh Tế | MF Paris',
    metaDescription: 'Khám phá nước hoa unisex sang trọng, tinh tế và dễ tạo dấu ấn cá nhân. Sản phẩm chính hãng tại MF Paris.',
    introHtml: '<p>Bộ sưu tập <strong>nước hoa unisex sang trọng</strong> dành cho người muốn tìm mùi hương có cá tính nhưng vẫn cân bằng và dễ sử dụng trong nhiều hoàn cảnh.</p>',
    bottomContentHtml: '<h2>Nước hoa unisex sang trọng phù hợp với ai?</h2><p>Nhóm này phù hợp với người thích thử mùi hương vượt qua cách phân loại nam và nữ. Hãy đọc kỹ nhóm hương, nồng độ và thời điểm sử dụng trước khi chọn.</p>',
  },
  {
    categorySlug: 'nuoc-hoa',
    key: 'attr_nong-do',
    value: 'eau-de-parfum',
    h1: 'Nước Hoa Eau de Parfum Chính Hãng',
    metaTitle: 'Nước Hoa Eau de Parfum Chính Hãng | MF Paris',
    metaDescription: 'Khám phá nước hoa Eau de Parfum chính hãng với nhiều phong cách, nhóm hương và thương hiệu tại MF Paris.',
    introHtml: '<p><strong>Eau de Parfum</strong> là một trong những nồng độ phổ biến nhất khi chọn nước hoa. Trang này tập hợp các sản phẩm EDP đang có tại MF Paris để bạn dễ so sánh.</p>',
    bottomContentHtml: '<h2>Eau de Parfum có gì khác?</h2><p>Eau de Parfum thường có tỷ lệ tinh dầu cao hơn Eau de Toilette, nhưng thời gian lưu hương thực tế vẫn phụ thuộc công thức, cơ địa, thời tiết và cách xịt. Hãy chọn theo mùi hương và hoàn cảnh sử dụng thay vì chỉ dựa vào nồng độ.</p>',
  },
] as const

function mergeFacet(
  facets: unknown,
  definition: LandingDefinition,
): Array<IndexableFacetConfig & { key: string; value: string }> {
  const existing = Array.isArray(facets)
    ? facets
      .filter((facet): facet is IndexableFacetConfig => Boolean(facet && typeof facet === 'object'))
      .map((facet) => ({
        ...facet,
        key: String(facet.key || '').trim(),
        value: String(facet.value || '').trim().toLowerCase(),
      }))
      .filter((facet) => facet.key && facet.value)
    : []
  const key = normalizeIndexableFacetKey(definition.key)
  const value = definition.value
  const next = {
    key,
    value,
    h1: definition.h1,
    metaTitle: definition.metaTitle,
    metaDescription: definition.metaDescription,
    introHtml: definition.introHtml,
    bottomContentHtml: definition.bottomContentHtml,
  }
  const index = existing.findIndex((facet) => (
    normalizeIndexableFacetKey(facet.key) === key &&
    String(facet.value || '').trim().toLowerCase() === value
  ))

  if (index >= 0) {
    existing[index] = { ...existing[index], ...next }
  } else {
    existing.push(next)
  }

  return existing
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const byCategory = new Map<string, LandingDefinition[]>()

  for (const definition of LANDINGS) {
    const list = byCategory.get(definition.categorySlug) ?? []
    list.push(definition)
    byCategory.set(definition.categorySlug, list)
  }

  const summary: Array<Record<string, unknown>> = []

  for (const [categorySlug, definitions] of byCategory) {
    const categoryRes = await payload.find({
      collection: 'categories',
      where: { slug: { equals: categorySlug } },
      depth: 0,
      limit: 1,
      pagination: false,
    })
    const category = categoryRes.docs[0]

    if (!category) {
      summary.push({ categorySlug, status: 'missing_category' })
      continue
    }

    const eligible: LandingDefinition[] = []

    for (const definition of definitions) {
      const attributeSlug = definition.key.replace(/^attr_/, '')
      const attributeRes = await payload.find({
        collection: 'attributes',
        where: {
          and: [
            { slug: { equals: attributeSlug } },
            { isActive: { equals: true } },
          ],
        },
        depth: 0,
        limit: 1,
        pagination: false,
      })
      const attribute = attributeRes.docs[0]

      const valueRes = attribute
        ? await payload.find({
          collection: 'attribute-values',
          where: {
            and: [
              { attribute: { equals: attribute.id } },
              { slug: { equals: definition.value } },
              { isActive: { equals: true } },
            ],
          },
          depth: 0,
          limit: 1,
          pagination: false,
        })
        : { docs: [] }
      const value = valueRes.docs[0]

      const productCount = attribute && value
        ? await payload.count({
          collection: 'products',
          where: {
            and: [
              { status: { equals: 'published' } },
              { categories: { contains: category.id } },
              { 'productAttributes.attribute': { equals: attribute.id } },
              { 'productAttributes.values': { contains: value.id } },
            ],
          },
          overrideAccess: true,
        })
        : { totalDocs: 0 }

      const count = productCount.totalDocs ?? 0
      const path = buildIndexableFacetPath(definition.key, definition.value)
      const status = !attribute
        ? 'missing_attribute'
        : !value
          ? 'missing_value'
          : count < MIN_PRODUCTS
            ? 'too_few_products'
            : 'eligible'

      summary.push({ categorySlug, path, count, status })

      if (status === 'eligible') {
        eligible.push(definition)
      }
    }

    if (eligible.length > 0) {
      const existingFacets: Array<IndexableFacetConfig & { key: string; value: string }> = Array.isArray(category.indexableFacets)
        ? (category.indexableFacets as IndexableFacetConfig[])
          .map((facet) => ({
            ...facet,
            key: String(facet.key || '').trim(),
            value: String(facet.value || '').trim().toLowerCase(),
          }))
          .filter((facet) => facet.key && facet.value)
        : []
      const indexableFacets = eligible.reduce<Array<IndexableFacetConfig & { key: string; value: string }>>(
        (facets, definition) => mergeFacet(facets, definition),
        existingFacets,
      )

      if (!DRY_RUN) {
        await payload.update({
          collection: 'categories',
          id: category.id,
          data: { indexableFacets },
          overrideAccess: true,
        })
      }

      console.log(`${DRY_RUN ? '[dry-run] ' : ''}Cập nhật landing category ${categorySlug}: ${eligible.length}`)
    }
  }

  console.log('\nHoàn tất seed landing nước hoa.')
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    minimumProducts: MIN_PRODUCTS,
    summary,
  }, null, 2))

  if (DRY_RUN) {
    console.log('\nChạy lại với --yes để ghi các landing đủ điều kiện vào Payload.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
