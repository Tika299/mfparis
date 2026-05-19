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
      limit: 4,
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
              <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden mb-12 shadow-xl">
                <OptimizedImage media={post.thumbnail} size="large" alt={post.title} priority />
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
            <section className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 font-serif italic">
                Bài viết bạn có thể thích
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {relatedPosts.docs.map((rPost: any) => (
                  <Link href={`/blog/${rPost.slug}`} key={rPost.id} className="group flex flex-col">
                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 shadow-sm">
                      <OptimizedImage
                        media={rPost.thumbnail}
                        size="card"
                        alt={rPost.title}
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h4 className="font-bold text-sm leading-snug group-hover:text-[#E54D2E] transition-colors line-clamp-2">
                      {rPost.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: SIDEBAR (4 CỘT) */}
          <aside className="lg:col-span-4 space-y-10">
            {/* Search */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Tìm bài viết..."
                className="w-full h-12 bg-white border border-gray-100 rounded-2xl pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
              />
              <Search
                size={20}
                className="absolute right-4 top-3.5 text-gray-300 group-focus-within:text-orange-500"
              />
            </div>

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
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-50">
                      <OptimizedImage
                        media={fPost.thumbnail}
                        size="thumbnail"
                        alt={fPost.title}
                        className="group-hover:scale-110 transition-transform duration-500"
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

            {/* Newsletter */}
            <div className="bg-[#16423C] rounded-[2.5rem] p-10 text-center text-white space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10" />
              <h3 className="text-xl font-bold font-serif italic">
                Gia nhập cộng đồng <br /> MF Paris
              </h3>
              <p className="text-xs text-emerald-100/60 leading-relaxed uppercase tracking-widest font-medium">
                Nhận bí quyết làm đẹp <br /> và ưu đãi đặc quyền
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email của bạn..."
                  className="w-full h-12 rounded-xl bg-white/10 border border-white/10 text-sm px-4 focus:outline-none focus:bg-white/20 text-white placeholder:text-emerald-100/30"
                />
                <button className="w-full h-12 bg-white text-[#16423C] text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-orange-50 transition-all">
                  Đăng ký ngay
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
