import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Chính sách kiểm hàng | MF Paris',
  description: 'Chính sách kiểm tra tình trạng kiện hàng khi nhận sản phẩm từ MF Paris.',
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/chinh-sach-kiem-hang',
      name: 'Chính sách kiểm hàng',
      description: 'Chính sách kiểm tra tình trạng kiện hàng khi nhận sản phẩm từ MF Paris.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Chính sách kiểm hàng', url: '/chinh-sach-kiem-hang' },
    ],
  })

  return (
    <main className="bg-[#f7f7f7] py-12">
      <JsonLd data={schemaGraph} />
      <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
        <p className="text-sm font-bold uppercase tracking-widest text-[#b72828]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black text-gray-950">{heading}</h1>
        <p className="mt-5 text-sm leading-7 text-gray-600 md:text-base">{intro}</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-bold text-gray-950">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={ctaHref} className="inline-flex rounded-full bg-black px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#b72828]">
            {ctaLabel}
          </Link>
          <Link href="/contact" className="inline-flex rounded-full border border-gray-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-700 transition hover:border-black hover:bg-black hover:text-white">
            Liên hệ tư vấn
          </Link>
        </div>
      </article>
    </main>
  )
}

const eyebrow = 'MF Paris'
const heading = 'Chính sách kiểm hàng'
const intro = 'MF Paris khuyến khích khách hàng kiểm tra tình trạng bên ngoài kiện hàng trước khi xác nhận nhận hàng.'
const ctaHref = '/products'
const ctaLabel = 'Xem sản phẩm'
const sections = [
  {
    "title": "Phạm vi kiểm hàng",
    "body": "Khách hàng có thể kiểm tra tình trạng bao bì, tem nhãn, số lượng kiện hàng và dấu hiệu hư hỏng bên ngoài."
  },
  {
    "title": "Khi phát hiện bất thường",
    "body": "Nếu kiện hàng móp méo, rách, ướt hoặc có dấu hiệu bị mở, bạn nên chụp ảnh/quay video và liên hệ MF Paris để được hỗ trợ."
  },
  {
    "title": "Lưu ý khi mở sản phẩm",
    "body": "Với các sản phẩm mỹ phẩm, nước hoa và sản phẩm chăm sóc cá nhân, vui lòng giữ bao bì, tem nhãn và hóa đơn hoặc thông tin đơn hàng."
  }
]
