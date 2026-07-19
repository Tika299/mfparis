import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import { JsonLd } from '@/components/JsonLd'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search, Sparkles, X } from 'lucide-react'
import '@/styles/blog.css'
import { buildCollectionPageSchemaGraph } from '@/lib/structured-data'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn'),
  title: 'Blog | MF Paris Chính Hãng',
  description: 'Cập nhật kiến thức nước hoa, mỹ phẩm, chăm sóc da và sức khỏe từ MF Paris.',
}

type PageProps = {
  searchParams?: Promise<{
    category?: string
    page?: string
    q?: string
  }>
}

function formatDate(date?: string) {
  if (!date) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function getCategoryNames(categories: any[] | undefined) {
  if (!Array.isArray(categories)) return ''

  return categories
    .map((cat) => {
      if (typeof cat === 'string') return ''
      return cat?.name || cat?.title || ''
    })
    .filter(Boolean)
    .join(', ')
}

export default async function BlogPage({ searchParams }: PageProps) {
  const payload = await getPayload({ config: configPromise })

  const resolvedSearchParams = await searchParams
  const currentPage = Math.max(Number(resolvedSearchParams?.page) || 1, 1)
  const q = resolvedSearchParams?.q?.trim() || ''
  const categorySlug =
    resolvedSearchParams?.category?.trim() || ''
  const limit = 9

  const selectedCategoryResult = categorySlug
    ? await payload.find({
      collection: 'post-categories',
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        slug: {
          equals: categorySlug,
        },
      },
    })
    : null
  const selectedCategory =
    selectedCategoryResult?.docs?.[0] ?? null
  const whereConditions: any[] = []

  if (q) {
    whereConditions.push({
      or: [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { slug: { contains: q } },
      ],
    })
  }

  if (categorySlug) {
    whereConditions.push(
      selectedCategory
        ? {
          categories: {
            in: [selectedCategory.id],
          },
        }
        : {
          id: {
            equals: -1,
          },
        },
    )
  }

  const whereQueries: any =
    whereConditions.length > 0
      ? {
        and: whereConditions,
      }
      : {}

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit,
    page: currentPage,
    sort: '-createdAt',
    where: whereQueries,
  })

  const totalPages = posts.totalPages || 1

  const getPageHref = (page: number) => {
    const params = new URLSearchParams()

    if (q) params.set('q', q)
    if (categorySlug) {
      params.set('category', categorySlug)
    }
    if (page > 1) params.set('page', String(page))

    const queryString = params.toString()
    return queryString ? `/blog?${queryString}` : '/blog'
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
  const blogUrl = getPageHref(currentPage)
  const blogPageTitle = selectedCategory
    ? `Blog: ${selectedCategory.title}`
    : q
      ? `Kết quả tìm kiếm blog: ${q}`
      : 'Blog MF Paris'
  const schemaGraph = buildCollectionPageSchemaGraph({
    page: {
      url: blogUrl,
      name: blogPageTitle,
      description:
        'Cập nhật kiến thức nước hoa, mỹ phẩm, chăm sóc da và sức khỏe từ MF Paris.',
      breadcrumb: [
        {
          name: 'Trang chủ',
          url: '/',
        },
        {
          name: 'Blog',
          url: blogUrl,
        },
      ],
      items: posts.docs.map((post: any) => ({
        name: post.title,
        url: `/blog/${post.slug}`,
      })),
    },
  })

  return (
    <main className="blog-page-bg min-h-screen">
      <JsonLd data={schemaGraph} />
      <section className="container-ux pt-10 pb-16 md:pt-14 md:pb-24">
        {/* HERO */}
        <header className="relative overflow-hidden rounded-[2rem] border border-red-100/70 bg-white px-5 py-12 text-center shadow-sm md:rounded-[2.5rem] md:px-10 md:py-16">
          <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-100/60 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              <Sparkles size={13} />
              Beauty Journal
            </div>

            <h1 className="font-heading text-4xl font-bold tracking-tight text-black md:text-6xl">
              Tạp chí MF Paris
            </h1>

            <div className="mx-auto mt-5 h-0.5 w-20 bg-primary" />

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-500 md:text-base">
              Cập nhật kiến thức nước hoa, mỹ phẩm, chăm sóc da và sức khỏe — được chọn lọc theo
              tinh thần chuẩn Pháp, dễ hiểu và ứng dụng được ngay.
            </p>
          </div>
        </header>

        <form
          action="/blog"
          className="mx-auto mt-8 flex max-w-xl items-center overflow-hidden rounded-full border border-gray-200 bg-white p-1.5 shadow-sm"
        >
          {categorySlug ? (
            <input
              type="hidden"
              name="category"
              value={categorySlug}
            />
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm bài viết về nước hoa, mỹ phẩm, chăm sóc da..."
            className="min-w-0 flex-1 bg-transparent px-5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />

          {q && (
            <Link
              href="/blog"
              className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-black"
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </Link>
          )}

          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
          >
            <Search size={15} />
            Tìm
          </button>
        </form>

        {q && (
          <div className="mt-8 rounded-3xl border border-red-100 bg-white px-5 py-4 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Kết quả tìm kiếm cho
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-primary">
              “{q}”
            </h2>
          </div>
        )}

        {/* LIST */}
        <section className="mt-10 md:mt-14">
          {posts.docs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-7">
              {posts.docs.map((post: any) => {
                const categoryNames = getCategoryNames(post.categories)
                const createdAt = formatDate(post.createdAt)

                return (
                  <Link
                    href={`/blog/${post.slug}`}
                    key={post.id}
                    className="blog-card group block overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl hover:shadow-red-50/70"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#f4f0ed]">
                      {post.thumbnail ? (
                        <OptimizedImage
                          media={post.thumbnail}
                          alt={post.title}
                          size="card"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f8f1ef] to-[#fff] px-6 text-center">
                          <span className="font-heading text-2xl font-bold text-primary/80">
                            MF Paris
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-70" />

                      {categoryNames && (
                        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary shadow-sm">
                          {categoryNames}
                        </div>
                      )}
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                        <span>MF Journal</span>
                        {createdAt && <span>{createdAt}</span>}
                      </div>

                      <h2 className="font-sans text-[22px] font-bold leading-tight text-black transition-colors duration-300 line-clamp-2 group-hover:text-primary">
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p className="mt-3 text-sm leading-6 text-gray-500 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}

                      <div className="mt-5 inline-flex items-center text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                        Đọc bài viết
                        <ChevronRight
                          size={15}
                          className="ml-1 transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-gray-100 bg-white p-12 text-center shadow-sm">
              <p className="font-heading text-2xl font-bold text-black">Chưa có bài viết nào.</p>
              <p className="mt-3 text-sm text-gray-500">
                Các bài viết mới sẽ được cập nhật trong thời gian tới.
              </p>
            </div>
          )}
        </section>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <nav className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={getPageHref(currentPage - 1)}
                className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white"
              >
                <ChevronLeft size={14} />
                Trước
              </Link>
            )}

            {currentPage > 3 && (
              <>
                <Link
                  href={getPageHref(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 transition-all hover:bg-black hover:text-white"
                >
                  1
                </Link>
                <span className="px-1 text-gray-400">...</span>
              </>
            )}

            {getPageNumbers().map((page) => (
              <Link
                key={page}
                href={getPageHref(page)}
                className={
                  page === currentPage
                    ? 'flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-lg shadow-red-100'
                    : 'flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 transition-all hover:bg-black hover:text-white'
                }
              >
                {page}
              </Link>
            ))}

            {currentPage < totalPages - 2 && (
              <>
                <span className="px-1 text-gray-400">...</span>
                <Link
                  href={getPageHref(totalPages)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 transition-all hover:bg-black hover:text-white"
                >
                  {totalPages}
                </Link>
              </>
            )}

            {currentPage < totalPages && (
              <Link
                href={getPageHref(currentPage + 1)}
                className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white"
              >
                Sau
                <ChevronRight size={14} />
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  )
}
