import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { notFound } from 'next/navigation'
import { SearchFilters } from '@/components/SearchFilters'
import { RichText } from '@/components/RichText'

function hasRichTextContent(content: any) {
  return (
    content &&
    typeof content === 'object' &&
    Array.isArray(content.root?.children) &&
    content.root.children.length > 0
  )
}

export default async function BrandProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    min?: string
    max?: string
    sort?: string
    category?: string
    brand?: string
  }>
}) {
  const { slug } = await params
  const { min, max, sort = '-createdAt', category } = await searchParams

  const payload = await getPayload({ config: configPromise })

  const brandRes = await payload.find({
    collection: 'brands',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })

  const currentBrand: any = brandRes.docs[0]
  if (!currentBrand) notFound()

  const whereQueries: any = {
    and: [
      { status: { equals: 'published' } },
      { brand: { equals: currentBrand.id } },
    ],
  }

  if (category) {
    whereQueries.and.push({ 'categories.slug': { equals: category } })
  }

  if (min) {
    whereQueries.and.push({
      'price.basePrice': { greater_than_equal: Number(min) },
    })
  }

  if (max) {
    whereQueries.and.push({
      'price.basePrice': { less_than_equal: Number(max) },
    })
  }

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

  const hasDescription = hasRichTextContent(currentBrand.description)

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-5 md:py-7 lg:py-9">
          <h1 className="text-2xl font-black uppercase tracking-wide md:text-3xl lg:text-4xl">
            {currentBrand.name}
          </h1>

          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            {productsRes.docs.length} sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-4 md:mt-6 lg:mt-8">
        {/* Tablet: filter ngang */}
        <div className="sticky top-20 z-40 mb-5 hidden md:block lg:hidden">
          <SearchFilters
            brands={brandsRes.docs}
            categories={categoriesRes.docs}
            variant="horizontal"
            sticky={false}
          />
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:w-[250px] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:pr-1">
            <div className="lc-card rounded-2xl p-5">
              <SearchFilters
                brands={brandsRes.docs}
                categories={categoriesRes.docs}
                variant="sidebar"
                sticky={false}
              />
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
                <p className="text-lg font-bold md:text-xl">
                  Chưa có sản phẩm nào trong thương hiệu này.
                </p>
              </div>
            )}

            {hasDescription && currentBrand.description && (
              <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm md:mt-12 md:p-8">
                <h2 className="mb-4 text-xl font-bold md:text-2xl">
                  Giới thiệu về {currentBrand.name}
                </h2>

                <div className="brand-description prose prose-sm max-w-none text-gray-700 md:prose-base prose-a:font-semibold prose-a:text-primary">
                  <RichText
                    data={currentBrand.description}
                    showToc
                    expandable
                    maxHeight={1200}
                  />
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Mobile: nút bộ lọc nổi */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters
          brands={brandsRes.docs}
          categories={categoriesRes.docs}
          variant="mobile-fab"
        />
      </div>
    </div>
  )
}