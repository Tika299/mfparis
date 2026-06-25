'use client'

import dynamic from 'next/dynamic'

import { LazySection } from '@/components/LazySection'
import type { Post } from '@/payload-types'

type BeautyJournalSectionClientProps = Readonly<{
    posts: Post[]
    viewAllHref?: string
}>

const BeautyJournalSection = dynamic(
    () =>
        import('@/components/home/BeautyJournalSection').then(
            (mod) => mod.BeautyJournalSection,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

export function BeautyJournalSectionClient({
    posts,
    viewAllHref = '/blog',
}: BeautyJournalSectionClientProps) {
    return (
        <LazySection
            minHeight={560}
            rootMargin="300px"
            placeholder={
                <section className="container-ux mt-8 md:mt-10">
                    <div className="rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-5 pt-5 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 sm:pb-6 sm:pt-6 md:rounded-[28px] md:px-7 md:pb-7 md:pt-7 lg:px-8">
                        <div className="mb-6 flex items-center justify-between gap-4 md:mb-7">
                            <div className="h-9 w-56 animate-pulse rounded-xl bg-neutral-100 md:h-10" />
                            <div className="h-[52px] w-32 animate-pulse rounded-[15px] bg-neutral-100" />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white">
                                <div className="aspect-[2.12/1] animate-pulse bg-neutral-100" />
                                <div className="p-4 sm:p-5">
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
                                </div>
                            </div>

                            <div className="hidden overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white sm:block">
                                <div className="aspect-[2.12/1] animate-pulse bg-neutral-100" />
                                <div className="p-4 sm:p-5">
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
                                </div>
                            </div>

                            <div className="hidden overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white lg:block">
                                <div className="aspect-[2.12/1] animate-pulse bg-neutral-100" />
                                <div className="p-4 sm:p-5">
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-neutral-100" />
                                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }
        >
            <BeautyJournalSection
                posts={posts}
                viewAllHref={viewAllHref}
            />
        </LazySection>
    )
}