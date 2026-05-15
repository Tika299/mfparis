import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import { Calendar, Tag, ChevronLeft, Share2 } from 'lucide-react'

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.0226 5.65685 21.1281 10.4375 21.8789V14.89H7.89844V12H10.4375V9.79785C10.4375 7.28906 11.9307 5.9375 14.2158 5.9375C15.3057 5.9375 16.4453 6.13281 16.4453 6.13281V8.60547H15.0488C13.6738 8.60547 13.3125 9.4209 13.3125 10.2578V12H16.3203L15.8203 14.89H13.3125V21.8789C18.0931 21.1281 22 17.0226 22 12Z"
        fill="currentColor"
      />
    </svg>
  )
}

// 1. SEO Động cho bài viết
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
  })

  const post = result.docs[0]
  if (!post) return { title: 'Không tìm thấy bài viết' }

  return {
    title: `${post.title} | Blog làm đẹp MF Paris`,
    description: post.seo?.metaDescription || post.excerpt,
    openGraph: {
      images: [(post.thumbnail as any)?.url],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  // Lấy nội dung bài viết
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const post: any = result.docs[0]
  if (!post) notFound()

  // Lấy bài viết liên quan (cùng danh mục)
  const relatedPosts = await payload.find({
    collection: 'posts',
    limit: 3,
    where: {
      and: [
        { slug: { not_equals: slug } },
        { 'categories.id': { in: post.categories?.map((c: any) => c.id) } },
      ],
    },
  })

  return (
    <article className="bg-[#FDFBF9] min-h-screen pb-20">
      {/* 1. HEADER BÀI VIẾT */}
      <header className="container mx-auto px-4 pt-12 md:pt-20 max-w-4xl text-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors mb-8"
        >
          <ChevronLeft size={14} /> Quay lại Blog
        </Link>

        <div className="flex justify-center gap-3 mb-6">
          {post.categories?.map((cat: any) => (
            <span
              key={cat.id}
              className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full"
            >
              {cat.name}
            </span>
          ))}
        </div>

        <h1 className="text-4xl md:text-6xl font-bold italic font-serif leading-tight text-gray-900 mb-8 tracking-tighter">
          {post.title}
        </h1>

        <div className="flex items-center justify-center gap-6 text-xs text-gray-400 font-medium pb-12 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </div>
          <div className="flex items-center gap-2 uppercase tracking-widest">
            MF Paris Editorial
          </div>
        </div>
      </header>

      {/* 2. ẢNH ĐẠI DIỆN LỚN (Editorial Look) */}
      <div className="container mx-auto px-4 md:px-0 max-w-5xl my-12">
        <div className="relative aspect-video md:aspect-[21/9] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
          <OptimizedImage
            media={post.thumbnail}
            size="large"
            alt={post.title}
            priority
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 3. NỘI DUNG CHÍNH */}
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Lời dẫn (Excerpt) */}
        <p className="text-xl md:text-2xl text-gray-600 font-serif italic leading-relaxed mb-12 border-l-4 border-amber-200 pl-8">
          {post.excerpt}
        </p>

        {/* Thân bài (Render HTML từ WordPress) */}
        <div
          className="prose prose-neutral prose-lg max-w-none 
            text-gray-700 leading-[1.8]
            prose-headings:font-serif prose-headings:italic prose-headings:text-gray-900
            prose-p:mb-8
            prose-img:rounded-3xl prose-img:shadow-xl prose-img:my-12
            prose-strong:text-black prose-strong:font-bold
            prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* TAGS & SHARE */}
        <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-nowrap">
              Chia sẻ bài viết:
            </span>
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                <FacebookIcon size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BÀI VIẾT LIÊN QUAN */}
      <section className="container mx-auto px-4 mt-32 max-w-6xl">
        <h2 className="text-3xl font-bold italic font-serif text-center mb-16">
          Bạn có thể quan tâm
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {relatedPosts.docs.map((item: any) => (
            <Link href={`/blog/${item.slug}`} key={item.id} className="group">
              <div className="relative aspect-square rounded-3xl overflow-hidden mb-6 bg-white shadow-sm border border-gray-50">
                <OptimizedImage
                  media={item.thumbnail}
                  size="card"
                  alt={item.title}
                  className="group-hover:scale-110 transition duration-700"
                />
              </div>
              <h3 className="font-bold text-lg leading-tight group-hover:text-amber-700 transition-colors line-clamp-2">
                {item.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    </article>
  )
}
