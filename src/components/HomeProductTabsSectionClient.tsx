'use client'

import dynamic from 'next/dynamic'

import { LazySection } from '@/components/LazySection'
import type { ProductCardProduct } from '@/components/ProductCard'

type HomeProduct = ProductCardProduct & {
    comboDescription?: string | null
    shortDescription?: string | null
    excerpt?: string | null
}

type HomeProductTabsSectionClientProps = Readonly<{
    bestSellers: HomeProduct[]
    newArrivals: HomeProduct[]
    combos: HomeProduct[]
}>

const HomeProductTabs = dynamic(
    () =>
        import('@/components/HomeProductTabs').then(
            (mod) => mod.HomeProductTabs,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

function SectionSkeleton() {
    return (
        <div className="rounded-[18px] border border-[#eeeeee] bg-white px-3 pb-4 pt-4 shadow-[0_6px_20px_rgba(0,0,0,0.035)] sm:px-4 sm:pb-5 sm:pt-5 md:rounded-[24px] md:px-5 md:pb-6 md:pt-6 lg:rounded-[28px] lg:px-8 lg:pb-7 lg:pt-7">
            <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 md:mb-6 lg:mb-7">
                <div className="h-8 w-48 animate-pulse rounded-xl bg-neutral-100 sm:h-9 md:h-10 lg:h-12" />
                <div className="h-10 w-28 animate-pulse rounded-[12px] bg-neutral-100 lg:h-[52px]" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-6">
                <div className="aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100" />
                <div className="aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100" />
                <div className="hidden aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100 md:block" />
                <div className="hidden aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100 lg:block" />
                <div className="hidden aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100 xl:block" />
                <div className="hidden aspect-[0.72] animate-pulse rounded-[18px] bg-neutral-100 xl:block" />
            </div>
        </div>
    )
}

export function HomeProductTabsSectionClient({
    bestSellers,
    newArrivals,
    combos,
}: HomeProductTabsSectionClientProps) {
    return (
        <LazySection
            rootMargin="300px"
            placeholder={
                <div className="container-ux mt-7 space-y-7 md:mt-8">
                    <SectionSkeleton />
                    <SectionSkeleton />
                    <SectionSkeleton />
                </div>
            }
        >
            <HomeProductTabs
                bestSellers={bestSellers}
                newArrivals={newArrivals}
                combos={combos}
            />
        </LazySection>
    )
}