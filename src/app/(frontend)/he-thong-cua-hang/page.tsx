import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import {
  buildStaticPageSchemaGraph,
  getMfParisLocalBusinessInput,
} from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Hệ thống cửa hàng | MF Paris',
  description: 'Địa chỉ cửa hàng Marais de France, giờ mở cửa, hotline và bản đồ chỉ đường tại TP.HCM.',
}

export default function StoreLocationPage() {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/he-thong-cua-hang',
      name: 'Hệ thống cửa hàng MF Paris',
      description: 'Địa chỉ cửa hàng Marais de France, giờ mở cửa, hotline và bản đồ chỉ đường tại TP.HCM.',
      type: 'WebPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Hệ thống cửa hàng', url: '/he-thong-cua-hang' },
    ],
    localBusiness: getMfParisLocalBusinessInput(),
  })

  return (
    <main className="bg-[#f7f7f7] py-12">
      <JsonLd data={schemaGraph} />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
          <p className="text-sm font-bold uppercase tracking-widest text-[#b72828]">Marais de France</p>
          <h1 className="mt-3 text-3xl font-black text-gray-950">Hệ thống cửa hàng MF Paris</h1>
          <p className="mt-5 text-sm leading-7 text-gray-600 md:text-base">
            MF Paris hiện có cửa hàng tại Gò Vấp, TP.HCM và hỗ trợ giao hàng toàn quốc qua các đối tác vận chuyển uy tín.
          </p>
          <div className="mt-8 grid gap-5 text-sm leading-7 text-gray-700">
            <p><strong>Địa chỉ:</strong> 220/24 Nguyễn Oanh, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam</p>
            <p><strong>Hotline:</strong> 079.29.79.299</p>
            <p><strong>Email:</strong> cskh@maraisdefrance.vn</p>
            <p><strong>Giờ mở cửa:</strong> 08:00 - 22:00, Thứ 2 đến Chủ nhật</p>
            <p><strong>Khu vực phục vụ:</strong> TP.HCM và toàn quốc qua vận chuyển</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="https://maps.app.goo.gl/pS7KGh78XnVHYwX56" className="inline-flex rounded-full bg-black px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#b72828]" target="_blank" rel="noopener noreferrer">
              Mở Google Maps
            </Link>
            <Link href="/contact" className="inline-flex rounded-full border border-gray-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-700 transition hover:border-black hover:bg-black hover:text-white">
              Liên hệ cửa hàng
            </Link>
          </div>
        </article>
        <aside className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-[#fff6f3]">
            <iframe title="Bản đồ cửa hàng MF Paris" src="https://www.google.com/maps?q=10.8240504,106.6789258&z=16&output=embed" className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <p className="mt-5 text-sm leading-7 text-gray-600">
            Khách có thể đến cửa hàng để nhận tư vấn trực tiếp, kiểm tra sản phẩm và nhận hàng tại cửa hàng.
          </p>
        </aside>
      </section>
    </main>
  )
}
