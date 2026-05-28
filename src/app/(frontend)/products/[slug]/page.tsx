// D:\mfparis\src\app\(frontend)\products\[slug]\page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/utilities/formatPrice'
import { ProductGallery } from '@/components/ProductGallery'
import { ProductPurchase } from '@/components/ProductPurchase'
import { RelatedProducts } from '@/components/RelatedProducts'
import { ProductAccordionContent, ProductQuickNav } from '@/components/ProductQuickNav'
import {
  Star,
  ShieldCheck,
  Truck,
  ChevronRight,
  CheckCircle2,
  Info,
  UserCheck,
} from 'lucide-react'

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

  const categoryIds = product.categories?.map((cat: any) => cat.id) || []
  const relatedRes = await payload.find({
    collection: 'products',
    limit: 10,
    where: {
      and: [
        { id: { not_equals: product.id } },
        { status: { equals: 'published' } },
        {
          or: [{ brand: { equals: product.brand?.id } }, { categories: { in: categoryIds } }],
        },
      ],
    },
  })

  const basePrice = product.price?.basePrice || 0
  const salePrice = product.price?.salePrice
  const discountPercent = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 lg:pb-12">
      <ProductQuickNav accordions={product.accordions || []} />

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux flex h-11 items-center gap-1.5 text-xs font-medium text-gray-500 md:h-12">
          <Link href="/" className="line-clamp-1 hover:text-black">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="line-clamp-1 hover:text-black">Sản phẩm</Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 text-gray-900">{product.title}</span>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        <div className="flex flex-col gap-6 lg:gap-8">

          {/* Hero Section */}
          <div className="grid grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-sm lg:grid-cols-12">
            <div className="lg:col-span-7 lg:border-r lg:border-gray-100">
              <ProductGallery images={product.images} />
            </div>

            <div className="flex flex-col p-5 md:p-8 lg:col-span-5 lg:p-10">
              {/* Thông tin sản phẩm */}
              <div className="mb-6">
                <Link href={`/brands/${product.brand?.slug}`} className="text-xs font-black uppercase tracking-widest text-[#b72828]">
                  {product.brand?.name}
                </Link>
                <h1 className="mt-3 text-2xl font-sans font-bold leading-tight md:text-3xl lg:text-[2.1rem]">
                  {product.title}
                </h1>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={18} fill="currentColor" /> 5.0
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</span>
                </div>
              </div>

              {/* Giá */}
              <div className="mb-8 rounded-2xl bg-[#F8F9FB] p-6">
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black text-[#b72828] md:text-4xl">
                    {formatPrice(salePrice || basePrice)}₫
                  </span>
                  {salePrice && (
                    <span className="pb-1 text-lg text-gray-400 line-through">
                      {formatPrice(basePrice)}₫
                    </span>
                  )}
                </div>
                {discountPercent > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ffebeb] px-4 py-1.5 text-xs font-bold text-[#b72828]">
                    <CheckCircle2 size={14} /> Tiết kiệm {discountPercent}%
                  </div>
                )}
              </div>

              <ProductPurchase product={product} />

              <button className="mt-4 h-14 w-full rounded-full bg-[#b72828] text-sm font-black uppercase tracking-widest text-white transition hover:bg-black">
                MUA NGAY BÂY GIỜ
              </button>

              {Array.isArray(product.categories) && product.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Danh mục:</span>
                  {product.categories.map((cat: any) => {
                    // cat có thể là object hoặc id tùy depth
                    if (!cat || typeof cat !== 'object' || !cat.slug) return null

                    return (
                      <Link
                        key={cat.id}
                        href={`/categories/${cat.slug}`}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 transition-colors hover:border-black hover:text-black"
                      >
                        {cat.name}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Trust Badges */}
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-100 pt-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase">Giao nhanh 2h</p>
                    <p className="text-[10px] text-gray-500">Hà Nội & TP.HCM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-50 p-2.5 text-green-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase">100% Chính hãng</p>
                    <p className="text-[10px] text-gray-500">Bảo hành đầy đủ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nội dung chi tiết */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sidebar Mục lục - Desktop only */}
            <aside className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
                <p className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 text-xs font-black uppercase tracking-widest text-gray-400">
                  <Info size={15} /> MỤC LỤC
                </p>
                <nav className="py-2">
                  {(product.accordions || []).map((item: any, i: number) => (
                    <a
                      key={i}
                      href={`#section-${i}`}
                      className="block rounded-xl px-5 py-[14px] text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-[#b72828] transition-colors"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-9">
              <ProductAccordionContent accordions={product.accordions || []} />

              {/* Tư vấn block */}
              <div className="mt-10 rounded-[2.5rem] bg-[#16423C] p-8 text-white md:p-10">
                <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-400">
                    <UserCheck size={32} />
                  </div>
                  <div className="text-center md:text-left">
                    <h4 className="text-lg font-bold uppercase italic">Chuyên gia MF Paris tư vấn</h4>
                    <p className="mt-3 text-[15px] leading-relaxed text-emerald-100/80">
                      Nếu bạn có thắc mắc về cách sử dụng hoặc thành phần, hãy nhấn Chat ngay để được hỗ trợ 24/7.
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>

          <RelatedProducts products={relatedRes.docs} />
        </div>
      </div>
    </div>
  )
}