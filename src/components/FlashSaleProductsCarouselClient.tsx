'use client'

import dynamic from 'next/dynamic'
import { LazySection } from '@/components/LazySection'
import type { ProductCardProduct } from '@/components/ProductCard'

const FlashSaleProductsCarousel = dynamic(
    () =>
        import('@/components/FlashSaleProductsCarousel').then(
            (mod) => mod.FlashSaleProductsCarousel,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

type FlashSaleProductsCarouselClientProps =
    Readonly<{
        products: ProductCardProduct[]
    }>

export function FlashSaleProductsCarouselClient({
    products,
}: FlashSaleProductsCarouselClientProps) {
    return (
        <div className="min-w-0 w-full">
            <LazySection
                minHeight={220}
                rootMargin="250px"
                placeholder={
                    <div className="grid min-h-[220px] grid-cols-2 gap-2 sm:min-h-[250px] sm:gap-2.5 md:min-h-[280px] md:grid-cols-3 md:gap-3 lg:min-h-[410px] lg:grid-cols-4 lg:gap-4">
                        <div className="animate-pulse rounded-[12px] bg-neutral-100 sm:rounded-[14px] lg:rounded-[18px]" />
                        <div className="animate-pulse rounded-[12px] bg-neutral-100 sm:rounded-[14px] lg:rounded-[18px]" />
                        <div className="hidden animate-pulse rounded-[12px] bg-neutral-100 md:block sm:rounded-[14px] lg:rounded-[18px]" />
                        <div className="hidden animate-pulse rounded-[12px] bg-neutral-100 lg:block sm:rounded-[14px] lg:rounded-[18px]" />
                    </div>
                }
            >
                <FlashSaleProductsCarousel
                    products={products}
                />
            </LazySection>
        </div>
    )
}