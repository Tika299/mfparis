import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp | MF Paris',
  description: 'Giải đáp nhanh các câu hỏi thường gặp về mua hàng, thanh toán, vận chuyển và đổi trả tại MF Paris.',
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/cau-hoi-thuong-gap',
      name: 'Câu hỏi thường gặp',
      description: 'Giải đáp nhanh các câu hỏi thường gặp về mua hàng, thanh toán, vận chuyển và đổi trả tại MF Paris.',
      type: 'FAQPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Câu hỏi thường gặp', url: '/cau-hoi-thuong-gap' },
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
const heading = 'Câu hỏi thường gặp'
const intro = 'Một số câu hỏi phổ biến giúp bạn hiểu rõ hơn về quy trình mua hàng và chính sách hỗ trợ tại MF Paris.'
const ctaHref = '/products'
const ctaLabel = 'Xem sản phẩm'
const sections = [
  {
    "title": "MF Paris có giao hàng toàn quốc không?",
    "body": "Có. MF Paris giao hàng toàn quốc qua các đối tác vận chuyển uy tín."
  },
  {
    "title": "Tôi có được kiểm tra hàng khi nhận không?",
    "body": "Bạn được kiểm tra tình trạng bên ngoài kiện hàng trước khi nhận. Với sản phẩm lỗi hoặc giao sai, vui lòng liên hệ ngay để được hỗ trợ."
  },
  {
    "title": "Có thể đổi trả sản phẩm không?",
    "body": "MF Paris hỗ trợ đổi trả trong vòng 7 ngày nếu sản phẩm bị lỗi, giao sai mẫu, sai dung tích hoặc hư hỏng trong quá trình vận chuyển."
  }
]
