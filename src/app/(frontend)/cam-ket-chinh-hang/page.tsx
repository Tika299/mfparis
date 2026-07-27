import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Cam kết chính hãng | MF Paris',
  description: 'Cam kết sản phẩm chính hãng, nguồn gốc rõ ràng và hỗ trợ tư vấn trước khi mua tại MF Paris.',
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/cam-ket-chinh-hang',
      name: 'Cam kết chính hãng',
      description: 'Cam kết sản phẩm chính hãng, nguồn gốc rõ ràng và hỗ trợ tư vấn trước khi mua tại MF Paris.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Cam kết chính hãng', url: '/cam-ket-chinh-hang' },
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
const heading = 'Cam kết chính hãng'
const intro = 'MF Paris tập trung vào sản phẩm có nguồn gốc rõ ràng, thông tin minh bạch và trải nghiệm tư vấn phù hợp với nhu cầu khách hàng.'
const ctaHref = '/products'
const ctaLabel = 'Xem sản phẩm'
const sections = [
  {
    "title": "Nguồn gốc sản phẩm",
    "body": "Sản phẩm được tuyển chọn theo tiêu chí thương hiệu, thông tin sản phẩm, tình trạng bao bì và trải nghiệm sử dụng thực tế."
  },
  {
    "title": "Tư vấn trước khi mua",
    "body": "Đội ngũ MF Paris hỗ trợ khách chọn sản phẩm theo nhu cầu, ngân sách, mùi hương, loại da hoặc mục tiêu chăm sóc."
  },
  {
    "title": "Hỗ trợ sau bán",
    "body": "Nếu sản phẩm gặp vấn đề trong quá trình vận chuyển hoặc giao sai thông tin đơn hàng, MF Paris tiếp nhận và xử lý theo chính sách đổi trả."
  }
]
