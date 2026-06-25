'use client'

import dynamic from 'next/dynamic'
import { LazySection } from '@/components/LazySection'

const BrandPartnersCarousel = dynamic(
    () =>
        import('@/components/BrandPartnersCarousel').then(
            (mod) => mod.BrandPartnersCarousel,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

type BrandPartnersSectionClientProps =
    Readonly<{
        brands: any[]
    }>

export function BrandPartnersSectionClient({
    brands,
}: BrandPartnersSectionClientProps) {
    return (
        <LazySection
            minHeight={160}
            rootMargin="250px"
            placeholder={
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8">
                    <div className="h-[82px] rounded-[10px] bg-neutral-100 animate-pulse md:h-[100px] lg:h-[112px]" />
                    <div className="h-[82px] rounded-[10px] bg-neutral-100 animate-pulse md:h-[100px] lg:h-[112px]" />
                    <div className="hidden h-[82px] rounded-[10px] bg-neutral-100 animate-pulse md:block md:h-[100px] lg:h-[112px]" />
                    <div className="hidden h-[82px] rounded-[10px] bg-neutral-100 animate-pulse lg:block lg:h-[112px]" />
                    <div className="hidden h-[82px] rounded-[10px] bg-neutral-100 animate-pulse lg:block lg:h-[112px]" />
                    <div className="hidden h-[82px] rounded-[10px] bg-neutral-100 animate-pulse lg:block lg:h-[112px]" />
                </div>
            }
        >
            <BrandPartnersCarousel brands={brands} />
        </LazySection>
    )
}