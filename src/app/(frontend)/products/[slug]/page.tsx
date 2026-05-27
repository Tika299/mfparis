import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/utilities/formatPrice'
import { ProductGallery } from '@/components/ProductGallery'
import { ProductPurchase } from '@/components/ProductPurchase'
import { RelatedProducts } from '@/components/RelatedProducts'
import RichText from '@/components/RichText'
import {
  Star,
  ShieldCheck,
  Truck,
  ChevronRight,
  CheckCircle2,
  Info,
  UserCheck
} from 'lucide-react'

// 1. SEO Động
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
  })

  const product = result.docs[0]
  if (!product) return { title: 'Không tìm thấy sản phẩm' }

  const ogImage = typeof product.images?.[0]?.image === 'object' ? product.images[0].image.url : ''

  return {
    title: `${product.title} | MF Paris Chính Hãng`,
    description: product.seoDescription || product.shortDescription,
    openGraph: { images: [ogImage] },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const product: any = result.docs[0]
  if (!product) notFound()

  // Truy vấn sản phẩm liên quan
  const categoryIds = product.categories?.map((cat: any) => cat.id) || []
  const relatedRes = await payload.find({
    collection: 'products',
    limit: 10,
    where: {
      and: [
        { id: { not_equals: product.id } },
        { status: { equals: 'published' } },
        {
          or: [
            { brand: { equals: product.brand?.id } },
            { categories: { in: categoryIds } }
          ]
        }
      ]
    }
  })

  const basePrice = product.price?.basePrice || 0
  const salePrice = product.price?.salePrice
  const discountPercent = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-20 antialiased font-sans text-[#333]">

      {/* 1. BREADCRUMB */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 h-12 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Link href="/" className="hover:text-black">Trang chủ</Link>
          <ChevronRight size={12} />
          <Link href="/products" className="hover:text-black">Sản phẩm</Link>
          <ChevronRight size={12} />
          <span className="text-gray-900 truncate max-w-[300px]">{product.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-4">
        <div className="flex flex-col gap-4">

          {/* --- KHỐI TRÊN: THÔNG TIN MUA HÀNG --- */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 p-4 md:p-8 border-r border-gray-50">
              <ProductGallery images={product.images} />
            </div>

            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col">
              <div className="mb-6">
                <Link
                  href={`/brands/${product.brand?.slug}`}
                  className="text-[#b72828] font-black text-[11px] uppercase tracking-widest hover:underline"
                >
                  {product.brand?.name || 'Authentic'}
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 leading-tight">
                  {product.title}
                </h1>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                    <Star size={16} fill="currentColor" /> 5.0
                  </div>
                  <span className="text-gray-200">|</span>
                  <span className="text-xs text-gray-400 font-medium tracking-tight">Mã SKU: {product.sku || 'N/A'}</span>
                </div>
              </div>

              {/* KHỐI GIÁ */}
              <div className="bg-[#F8F9FB] rounded-2xl p-6 mb-8 border border-gray-50">
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl font-black text-[#b72828] tracking-tighter">
                    {formatPrice(salePrice || basePrice)}₫
                  </span>
                  {salePrice && (
                    <span className="text-base text-gray-400 line-through font-light">
                      {formatPrice(basePrice)}₫
                    </span>
                  )}
                </div>
                {discountPercent > 0 && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-[#ffebeb] text-[#b72828] px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                    <CheckCircle2 size={12} /> Tiết kiệm {formatPrice(basePrice - (salePrice || 0))}₫
                  </div>
                )}
              </div>

              {/* NÚT MUA HÀNG */}
              <div className="space-y-4">
                <ProductPurchase product={product} />
                <button className="w-full py-4 bg-[#b72828] text-white rounded-full font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-red-100 hover:bg-black transition-all">
                  Mua ngay bây giờ
                </button>
              </div>

              {/* CAM KẾT DỊCH VỤ */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Truck size={16} /></div>
                  <span className="text-[10px] font-bold uppercase text-gray-500">Giao nhanh 2h</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600"><ShieldCheck size={16} /></div>
                  <span className="text-[10px] font-bold uppercase text-gray-500">100% Chính hãng</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- KHỐI DƯỚI: MÔ TẢ CHI TIẾT THEO MỤC --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">

            {/* SIDEBAR ĐIỀU HƯỚNG BÊN TRÁI (TỰ ĐỘNG THEO ACCORDIONS) */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
                <p className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 flex items-center gap-2">
                  <Info size={14} className="text-blue-600" /> Mục lục nội dung
                </p>
                <nav className="flex flex-col py-2">
                  {product.accordions?.map((item: any, i: number) => (
                    <a
                      key={i}
                      href={`#section-${i}`}
                      className="p-4 text-xs font-bold text-gray-600 hover:text-[#b72828] hover:bg-red-50/50 transition-all rounded-xl"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* NỘI DUNG CHÍNH */}
            <main className="lg:col-span-9 space-y-4">
              {/* Lặp qua mảng accordions đã bóc tách từ H2 WordPress */}
              {product.accordions?.map((item: any, i: number) => (
                <section
                  key={i}
                  id={`section-${i}`}
                  className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-white scroll-mt-28"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3 font-serif italic border-b border-gray-50 pb-4">
                    <span className="w-1.5 h-6 bg-[#b72828] rounded-full"></span>
                    {item.title}
                  </h2>
                  <RichText content={item.content} className="prose-p:text-[15px] prose-p:leading-[1.8]" />
                </section>
              ))}

              {/* BOX CHUYÊN GIA TƯ VẤN */}
              <div className="bg-[#16423C] rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 text-amber-400">
                  <UserCheck size={32} />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="font-bold text-lg font-serif italic uppercase">Chuyên gia MF Paris tư vấn</h4>
                  <p className="text-sm text-emerald-100/70 leading-relaxed mt-1">
                    Nếu bạn có thắc mắc về cách sử dụng hoặc thành phần, hãy nhấn Chat ngay để được hỗ trợ 24/7.
                  </p>
                </div>
              </div>
            </main>
          </div>

          {/* SẢN PHẨM LIÊN QUAN */}
          <section className="lg:col-span-12 mt-12 mb-10">
            <RelatedProducts products={relatedRes.docs} />
          </section>

        </div>
      </div>
    </div>
  )
}