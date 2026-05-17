import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/utilities/formatPrice'
import { ProductGallery } from '@/components/ProductGallery' // Đảm bảo bạn đã tạo file này
import { ProductPurchase } from '@/components/ProductPurchase' // Đảm bảo bạn đã tạo file này
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Star, ShieldCheck, Leaf, FlaskConical, Truck, Award } from 'lucide-react'
import RichText from '@/components/RichText'

// 1. Cấu hình SEO động (Next.js 15 - Params là Promise)
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
    description:
      product.seoDescription ||
      `Mua ngay ${product.title} tại MF Paris. Cam kết hàng Pháp chính hãng, giá tốt nhất.`,
    openGraph: {
      images: [ogImage],
    },
  }
}

// 2. Trang Chi tiết sản phẩm
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  // Lấy dữ liệu sản phẩm kèm theo Brand và Category
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const product: any = result.docs[0]
  if (!product) notFound()

  // Tính % giảm giá
  const basePrice = product.price?.basePrice || 0
  const salePrice = product.price?.salePrice
  const discountPercent = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0
  console.log(product)
  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20 font-sans">
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-8 overflow-hidden whitespace-nowrap">
          <a href="/" className="hover:text-black transition-colors">
            Trang chủ
          </a>
          <span>/</span>
          <a href="/products" className="hover:text-black transition-colors">
            Sản phẩm
          </a>
          <span>/</span>
          <span className="text-black truncate">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">
          {/* CỘT TRÁI: GALLERY ẢNH (Tỉ lệ 1:1 kiểu Long Châu) */}
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} />
          </div>

          {/* CỘT PHẢI: THÔNG TIN MUA HÀNG */}
          <div className="lg:col-span-5 space-y-8">
            <header className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {/* BIẾN THƯƠNG HIỆU THÀNH LINK */}
                  <Link
                    href={`/brands/${product.brand?.slug}`}
                    className="text-xs font-black uppercase tracking-[0.3em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full hover:bg-amber-700 hover:text-white transition-all duration-300"
                  >
                    {product.brand?.name || 'Paris Authentic'}
                  </Link>

                  {discountPercent > 0 && (
                    <Badge className="bg-red-600 font-bold text-xs uppercase tracking-tighter">
                      Tiết kiệm {discountPercent}%
                    </Badge>
                  )}
                </div>
                {/* Tên sản phẩm */}
                <h1 className="heading-product">{product.title}</h1>
              </div>

              {/* Đánh giá sao giả lập */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 font-bold border-l pl-3 uppercase tracking-tighter">
                  Mã SKU: {product.sku || 'N/A'}
                </span>
              </div>

              {/* Giá tiền */}
              <div className="flex items-center gap-4 pt-4">
                <div className="text-3xl font-black text-[#16423C]">
                  {formatPrice(salePrice || basePrice)}₫
                </div>
                {salePrice && (
                  <>
                    <span className="text-lg text-gray-300 line-through decoration-red-500/30">
                      {formatPrice(basePrice)}₫
                    </span>
                    <Badge className="bg-red-500 hover:bg-red-500 rounded-full font-bold">
                      -{discountPercent}%
                    </Badge>
                  </>
                )}
              </div>
            </header>

            {/* KHỐI MUA HÀNG (Rounded Box) */}
            <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
              <ProductPurchase product={product} />

              {/* Cam kết ngắn */}
              <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                <div className="flex items-center gap-2">
                  <Truck size={14} /> Giao nhanh 2h
                </div>
                <div className="flex items-center gap-2">
                  <Award size={14} /> Đổi trả 7 ngày
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} /> 100% Chính hãng
                </div>
              </div>
            </div>

            {/* THÔNG SỐ KỸ THUẬT ĐỘNG (Dynamic Specs) */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="space-y-4 bg-white/50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest border-b pb-3">
                  Thông số sản phẩm
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {product.specifications.map((spec: any) => (
                    <div key={spec.id} className="flex justify-between text-sm">
                      <span className="text-gray-400 font-medium">{spec.label}</span>
                      <span className="font-bold text-gray-800">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh Mục */}
            {product.categories && product.categories.length > 0 && (
              <div className="space-y-4 bg-white/50 p-6 rounded-3xl border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest border-b pb-3">
                  Danh mục
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((cat: any) => (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      className="text-xs font-bold text-gray-600 hover:text-amber-700 hover:underline decoration-amber-200 underline-offset-4 transition-all"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ACCORDION (Thông tin bổ sung) */}
            <div className="pt-2">
              <Accordion type="single" collapsible className="w-full space-y-3">
                {product.accordions?.map((item: any, i: number) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-b-0 bg-white rounded-2xl px-6 shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <AccordionTrigger className="font-bold text-xs uppercase tracking-[0.1em] py-5 hover:no-underline text-gray-700">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-500 leading-loose text-sm pb-6">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>

        {/* PHẦN MÔ TẢ CHI TIẾT (Full Width bên dưới) */}
        <div className="mt-24 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-serif inline-block relative">
              Chi tiết sản phẩm
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-amber-700/20"></div>
            </h2>
          </div>

          {/* Render HTML từ WordPress Description */}
          <RichText
            content={product.description}
            className="prose prose-neutral max-w-none text-gray-600 leading-relaxed"
          />
        </div>

        {/* SECTION: CÓ THỂ BẠN CŨNG THÍCH (Gợi ý thêm - Bạn có thể code logic sau) */}
        <div className="mt-32 border-t pt-20">
          <h2 className="text-3xl font-bold font-serif mb-12 text-center">Có thể bạn cũng thích</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <p className="col-span-full text-center text-gray-400 text-xs uppercase tracking-widest italic">
              Đang cập nhật sản phẩm liên quan...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
