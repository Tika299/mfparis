'use client'

import dynamic from 'next/dynamic'
import { LazySection } from '@/components/LazySection'

const FeaturedCategoriesCarousel = dynamic(
    () =>
        import('@/components/FeaturedCategoriesCarousel').then(
            (mod) => mod.FeaturedCategoriesCarousel,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

type FeaturedCategoriesSectionClientProps =
    Readonly<{
        categories: any[]
    }>

export function FeaturedCategoriesSectionClient({
    categories,
}: FeaturedCategoriesSectionClientProps) {
    return (
        <LazySection
            minHeight={320}
            rootMargin="250px"
            placeholder={
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <div className="h-[220px] animate-pulse rounded-2xl bg-neutral-100" />
                    <div className="h-[220px] animate-pulse rounded-2xl bg-neutral-100" />
                    <div className="hidden h-[220px] animate-pulse rounded-2xl bg-neutral-100 md:block" />
                    <div className="hidden h-[220px] animate-pulse rounded-2xl bg-neutral-100 lg:block" />
                    <div className="hidden h-[220px] animate-pulse rounded-2xl bg-neutral-100 xl:block" />
                </div>
            }
        >
            <FeaturedCategoriesCarousel
                categories={categories}
            />
        </LazySection>
    )
}