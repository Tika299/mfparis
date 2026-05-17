import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { notFound } from 'next/navigation'
import { SearchFilters } from '@/components/SearchFilters'

export default async function CategoryPage({ params, searchParams }: any) {
  const { slug } = await params
  const { brand, min, max, sort } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // 1. Tìm thông tin danh mục hiện tại
  const categoryRes = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
  })

  const currentCategory = categoryRes.docs[0]
  if (!currentCategory) notFound()

  const whereQueries: any = {
    and: [
      { status: { equals: 'published' } },
      { categories: { contains: currentCategory.id } }, // Chỉ lấy sản phẩm trong danh mục này
    ],
  }

  // 2. Lấy các sản phẩm thuộc danh mục này
  if (brand) whereQueries.and.push({ 'brand.slug': { equals: brand } })
  if (min) whereQueries.and.push({ 'price.basePrice': { greater_than_equal: Number(min) } })
  if (max) whereQueries.and.push({ 'price.basePrice': { less_than_equal: Number(max) } })

  const [productsRes, brandsRes] = await Promise.all([
    payload.find({ collection: 'products', where: whereQueries, sort: sort || '-createdAt' }),
    payload.find({ collection: 'brands' }),
  ])

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-10">
        {/* SIDEBAR: BỘ LỌC (FILTER) */}
        <aside className="lg:col-span-3">
          <SearchFilters brands={brandsRes.docs} />
        </aside>

        {/* DANH SÁCH SẢN PHẨM */}
        <main className="flex-grow">
          <header className="mb-10">
            <h1 className="text-3xl font-bold uppercase tracking-widest">{currentCategory.name}</h1>
            <p className="text-gray-400 text-sm mt-2">{productsRes.docs.length} Sản phẩm</p>
          </header>

          {productsRes.docs.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-12">
              {productsRes.docs.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border-2 border-dashed">
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
