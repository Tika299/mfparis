import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/SearchFilters'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utilities'

type PaginationItem = number | 'ellipsis'

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set<number>()

  pages.add(1)
  pages.add(totalPages)

  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 1 && i < totalPages) {
      pages.add(i)
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b)

  const result: PaginationItem[] = []

  sortedPages.forEach((page, index) => {
    const prevPage = sortedPages[index - 1]

    if (prevPage && page - prevPage > 1) {
      result.push('ellipsis')
    }

    result.push(page)
  })

  return result
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; min?: string; max?: string; sort?: string; category?: string; page?: string }>
}) {
  const { brand, min, max, sort = '-createdAt', category, page } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const LIMIT = 12

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
      limit: LIMIT,
      page: page ? Number(page) : 1,
      where: whereQueries,
      sort,
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
    payload.find({ collection: 'categories', limit: 100 }),
  ])

  const currentPage = productsRes.page ?? 1
  const fromItem = productsRes.totalDocs > 0 ? (currentPage - 1) * LIMIT + 1 : 0
  const toItem = Math.min(currentPage * LIMIT, productsRes.totalDocs)

  const totalPages = productsRes.totalPages ?? 1
  const paginationItems = getPaginationItems(currentPage, totalPages)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  // Hàm tạo URL cho phân trang (giữ nguyên các bộ lọc cũ)
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams()
    if (brand) params.set('brand', brand)
    if (category) params.set('category', category)
    if (min) params.set('min', min)
    if (max) params.set('max', max)
    if (sort) params.set('sort', sort)
    params.set('page', String(pageNumber))
    return `?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-20">
      {/* HEADER */}
      <div className="border-b border-gray-100 bg-white">
        <div className="container-ux py-8 md:py-12">
          <h1 className="text-2xl font-black uppercase tracking-wider md:text-4xl text-neutral-900">
            Tất cả sản phẩm
          </h1>
          <p className="mt-2 text-xs text-gray-400 md:text-sm">
            Hiển thị{' '}
            <span className="font-bold text-black">
              {fromItem} - {toItem}
            </span>{' '}
            trên tổng số{' '}
            <span className="font-bold text-black">{productsRes.totalDocs}</span> sản phẩm
          </p>
        </div>
      </div>

      <div className="container-ux mt-6 md:mt-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* SIDEBAR */}
          <aside className="hidden lg:block lg:w-[250px] lg:shrink-0">
            <div className="lc-card rounded-2xl p-5 bg-white shadow-sm">
              <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="sidebar" />
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0 flex-1">
            {/* Tablet Filter Ngang */}
            <div className="mb-6 hidden md:block lg:hidden">
              <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="horizontal" />
            </div>

            {productsRes.docs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {productsRes.docs.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* PHÂN TRANG (PAGINATION) */}
                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                  <nav
                    className="mt-14 flex flex-col items-center gap-4"
                    aria-label="Phân trang sản phẩm"
                  >
                    <p className="text-xs font-medium text-neutral-400">
                      Trang <span className="font-bold text-neutral-900">{currentPage}</span> / {totalPages}
                    </p>

                    <div className="flex max-w-full items-center justify-center gap-1.5 overflow-x-auto rounded-2xl bg-white/70 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur sm:gap-2">
                      {/* Previous */}
                      {hasPrev ? (
                        <Link
                          href={createPageUrl(currentPage - 1)}
                          aria-label="Trang trước"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-black hover:text-white sm:h-11 sm:w-11"
                        >
                          <ChevronLeft size={18} />
                        </Link>
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-neutral-300 sm:h-11 sm:w-11">
                          <ChevronLeft size={18} />
                        </span>
                      )}

                      {/* Page numbers */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {paginationItems.map((item, index) => {
                          if (item === 'ellipsis') {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                className="flex h-10 min-w-8 items-center justify-center text-sm font-bold text-neutral-300 sm:h-11"
                              >
                                ...
                              </span>
                            )
                          }

                          const isCurrent = item === currentPage

                          return (
                            <Link
                              key={item}
                              href={createPageUrl(item)}
                              aria-current={isCurrent ? 'page' : undefined}
                              className={cn(
                                'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-black transition-all sm:h-11 sm:min-w-11',
                                isCurrent
                                  ? 'bg-black text-white shadow-md shadow-black/15'
                                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-black'
                              )}
                            >
                              {item}
                            </Link>
                          )
                        })}
                      </div>

                      {/* Next */}
                      {hasNext ? (
                        <Link
                          href={createPageUrl(currentPage + 1)}
                          aria-label="Trang sau"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 transition hover:bg-black hover:text-white sm:h-11 sm:w-11"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-neutral-300 sm:h-11 sm:w-11">
                          <ChevronRight size={18} />
                        </span>
                      )}
                    </div>
                  </nav>
                )}
              </>
            ) : (
              <div className="lc-card rounded-2xl py-24 text-center bg-white">
                <p className="text-lg font-bold text-neutral-400">Không tìm thấy sản phẩm phù hợp</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MOBILE FAB */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:hidden">
        <SearchFilters brands={brandsRes.docs} categories={categoriesRes.docs} variant="mobile-fab" />
      </div>
    </div>
  )
}