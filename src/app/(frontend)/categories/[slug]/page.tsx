import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { notFound } from 'next/navigation'
import { SearchFilters } from '@/components/SearchFilters'

export default async function CategoryPage({ params, searchParams }: any) {
  const { slug } = await params
  const { brand, category, min, max, sort = '-createdAt' } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const categoryRes = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const currentCategory = categoryRes.docs[0]
  if (!currentCategory) notFound()

  const whereQueries: any = {
    and: [
      { status: { equals: 'published' } },
      { categories: { contains: currentCategory.id } }, // danh mục hiện tại từ slug
    ],
  }

  // brand là lọc cộng thêm trong danh mục
  if (brand) whereQueries.and.push({ 'brand.slug': { equals: brand } })

  // KHÔNG thêm filter category ở trang /categories/[slug]
  // if (category) whereQueries.and.push({ 'categories.slug': { equals: category } }) // bỏ dòng này
  if (min) whereQueries.and.push({ 'price.basePrice': { greater_than_equal: Number(min) } })
  if (max) whereQueries.and.push({ 'price.basePrice': { less_than_equal: Number(max) } })

  const [productsRes, brandsRes, categoriesRes] = await Promise.all([
    payload.find({
      collection: 'products',
      where: whereQueries,
      sort,
      limit: 40,
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
    payload.find({ collection: 'categories', limit: 100 }),
  ])

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl lg:text-4xl">
            {currentCategory.name}
          </h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            {productsRes.docs.length} sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        {/* Tablet: filter ngang */}
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {productsRes.docs.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="lc-card rounded-2xl py-16 text-center md:py-24">
                <p className="text-lg font-bold md:text-xl">Chưa có sản phẩm nào trong danh mục này.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile: nút bộ lọc nổi */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="mobile-fab" />
      </div>
    </div>
  )
}