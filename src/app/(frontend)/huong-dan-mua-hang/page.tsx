import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Hướng dẫn mua hàng | MF Paris',
  description: 'Hướng dẫn chọn sản phẩm, thêm vào giỏ hàng, áp dụng voucher và hoàn tất đặt hàng tại MF Paris.',
}

export default function StaticInfoPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/huong-dan-mua-hang',
      name: 'Hướng dẫn mua hàng',
      description: 'Hướng dẫn chọn sản phẩm, thêm vào giỏ hàng, áp dụng voucher và hoàn tất đặt hàng tại MF Paris.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Hướng dẫn mua hàng', url: '/huong-dan-mua-hang' },
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
const heading = 'Hướng dẫn mua hàng tại MF Paris'
const intro = 'Các bước mua hàng được thiết kế để khách dễ chọn sản phẩm, kiểm tra thông tin và hoàn tất đơn hàng nhanh chóng.'
const ctaHref = '/products'
const ctaLabel = 'Xem sản phẩm'
const sections = [
  {
    "title": "Bước 1: Chọn sản phẩm",
    "body": "Bạn có thể tìm theo tên sản phẩm, thương hiệu, danh mục hoặc dùng bộ lọc để thu hẹp lựa chọn phù hợp."
  },
  {
    "title": "Bước 2: Kiểm tra giỏ hàng",
    "body": "Kiểm tra lại biến thể, số lượng, giá bán, voucher và phí vận chuyển trước khi chuyển sang thanh toán."
  },
  {
    "title": "Bước 3: Xác nhận đặt hàng",
    "body": "Nhập thông tin nhận hàng, chọn phương thức thanh toán và xác nhận. MF Paris sẽ liên hệ lại khi cần xác minh đơn."
  }
]
