import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/search-filters/SearchFilters'
import { SearchIcon, X } from 'lucide-react'
import Link from 'next/link'
export const metadata: Metadata = {
  title: 'Tìm kiếm',
  description: 'Tìm kiếm sản phẩm chính hãng tại MF Paris.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/search',
  },
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; min?: string; max?: string; sort?: string }>
}) {
  const { q = '', brand, min, max, sort = '-createdAt' } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // 1. Xây dựng Query
  const whereQueries: any = {
    and: [{ status: { equals: 'published' } }],
  }

  if (q) {
    whereQueries.and.push({
      or: [{ title: { contains: q } }, { 'brand.name': { contains: q } }],
    })
  }

  if (brand) {
    whereQueries.and.push({ 'brand.slug': { equals: brand } })
  }

  if (min) {
    whereQueries.and.push({ 'price.basePrice': { greater_than_equal: Number(min) } })
  }

  if (max) {
    whereQueries.and.push({ 'price.basePrice': { less_than_equal: Number(max) } })
  }

  // 2. Thực thi lấy dữ liệu
  const [productsRes, brandsRes] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 40,
      where: whereQueries,
      sort,
      depth: 1,
      select: {
        id: true,
        title: true,
        slug: true,
        sku: true,
        brand: true,
        price: true,
        images: true,
        averageRating: true,
        reviewCount: true,
        status: true,
        productType: true,
        variants: {
          id: true,
          name: true,
          sku: true,
          basePrice: true,
          salePrice: true,
          stock: true,
          isActive: true,
          isDefault: true,
          image: true,
        },
      },
    }),
    payload.find({ collection: 'brands', limit: 100 }),
  ])

  return (
    <div className="bg-[#FDFBF9] min-h-screen">
      <div className="container mx-auto px-4 md:px-10 py-12">
        <header className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-800/40 mb-2">
            Kết quả cho từ khóa
          </p>
          <h1 className="text-4xl md:text-5xl font-bold italic font-serif text-gray-900">"{q}"</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* SIDEBAR (3 CỘT) */}
          <aside className="lg:col-span-3">
            <SearchFilters brands={brandsRes.docs} />
          </aside>

          {/* MAIN GRID (9 CỘT) */}
          <main className="lg:col-span-9">
            {productsRes.docs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
                {productsRes.docs.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="py-40 text-center bg-white rounded-[3rem] border border-dashed border-gray-100 flex flex-col items-center">
                <SearchIcon size={40} className="text-gray-100 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">
                  Không tìm thấy sản phẩm nào
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}