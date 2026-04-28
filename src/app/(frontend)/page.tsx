import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  // 1. Lấy sản phẩm mới nhất
  const products = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 8,
    where: { status: { equals: 'published' } },
  })

  // 2. Lấy danh sách thương hiệu nổi bật
  const brands = await payload.find({
    collection: 'brands',
    limit: 6,
    where: { isFeatured: { equals: true } },
  })

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* SECTION 1: HERO BANNER (Phong cách tối giản) */}
      <section className="relative h-[70vh] w-full bg-[#F5F5F5] flex items-center justify-center overflow-hidden">
        <div className="text-center z-10 px-4">
          <p className="uppercase tracking-[0.3em] text-sm mb-4">Pure & Authentic</p>
          <h1 className="text-4xl md:text-6xl font-light mb-8 uppercase tracking-tighter">
            Nước hoa & Mỹ phẩm <br /> <span className="font-bold">Pháp Chính Hãng</span>
          </h1>
          <Link
            href="/products"
            className="border border-black px-10 py-4 uppercase text-xs font-bold hover:bg-black hover:text-white transition-all"
          >
            Khám phá ngay
          </Link>
        </div>
      </section>

      {/* SECTION 2: FEATURED BRANDS */}
      <section className="container mx-auto px-4">
        <div className="flex justify-center gap-10 md:gap-20 grayscale opacity-50 overflow-x-auto pb-4">
          {brands.docs.map((brand: any) => (
            <span key={brand.id} className="text-xl font-bold uppercase whitespace-nowrap">
              {brand.name}
            </span>
          ))}
        </div>
      </section>

      {/* SECTION 3: NEW ARRIVALS (Sản phẩm mới) */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-12">
          <h2 className="text-2xl font-bold uppercase tracking-widest mb-3">Sản phẩm mới về</h2>
          <div className="h-[2px] w-12 bg-black"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12">
          {products.docs.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <Link
            href="/products"
            className="text-sm font-bold uppercase border-b-2 border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </section>
    </div>
  )
}
