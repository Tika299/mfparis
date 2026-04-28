import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // BẮT BUỘC phải có dòng await này ở Next.js 15
  const { slug } = await params

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    where: {
      slug: {
        equals: slug,
      },
    },
    depth: 2,
  })

  const product = result.docs[0]

  // Nếu không tìm thấy trong DB, Next.js sẽ hiện trang 404
  if (!product) {
    return notFound()
  }
  return (
    <div className="container mx-auto px-4 py-10 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* BÊN TRÁI: GALLERY ẢNH */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[3/4] w-full bg-gray-50 overflow-hidden">
            <Image
              src={(product.images?.[0]?.image as any).url}
              alt={product.title as string}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images?.map((img: any, i: number) => (
              <div
                key={i}
                className="relative aspect-square bg-gray-100 cursor-pointer border hover:border-black transition-all"
              >
                <Image src={img.image.url} alt="thumbnail" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* BÊN PHẢI: THÔNG TIN MUA HÀNG */}
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">
            {(product.brand as any).name}
          </p>
          <h1 className="text-3xl font-bold mb-4 uppercase">{product.title as string}</h1>

          <div className="flex items-center gap-4 mb-8">
            <span className="text-2xl font-bold text-red-600">
              {product.price?.salePrice?.toLocaleString()}₫
            </span>
            {product.price?.basePrice && (
              <span className="text-gray-400 line-through">
                {product.price.basePrice.toLocaleString()}₫
              </span>
            )}
          </div>

          <div className="border-t border-b py-6 mb-8 flex flex-col gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dung tích:</span>
              <span className="font-bold">{(product.attributes as any).volume}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Xuất xứ:</span>
              <span className="font-bold">{(product.attributes as any).origin}</span>
            </div>
          </div>

          <Button className="w-full h-14 bg-black text-white hover:bg-gray-800 uppercase font-bold tracking-widest mb-4">
            Thêm vào giỏ hàng
          </Button>

          <div className="mt-10">
            <h3 className="font-bold uppercase text-sm mb-4 border-b pb-2">Mô tả sản phẩm</h3>
            <div className="text-gray-600 leading-relaxed text-sm">
              {/* Render RichText từ Payload ở đây */}
              {product.shortDescription as string}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
