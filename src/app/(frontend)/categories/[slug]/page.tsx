import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { notFound } from 'next/navigation'
import { SearchFilters } from '@/components/SearchFilters'
import Link from 'next/link'

export default async function CategoryPage({ params, searchParams }: any) {
  const { slug } = await params
  const { brand, category, min, max, sort = '-createdAt', page = '1' } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const currentPage = Math.max(1, Number(page) || 1)
  const limit = 20

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
      limit,
      page: currentPage,
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
    payload.find({ collection: 'categories', limit: 100 }),
  ])

  const hasDescription =
    typeof currentCategory.description === 'string' &&
    currentCategory.description.trim().length > 0

  const buildPageHref = (pageNumber: number) => {
    const query = new URLSearchParams()

    if (brand) query.set('brand', String(brand))
    if (min) query.set('min', String(min))
    if (max) query.set('max', String(max))
    if (sort) query.set('sort', String(sort))
    if (pageNumber > 1) query.set('page', String(pageNumber))

    const queryString = query.toString()

    return queryString
      ? `/categories/${slug}?${queryString}`
      : `/categories/${slug}`
  }

  const totalPages = productsRes.totalPages || 1
  const totalDocs = productsRes.totalDocs || 0

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - currentPage) <= 2,
  )

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl lg:text-4xl">
            {currentCategory.name}
          </h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            {totalDocs} sản phẩm
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
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {productsRes.docs.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
                    {productsRes.hasPrevPage && (
                      <Link
                        href={buildPageHref(currentPage - 1)}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        Trước
                      </Link>
                    )}

                    {visiblePages.map((pageNumber, index) => {
                      const prevPage = visiblePages[index - 1]
                      const showDots = prevPage && pageNumber - prevPage > 1

                      return (
                        <div key={pageNumber} className="flex items-center gap-2">
                          {showDots && (
                            <span className="px-1 text-sm font-bold text-gray-400">
                              ...
                            </span>
                          )}

                          <Link
                            href={buildPageHref(pageNumber)}
                            className={
                              pageNumber === currentPage
                                ? 'rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm'
                                : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50'
                            }
                          >
                            {pageNumber}
                          </Link>
                        </div>
                      )
                    })}

                    {productsRes.hasNextPage && (
                      <Link
                        href={buildPageHref(currentPage + 1)}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                      >
                        Sau
                      </Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="lc-card rounded-2xl py-16 text-center md:py-24">
                <p className="text-lg font-bold md:text-xl">
                  Chưa có sản phẩm nào trong danh mục này.
                </p>
              </div>
            )}
            {hasDescription && (
              <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                <h2 className="mb-4 text-xl font-bold md:text-2xl">
                  Giới thiệu về {currentCategory.name}
                </h2>

                <div
                  className="category-description prose prose-sm max-w-none text-gray-700 md:prose-base prose-a:text-primary prose-a:font-semibold"
                  dangerouslySetInnerHTML={{ __html: currentCategory.description || '' }}
                />
              </section>
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