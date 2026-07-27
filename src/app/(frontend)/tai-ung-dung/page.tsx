import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Tải ứng dụng Marais de France | MF Paris',
  description: 'Thông tin tải ứng dụng Marais de France. Trang đang được cập nhật trước khi phát hành chính thức.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/tai-ung-dung',
      name: 'Tải ứng dụng Marais de France',
      description: 'Thông tin tải ứng dụng Marais de France. Trang đang được cập nhật trước khi phát hành chính thức.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Tải ứng dụng Marais de France', url: '/tai-ung-dung' },
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
const heading = 'Ứng dụng Marais de France đang được cập nhật'
const intro = 'MF Paris đang hoàn thiện trải nghiệm ứng dụng để khách hàng theo dõi ưu đãi, sản phẩm yêu thích và đơn hàng thuận tiện hơn.'
const ctaHref = '/products'
const ctaLabel = 'Mua trên website'
const sections = [
  {
    "title": "Trong thời gian chờ ứng dụng",
    "body": "Bạn vẫn có thể mua hàng trực tiếp trên website, lưu sản phẩm yêu thích và liên hệ đội ngũ tư vấn qua hotline hoặc Zalo."
  },
  {
    "title": "Thông báo phát hành",
    "body": "Khi ứng dụng sẵn sàng, MF Paris sẽ cập nhật link tải chính thức tại trang này và các kênh mạng xã hội của thương hiệu."
  }
]
