import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const post: any = result.docs[0]
  if (!post) notFound()

  // Lấy danh sách bài viết nổi bật cho Sidebar
  const featuredPosts = await payload.find({
    collection: 'posts',
    limit: 5,
    sort: '-createdAt',
  })

  console.log(post)
  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* 1. BREADCRUMB */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <Link href="/">Trang chủ</Link> <ChevronRight size={12} />
          <Link href="/blog">Blog</Link> <ChevronRight size={12} />
          <span className="text-gray-900 truncate max-w-[200px]">{post.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* CỘT TRÁI: NỘI DUNG BÀI VIẾT (8 CỘT) */}
          <article className="lg:col-span-8">
            <header className="mb-8">
              <span className="text-orange-600 font-bold text-xs uppercase tracking-widest mb-3 block">
                {post.categories?.[0]?.name || 'MẸO HAY'}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-[13px] text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden relative">
                    <User size={14} className="absolute inset-0 m-auto" />
                  </div>
                  <span className="font-semibold text-gray-900">MF Paris Team</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} /> 5 phút đọc
                </div>
              </div>
            </header>

            {/* ẢNH ĐẠI DIỆN 16:9 */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-10 shadow-sm border border-gray-50">
              <OptimizedImage media={post.thumbnail} size="large" alt={post.title} priority />
            </div>
            {/* NỘI DUNG CHI TIẾT */}
            <div
              className="prose prose-neutral max-w-none 
                prose-p:text-gray-700 prose-p:leading-[1.8] prose-p:text-[16px]
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-img:rounded-2xl prose-img:my-10
                prose-strong:text-black"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* TAGS & SHARE */}
            <div className="mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-2">
                {['skincare', 'làm đẹp', 'nước hoa'].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400">Chia sẻ:</span>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded-full border flex items-center justify-center hover:text-blue-600 transition-all">
                    <Share2 size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-full border flex items-center justify-center hover:text-sky-500 transition-all">
                    <X size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-full border flex items-center justify-center hover:text-orange-600 transition-all">
                    <LinkIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* CỘT PHẢI: SIDEBAR (4 CỘT) */}
          <aside className="lg:col-span-4 space-y-12">
            {/* Ô tìm kiếm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm bài viết..."
                className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl pl-4 pr-10 text-sm focus:outline-none focus:border-orange-500 transition-all"
              />
              <Search size={18} className="absolute right-3 top-3 text-gray-400" />
            </div>

            {/* Bài viết nổi bật */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                Bài viết nổi bật
              </h3>
              <div className="space-y-6">
                {featuredPosts.docs.map((fPost: any) => (
                  <Link href={`/blog/${fPost.slug}`} key={fPost.id} className="flex gap-4 group">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100">
                      <OptimizedImage
                        media={fPost.thumbnail}
                        size="thumbnail"
                        alt={fPost.title}
                        className="group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
                        {fPost.title}
                      </h4>
                      <span className="text-[11px] text-gray-400 mt-2 font-medium">
                        {new Date(fPost.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Banner Đăng ký nhận tin (Newsletter) */}
            <div className="bg-orange-50 rounded-[2rem] p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Calendar className="text-orange-500" size={24} />
              </div>
              <h3 className="font-bold text-gray-900">Đăng ký nhận bản tin</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nhận những thông tin mới nhất về sản phẩm và ưu đãi từ MF Paris.
              </p>
              <input
                type="email"
                placeholder="Email của bạn"
                className="w-full h-10 rounded-lg border-none text-xs px-4 focus:ring-2 focus:ring-orange-500"
              />
              <button className="w-full h-10 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-all">
                Đăng ký ngay
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
