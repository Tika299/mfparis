'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import type { Post } from '@/payload-types'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type BeautyJournalSectionProps =
    Readonly<{
        posts: Post[]
        viewAllHref?: string
    }>

type PostDate = {
    label: string
    dateTime?: string
}

function getPostCategory(
    post: Post,
): string {
    const categories = (
        post as unknown as {
            categories?: unknown
        }
    ).categories

    if (!Array.isArray(categories)) {
        return 'Bí quyết làm đẹp'
    }

    const firstCategory =
        categories[0]

    if (
        !firstCategory ||
        typeof firstCategory !== 'object'
    ) {
        return 'Bí quyết làm đẹp'
    }

    const category =
        firstCategory as Record<
            string,
            unknown
        >

    const categoryName =
        category.name ??
        category.title ??
        category.label

    if (
        typeof categoryName !== 'string' ||
        !categoryName.trim()
    ) {
        return 'Bí quyết làm đẹp'
    }

    return categoryName.trim()
}

function getPostDate(
    post: Post,
): PostDate {
    const dateValue = post.createdAt

    if (!dateValue) {
        return {
            label: '',
        }
    }

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
        return {
            label: '',
        }
    }

    return {
        label: date.toLocaleDateString(
            'vi-VN',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            },
        ),

        dateTime: date.toISOString(),
    }
}

function getPostExcerpt(
    post: Post,
): string {
    if (
        typeof post.excerpt !== 'string'
    ) {
        return ''
    }

    return post.excerpt.trim()
}

export function BeautyJournalSection({
    posts,
    viewAllHref = '/blog',
}: BeautyJournalSectionProps) {
    if (!posts?.length) {
        return null
    }

    const showNavigation =
        posts.length > 3

    return (
        <section className="container-ux mt-8 md:mt-10">
            <div className="group/journal relative overflow-visible rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-5 pt-5 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 sm:pb-6 sm:pt-6 md:rounded-[28px] md:px-7 md:pb-7 md:pt-7 lg:px-8">
                {/* ============================================
            HEADER
        ============================================= */}
                <div className="mb-6 flex items-center justify-between gap-4 md:mb-7">
                    <h2 className="min-w-0 font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-black sm:text-[33px] md:text-[38px]">
                        Tạp chí làm đẹp
                    </h2>

                    <Link
                        href={viewAllHref}
                        className="group/button inline-flex h-[48px] shrink-0 items-center justify-center gap-1 rounded-[15px] border border-[#efd8cf] bg-white px-4 text-[13px] font-semibold text-[#202020] shadow-[0_3px_10px_rgba(0,0,0,0.025)] transition-colors hover:border-[#b40008] hover:text-[#b40008] sm:h-[52px] sm:px-5 sm:text-[14px]"
                    >
                        <span>Xem tất cả</span>

                        <ChevronRight
                            aria-hidden="true"
                            size={16}
                            strokeWidth={2}
                            className="text-[#d4a093] transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:text-[#b40008]"
                        />
                    </Link>
                </div>

                {/* ============================================
            CAROUSEL BÀI VIẾT
        ============================================= */}
                <Carousel
                    opts={{
                        align: 'start',
                        loop: showNavigation,
                        containScroll: 'trimSnaps',
                    }}
                    className="relative w-full"
                >
                    <CarouselContent className="-ml-4 pb-1">
                        {posts.map((post) => {
                            const category =
                                getPostCategory(post)

                            const excerpt =
                                getPostExcerpt(post)

                            const date =
                                getPostDate(post)

                            return (
                                <CarouselItem
                                    key={post.id}
                                    className={[
                                        'pl-4',
                                        'basis-[88%]',
                                        'min-[520px]:basis-[65%]',
                                        'md:basis-1/2',
                                        'lg:basis-1/3',
                                    ].join(' ')}
                                >
                                    <article className="group/card flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-[#dedede] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className="flex h-full flex-col"
                                            aria-label={
                                                post.title
                                            }
                                        >
                                            {/* IMAGE */}
                                            <div className="relative">
                                                <div className="relative aspect-[2.12/1] w-full overflow-hidden bg-[#f7f4f2]">
                                                    <OptimizedImage
                                                        media={
                                                            post.thumbnail
                                                        }
                                                        size="card"
                                                        alt={post.title}
                                                        className="h-full w-full transition-transform duration-500 group-hover/card:scale-[1.035] [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                                                    />
                                                </div>

                                                {/* CATEGORY BADGE */}
                                                <span className="absolute bottom-0 left-5 z-10 max-w-[calc(100%-40px)] translate-y-1/2 truncate rounded-[10px] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.01em] text-[#b40008] shadow-[0_5px_16px_rgba(0,0,0,0.10)] sm:text-[12px]">
                                                    {category}
                                                </span>
                                            </div>

                                            {/* CONTENT */}
                                            <div className="flex flex-1 flex-col px-4 pb-4 pt-7 sm:px-5 sm:pb-5">
                                                <h3 className="line-clamp-2 min-h-[48px] text-[16px] font-bold leading-[1.48] tracking-[-0.012em] text-[#202020] transition-colors group-hover/card:text-[#b40008] sm:text-[17px]">
                                                    {post.title}
                                                </h3>

                                                {excerpt ? (
                                                    <p className="mt-2 line-clamp-2 min-h-[44px] text-[13px] font-normal leading-[1.65] text-[#666666] sm:text-[14px]">
                                                        {excerpt}
                                                    </p>
                                                ) : (
                                                    <div
                                                        aria-hidden="true"
                                                        className="mt-2 min-h-[44px]"
                                                    />
                                                )}

                                                {date.label ? (
                                                    <time
                                                        dateTime={
                                                            date.dateTime
                                                        }
                                                        className="mt-auto block pt-4 text-[13px] font-normal tabular-nums text-[#888888] sm:text-[14px]"
                                                    >
                                                        {date.label}
                                                    </time>
                                                ) : null}
                                            </div>
                                        </Link>
                                    </article>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>

                    {/* ============================================
              NÚT TRƯỢT
              Ẩn mặc định để giao diện giống ảnh.
              Rê chuột vào section mới hiện.
          ============================================= */}
                    {showNavigation ? (
                        <>
                            <CarouselPrevious
                                aria-label="Xem bài viết trước"
                                className="absolute -left-[23px] top-1/2 z-30 hidden h-[50px] w-[50px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] opacity-0 shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-[#b40008] hover:bg-white hover:text-[#b40008] group-hover/journal:opacity-100 md:flex"
                            />

                            <CarouselNext
                                aria-label="Xem bài viết tiếp theo"
                                className="absolute -right-[23px] top-1/2 z-30 hidden h-[50px] w-[50px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] opacity-0 shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-[#b40008] hover:bg-white hover:text-[#b40008] group-hover/journal:opacity-100 md:flex"
                            />
                        </>
                    ) : null}
                </Carousel>

                {/* Hướng dẫn kéo trên mobile */}
                {posts.length > 1 ? (
                    <p className="mt-4 text-center text-[11px] font-normal text-[#999999] md:hidden">
                        Vuốt ngang để xem thêm bài viết
                    </p>
                ) : null}
            </div>
        </section>
    )
}