import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata = {
  title: 'Blog | MF Paris Chính Hãng',
  description: 'Cập nhật kiến thức nước hoa, mỹ phẩm, chăm sóc da và sức khỏe từ MF Paris.',
}

type PageProps = {
  searchParams?: Promise<{
    page?: string
  }>
}

export default async function BlogPage({ searchParams }: PageProps) {
  const payload = await getPayload({ config: configPromise })

  const resolvedSearchParams = await searchParams
  const currentPage = Math.max(Number(resolvedSearchParams?.page) || 1, 1)
  const limit = 9

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit,
    page: currentPage,
    sort: '-createdAt',
  })

  const totalPages = posts.totalPages || 1

  const getPageHref = (page: number) => {
    return page <= 1 ? '/blog' : `/blog?page=${page}`
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
    <div className="bg-white min-h-screen">
      <div className="container mx-auto py-20 px-4">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center uppercase tracking-widest">
            Blog
          </h1>
          <div className="w-20 h-0.5 bg-red-700 mx-auto"></div>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Cập nhật kiến thức nước hoa, mỹ phẩm, chăm sóc da và sức khỏe từ MF Paris.
          </p>
        </header>

        {posts.docs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {posts.docs.map((post: any) => (
              <Link href={`/blog/${post.slug}`} key={post.id} className="group">
                <div className="relative aspect-video overflow-hidden bg-gray-100 mb-4 rounded-2xl">
                  <OptimizedImage
                    media={post.thumbnail}
                    alt={post.title}
                    size="card"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">
                  {post.categories?.map((cat: any) => cat.name).join(', ')}
                </p>

                <h2 className="text-xl font-bold group-hover:text-red-600 transition-colors line-clamp-2">
                  {post.title}
                </h2>

                <p className="text-gray-500 text-sm mt-2 line-clamp-3">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl p-10 text-center text-gray-500">
            Chưa có bài viết nào.
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
                    ? 'w-11 h-11 rounded-full bg-red-700 text-white flex items-center justify-center text-sm font-black shadow-lg'
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