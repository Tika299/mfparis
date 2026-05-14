import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/utilities/formatPrice'
import { ProductPurchase } from '@/components/ProductPurchase'
import { Badge } from '@/components/ui/badge'

// 1. Cấu hình SEO động (Next.js 15)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
  })

  const product = result.docs[0]
  if (!product) return { title: 'Không tìm thấy sản phẩm' }

  return {
    title: `${product.title} | MF Paris - Nước hoa Pháp chính hãng`,
    description:
      product.seoDescription || `Mua ngay ${product.title} tại MF Paris. Cam kết chính hãng 100%.`,
    openGraph: {
      images: [
        typeof product.images?.[0]?.image !== 'string'
          ? (product.images?.[0]?.image as any).url
          : '',
      ],
    },
  }
}

// 2. Trang hiển thị chi tiết
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    depth: 2, // Lấy đầy đủ thông tin Brand và Media
  })

  const product = result.docs[0]
  if (!product) notFound()

  // Tính toán % giảm giá
  const discountPercent = product.price?.salePrice
    ? Math.round(
        ((product.price.basePrice - product.price.salePrice) / product.price.basePrice) * 100,
      )
    : 0

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* CỘT TRÁI: HÌNH ẢNH (Giao diện 7/12 cột) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[3/4] w-full bg-[#f9f9f9] overflow-hidden group">
              {discountPercent > 0 && (
                <Badge className="absolute top-4 left-4 z-10 bg-red-600 text-white px-3 py-1 rounded-none font-bold">
                  -{discountPercent}%
                </Badge>
              )}
              <Image
                src={(product.images?.[0]?.image as any).url}
                alt={product.title as string}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>

            {/* Gallery ảnh nhỏ */}
            <div className="grid grid-cols-4 gap-4">
              {product.images?.map((item: any, i: number) => (
                <div
                  key={i}
                  className="relative aspect-square border hover:border-black cursor-pointer bg-gray-50"
                >
                  <Image
                    src={item.image.url}
                    alt={`gallery-${i}`}
                    fill
                    className="object-cover p-2"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN SẢN PHẨM (Giao diện 5/12 cột) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="border-b pb-6 mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2 font-bold">
                {(product.brand as any)?.name || 'MF PARIS'}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight leading-tight">
                {product.title as string}
              </h1>
              <p className="text-sm text-gray-500 mt-2 italic">
                Mã sản phẩm: {product.sku || 'Đang cập nhật'}
              </p>
            </div>

            {/* Giá tiền */}
            <div className="flex items-baseline gap-4 mb-8">
              {product.price?.salePrice ? (
                <>
                  <span className="text-3xl font-black text-red-600">
                    {formatPrice(product.price.salePrice)}₫
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.price.basePrice)}₫
                  </span>
                </>
              ) : (
                <span className="text-3xl font-black text-black">
                  {formatPrice(product.price?.basePrice)}₫
                </span>
              )}
            </div>

            {/* Thông số sản phẩm */}
            <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-xl">
              <h4 className="font-bold uppercase text-xs tracking-widest border-b pb-2 mb-4">
                Thông tin chi tiết
              </h4>

              {/* Lặp qua tất cả các ô bạn đã tự thêm trong Admin */}
              {product.specifications && product.specifications.length > 0 ? (
                product.specifications.map((spec: any) => (
                  <div
                    key={spec.id}
                    className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                  >
                    <span className="text-gray-500 uppercase font-medium">{spec.label}</span>
                    <span className="font-bold text-gray-900">{spec.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Đang cập nhật thông số...</p>
              )}

              {/* Các trường cố định như Xuất xứ vẫn có thể giữ lại nếu muốn */}
              <div className="flex justify-between text-sm pt-2">
                <span className="text-gray-500 uppercase font-medium">Xuất xứ</span>
                <span className="font-bold">{product.origin || 'Pháp'}</span>
              </div>
            </div>

            {/* Khu vực mua hàng (Client Component) */}
            <ProductPurchase product={product} />

            {/* Cam kết shop */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  🛡️
                </div>
                Cam kết chính hãng
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  🚚
                </div>
                Giao hàng hỏa tốc
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div className="mt-12 border-t pt-8">
              <h3 className="font-black uppercase text-sm mb-4 tracking-widest">Mô tả sản phẩm</h3>
              <div
                className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description as string }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
