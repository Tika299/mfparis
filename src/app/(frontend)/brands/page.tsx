import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PageProps = {
  searchParams?: Promise<{
    page?: string
  }>
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://maraisdefrance.vn'),
  title: 'Thương hiệu | MF Paris Chính Hãng',
  description: 'Khám phá các thương hiệu nước hoa, mỹ phẩm và thực phẩm chức năng chính hãng tại MF Paris.',
}

export default async function AllBrandsPage({ searchParams }: PageProps) {
  const payload = await getPayload({ config: configPromise })

  const resolvedSearchParams = await searchParams
  const currentPage = Math.max(Number(resolvedSearchParams?.page) || 1, 1)
  const limit = 24

  const brandsRes = await payload.find({
    collection: 'brands',
    limit,
    page: currentPage,
    sort: 'name',
    depth: 1,
  })

  const totalPages = brandsRes.totalPages || 1

  const getPageHref = (page: number) => {
    return page <= 1 ? '/brands' : `/brands?page=${page}`
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-bold font-sans">Thương hiệu</h1>
          <div className="w-20 h-0.5 bg-amber-200 mx-auto"></div>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Tổng hợp các thương hiệu nước hoa, mỹ phẩm và chăm sóc sức khỏe đang có tại MF Paris.
          </p>
        </header>

        {brandsRes.docs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {brandsRes.docs.map((brand: any) => (
              <Link
                href={`/brands/${brand.slug}`}
                key={brand.id}
                className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col items-center justify-center aspect-square"
              >
                <div className="relative w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500">
                  {brand.logo ? (
                    <OptimizedImage
                      media={brand.logo}
                      size="card"
                      alt={brand.name}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-xl tracking-tighter text-gray-300 text-center">
                      {brand.name}
                    </div>
                  )}
                </div>

                <h3 className="mt-4 text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-amber-700 transition-colors text-center">
                  {brand.name}
                </h3>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-10 text-center text-gray-500">
            Chưa có thương hiệu nào.
          </div>
        )}

        {/* PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={getPageHref(currentPage - 1)}
                className="h-11 px-4 rounded-full bg-white border border-gray-200 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-black hover:text-white transition-all"
              >
                <ChevronLeft size={14} />
                Trước
              </Link>
            )}

            {currentPage > 3 && (
              <>
                <Link
                  href={getPageHref(1)}
                  className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all"
                >
                  1
                </Link>
                <span className="px-2 text-gray-400">...</span>
              </>
            )}

            {getPageNumbers().map((page) => (
              <Link
                key={page}
                href={getPageHref(page)}
                className={
                  page === currentPage
                    ? 'w-11 h-11 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-black shadow-lg'
                    : 'w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all'
                }
              >
                {page}
              </Link>
            ))}

            {currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-gray-400">...</span>
                <Link
                  href={getPageHref(totalPages)}
                  className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all"
                >
                  {totalPages}
                </Link>
              </>
            )}

            {currentPage < totalPages && (
              <Link
                href={getPageHref(currentPage + 1)}
                className="h-11 px-4 rounded-full bg-white border border-gray-200 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-black hover:text-white transition-all"
              >
                Sau
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}