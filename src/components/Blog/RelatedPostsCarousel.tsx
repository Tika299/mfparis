'use client'

import Link from 'next/link'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type RelatedPostsCarouselProps = {
    posts: any[]
}

export default function RelatedPostsCarousel({ posts }: RelatedPostsCarouselProps) {
    const plugin = useRef(
        Autoplay({
            delay: 3500,
            stopOnInteraction: true,
            stopOnMouseEnter: true,
        }),
    )

    if (!posts?.length) return null

    return (
        <section className="mt-16">
            <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                        Related Journal
                    </span>
                    <h3 className="font-heading text-2xl font-bold text-gray-900 md:text-3xl">
                        Bài viết bạn có thể thích
                    </h3>
                </div>

                <Link
                    href="/blog"
                    className="hidden rounded-full border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white md:inline-flex"
                >
                    Xem thêm
                </Link>
            </div>

            <Carousel
                plugins={[plugin.current]}
                opts={{
                    align: 'start',
                    loop: true,
                }}
                className="relative w-full"
            >
                <CarouselContent className="-ml-5 pb-4">
                    {posts.map((rPost: any) => (
                        <CarouselItem
                            key={rPost.id}
                            className="pl-5 basis-[86%] sm:basis-[58%] md:basis-1/2 xl:basis-1/2"
                        >
                            <Link
                                href={`/blog/${rPost.slug}`}
                                className="group block h-full overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl hover:shadow-red-50/70"
                            >
                                <div className="relative aspect-video overflow-hidden bg-[#f4f0ed]">
                                    {rPost.thumbnail ? (
                                        <OptimizedImage
                                            media={rPost.thumbnail}
                                            size="card"
                                            alt={rPost.title}
                                            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f8f1ef] to-white">
                                            <span className="font-heading text-xl font-bold text-primary/80">
                                                MF Paris
                                            </span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 opacity-80" />
                                </div>

                                <div className="p-5">
                                    <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        <span>MF Journal</span>
                                        {rPost.createdAt && (
                                            <span>{new Date(rPost.createdAt).toLocaleDateString('vi-VN')}</span>
                                        )}
                                    </div>

                                    <h4 className="font-heading text-xl font-bold leading-tight text-gray-900 line-clamp-2 transition-colors group-hover:text-primary">
                                        {rPost.title}
                                    </h4>

                                    {rPost.excerpt && (
                                        <p className="mt-3 text-sm leading-6 text-gray-500 line-clamp-2">
                                            {rPost.excerpt}
                                        </p>
                                    )}

                                    <div className="mt-5 inline-flex items-center text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                                        Đọc tiếp
                                        <ChevronRight
                                            size={14}
                                            className="ml-1 transition-transform duration-300 group-hover:translate-x-1"
                                        />
                                    </div>
                                </div>
                            </Link>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <CarouselPrevious className="-left-4 top-1/2 hidden h-11 w-11 border-none bg-white text-gray-700 shadow-xl hover:bg-primary hover:text-white md:flex" />
                <CarouselNext className="-right-4 top-1/2 hidden h-11 w-11 border-none bg-white text-gray-700 shadow-xl hover:bg-primary hover:text-white md:flex" />
            </Carousel>
        </section>
    )
}