import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import {
  Calendar,
  User,
  Clock,
  Search,
  Share2,
  X,
  Link as LinkIcon,
  ChevronRight,
} from 'lucide-react'
import RichText from '@/components/RichText'
import { ExpandableContent } from '@/components/ExpandableContent'
import RelatedPostsCarousel from '@/components/Blog/RelatedPostsCarousel'

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  // 1. Lấy dữ liệu bài viết hiện tại
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const post: any = result.docs[0]
  if (!post) notFound()

  // Lấy ID danh mục để tìm bài liên quan
  const categoryIds = post.categories?.map((cat: any) => cat.id) || []

  // 2. TRUY VẤN SONG SONG: Bài viết mới nhất (Sidebar) và Bài viết liên quan (Bottom)
  const [featuredPosts, relatedPosts] = await Promise.all([
    // Lấy 5 bài mới nhất (Sidebar) - Loại trừ bài hiện tại
    payload.find({
      collection: 'posts',
      limit: 5,
      sort: '-createdAt',
      where: {
        slug: { not_equals: slug },
      },
    }),
    // Lấy 4 bài cùng danh mục (Bottom) - Loại trừ bài hiện tại
    payload.find({
      collection: 'posts',
      limit: 8,
      depth: 1,
      sort: '-createdAt',
      where: {
        and: [{ slug: { not_equals: slug } }, { categories: { in: categoryIds } }],
      },
    }),
  ])

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20 font-sans">
      <div className="max-w-[1240px] mx-auto px-4 py-6">
        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-10">
          <Link href="/" className="hover:text-black">
            Trang chủ
          </Link>
          <ChevronRight size={10} />
          <Link href="/blog" className="hover:text-black">
            Blog
          </Link>
          <ChevronRight size={10} />
          <span className="text-gray-900 truncate max-w-[300px]">{post.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* CỘT TRÁI: NỘI DUNG CHI TIẾT (8 CỘT) */}
          <div className="lg:col-span-8">
            <article className="bg-white rounded-[2.5rem] p-6 md:p-12 shadow-sm border border-gray-100">
              <header className="mb-10">
                <div className="flex gap-2 mb-4">
                  {post.categories?.map((cat: any) => (
                    <span
                      key={cat.id}
                      className="text-[#E54D2E] font-black text-[10px] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full"
                    >
                      {cat.title}
                    </span>
                  ))}
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8 leading-[1.1] tracking-tighter">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-[12px] text-gray-400 font-medium">
                  <div className="flex items-center gap-2 text-gray-900">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <User size={16} />
                    </div>
                    <span>MF Paris Editorial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} /> 4 phút đọc
                  </div>
                </div>
              </header>

              {/* ẢNH ĐẠI DIỆN 16:9 */}
              <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] bg-[#f4f0ed] mb-12 shadow-xl">
                <OptimizedImage
                  media={post.thumbnail}
                  size="large"
                  alt={post.title}
                  priority
                  className="h-full w-full object-cover object-center"
                />
              </div>

              {/* NỘI DUNG CHI TIẾT */}
              <div className="max-w-none">
                <ExpandableContent maxHeight={500}>
                  {' '}
                  {/* Bạn có thể tùy chỉnh chiều cao tại đây */}
                  <RichText content={post.content} />
                </ExpandableContent>
              </div>

              {/* TAGS & SHARE */}
              <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-wrap gap-2" style={{ alignItems: 'center' }}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">
                    Tags:
                  </span>
                  {post.categories?.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="lowercase px-4 py-1.5 bg-gray-50 text-gray-500 text-[11px] font-bold rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      #{tag.title}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all">
                      <Share2 size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                      <X size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all">
                      <LinkIcon size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* PHẦN BÀI VIẾT LIÊN QUAN (NẰM DƯỚI BÀI VIẾT CHÍNH) */}
            {relatedPosts.docs.length > 0 && (
              <RelatedPostsCarousel posts={relatedPosts.docs} />
            )}
          </div>

          {/* CỘT PHẢI: SIDEBAR (4 CỘT) */}
          <aside className="lg:col-span-4 space-y-10">
            {/* Search */}
            <form action="/blog" className="relative group flex items-center">
              <input
                name="q"
                type="text"
                placeholder="Tìm bài viết..."
                className="h-12 w-full rounded-2xl border border-gray-100 bg-white pl-5 pr-12 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <button
                type="submit"
                className="absolute right-3 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-primary"
                aria-label="Tìm bài viết"
              >
                <Search size={18} />
              </button>
            </form>

            {/* BÀI VIẾT MỚI NHẤT (NỔI BẬT) */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-1 h-5 bg-[#E54D2E]"></span> Bài mới đăng
              </h3>
              <div className="space-y-8">
                {featuredPosts.docs.map((fPost: any) => (
                  <Link
                    href={`/blog/${fPost.slug}`}
                    key={fPost.id}
                    className="flex gap-4 group items-center"
                  >
                    <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-50 bg-[#f4f0ed]">
                      <OptimizedImage
                        media={fPost.thumbnail}
                        size="thumbnail"
                        alt={fPost.title}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-[13px] font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-[#E54D2E] transition-colors">
                        {fPost.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {new Date(fPost.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
