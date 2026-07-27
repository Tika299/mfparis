import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Tra cứu đơn hàng | MF Paris',
  description: 'Hướng dẫn tra cứu và liên hệ MF Paris để kiểm tra trạng thái đơn hàng.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/tra-cuu-don-hang',
      name: 'Tra cứu đơn hàng',
      description: 'Hướng dẫn tra cứu và liên hệ MF Paris để kiểm tra trạng thái đơn hàng.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Tra cứu đơn hàng', url: '/tra-cuu-don-hang' },
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
const heading = 'Tra cứu đơn hàng'
const intro = 'Trang tra cứu đơn hàng đang được hoàn thiện để bảo vệ thông tin cá nhân của khách hàng. Trong thời gian này, MF Paris hỗ trợ kiểm tra đơn qua hotline, email hoặc Zalo.'
const ctaHref = '/contact'
const ctaLabel = 'Liên hệ kiểm tra đơn'
const sections = [
  {
    "title": "Thông tin cần chuẩn bị",
    "body": "Bạn nên chuẩn bị mã đơn hàng, số điện thoại hoặc email đã dùng khi đặt hàng để đội ngũ MF Paris kiểm tra nhanh hơn."
  },
  {
    "title": "Kênh hỗ trợ",
    "body": "Liên hệ hotline 079.29.79.299 hoặc email cskh@maraisdefrance.vn để được cập nhật trạng thái đơn hàng."
  }
]
