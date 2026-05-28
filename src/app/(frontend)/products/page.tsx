import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/SearchFilters'

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; min?: string; max?: string; sort?: string; category?: string }>
}) {
  const { brand, min, max, sort = '-createdAt', category } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const whereQueries: any = {
    and: [{ status: { equals: 'published' } }],
  }

  if (brand) whereQueries.and.push({ 'brand.slug': { equals: brand } })
  if (category) whereQueries.and.push({ 'categories.slug': { equals: category } })

  if (min) whereQueries.and.push({ 'price.basePrice': { greater_than_equal: Number(min) } })
  if (max) whereQueries.and.push({ 'price.basePrice': { less_than_equal: Number(max) } })

  const [productsRes, brandsRes, categoriesRes] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 40,
      where: whereQueries,
      sort,
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
    payload.find({ collection: 'categories', limit: 100 }),
  ])

  return (
    <div className="min-h-screen pb-16">
      <div className="border-b bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <h1 className="heading-product">Tất cả sản phẩm</h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            Tìm thấy <span className="font-bold text-black">{productsRes.totalDocs}</span> sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        {/* Tablet */}
        <div className="mb-5 hidden md:block lg:hidden">
          <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="horizontal" />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:w-[250px] lg:shrink-0">
            <div className="lc-card rounded-2xl p-5">
              <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="sidebar" />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {productsRes.docs.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                {productsRes.docs.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="lc-card rounded-2xl py-16 text-center">
                <p className="text-lg font-bold">Không tìm thấy sản phẩm</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="mobile-fab" />
      </div>
    </div>
  )
}