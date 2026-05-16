import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'

export default async function BlogPage() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
  })

  return (
    <div className="container mx-auto py-20 px-4">
      <h1 className="text-4xl font-bold text-center mb-16 uppercase tracking-widest">
        Blog làm đẹp
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {posts.docs.map((post: any) => (
          <Link href={`/blog/${post.slug}`} key={post.id} className="group">
            <div className="relative aspect-video overflow-hidden bg-gray-100 mb-4">
              <OptimizedImage
                media={post.thumbnail}
                alt={post.title}
                size="card"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
              {post.categories?.map((cat: any) => cat.name).join(', ')}
            </p>
            <h2 className="text-xl font-bold group-hover:text-red-600 transition-colors line-clamp-2">
              {post.title}
            </h2>
            <p className="text-gray-500 text-sm mt-2 line-clamp-3">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
