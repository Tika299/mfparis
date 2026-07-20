'use client'

import Link from 'next/link'
import { ChevronRight, Newspaper } from 'lucide-react'
import { OptimizedImage } from '@/components/OptimizedImage'

type RelatedPostsCarouselProps = {
  posts: any[]
  headingId?: string
}

export default function RelatedPostsCarousel({
  posts,
  headingId = 'related-posts-heading',
}: RelatedPostsCarouselProps) {
  if (!posts?.length) return null

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm md:p-7"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          id={headingId}
          className="flex items-center gap-3 text-[13px] font-black uppercase tracking-[0.18em] text-gray-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-primary">
            <Newspaper
              aria-hidden="true"
              size={16}
            />
          </span>
          Bài viết liên quan
        </h2>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.slice(0, 4).map((relatedPost: any) => (
          <li key={relatedPost.id}>
            <Link
              href={`/blog/${relatedPost.slug}`}
              className="group block h-full overflow-hidden rounded-2xl border border-gray-100 bg-white transition-colors hover:border-red-100 hover:bg-red-50/30"
            >
              <div className="relative aspect-video overflow-hidden bg-[#f4f0ed]">
                {relatedPost.thumbnail ? (
                  <OptimizedImage
                    media={relatedPost.thumbnail}
                    size="blogCard"
                    alt={relatedPost.title}
                    className="h-full w-full"
                    imageClassName="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f8f1ef] to-white">
                    <span className="font-heading text-sm font-bold text-primary/80">
                      MF Paris
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-primary">
                  {relatedPost.title}
                </h3>

                {relatedPost.createdAt ? (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    {new Date(relatedPost.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                ) : null}

                <span className="mt-3 inline-flex items-center text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  Đọc tiếp
                  <ChevronRight
                    aria-hidden="true"
                    size={13}
                    className="ml-1 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/blog"
        className="mt-5 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white"
      >
        Xem thêm
      </Link>
    </section>
  )
}
