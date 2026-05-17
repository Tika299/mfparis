import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'
import { SearchFilters } from '@/components/SearchFilters'

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; min?: string; max?: string; sort?: string }>
}) {
  const { brand, min, max, sort = '-createdAt' } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // 1. Xây dựng Query
  const whereQueries: any = {
    and: [{ status: { equals: 'published' } }],
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
      sort: sort, // Truyền trực tiếp sort từ URL vào Payload
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
  ])

  return (
    <div className="container mx-auto py-10 px-6 flex flex-col md:flex-row gap-10">
      {/* SIDEBAR FILTERS */}
      <aside className="lg:col-span-3">
        <SearchFilters brands={brandsRes.docs} />
      </aside>

      {/* PRODUCT GRID */}
      <main className="flex-grow">
        <h1 className="text-3xl font-serif italic mb-8">Tất cả sản phẩm</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
          {productsRes.docs.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
    </div>
  )
}
