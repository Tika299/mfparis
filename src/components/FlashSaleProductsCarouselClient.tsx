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
        <LazySection
            minHeight={410}
            rootMargin="300px"
            placeholder={
                <div className="grid min-h-[410px] grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4">
                    <div className="animate-pulse rounded-[18px] bg-neutral-100" />
                    <div className="animate-pulse rounded-[18px] bg-neutral-100" />
                    <div className="hidden animate-pulse rounded-[18px] bg-neutral-100 md:block" />
                    <div className="hidden animate-pulse rounded-[18px] bg-neutral-100 lg:block" />
                </div>
            }
        >
            <FlashSaleProductsCarousel
                products={products}
            />
        </LazySection>
    )
}