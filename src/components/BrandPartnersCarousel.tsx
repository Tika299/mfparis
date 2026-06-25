'use client'

import Link from 'next/link'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type BrandPartnersCarouselProps =
    Readonly<{
        brands: any[]
    }>

export function BrandPartnersCarousel({
    brands,
}: BrandPartnersCarouselProps) {
    if (!brands?.length) {
        return null
    }

    const showNavigation = brands.length > 8

    return (
        <Carousel
            opts={{
                align: 'start',
                loop: showNavigation,
                containScroll: 'trimSnaps',
            }}
            className="relative w-full"
        >
            <CarouselContent className="-ml-3 pb-1 md:-ml-4">
                {brands.map((brand) => {
                    const brandName =
                        typeof brand.name === 'string'
                            ? brand.name
                            : 'Thương hiệu'

                    const brandSlug =
                        typeof brand.slug === 'string'
                            ? brand.slug
                            : ''

                    const logo = brand.logo
                    const hasLogo =
                        logo && typeof logo === 'object'

                    return (
                        <CarouselItem
                            key={brand.id}
                            className={[
                                'basis-1/2 pl-3',
                                'md:basis-1/3 md:pl-4',
                                'lg:basis-1/6',
                                'xl:basis-1/8',
                            ].join(' ')}
                        >
                            <Link
                                href={
                                    brandSlug
                                        ? `/brands/${brandSlug}`
                                        : '/brands'
                                }
                                aria-label={brandName}
                                className="group/brand flex h-[82px] w-full items-center justify-center overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#d9d9d9] hover:shadow-[0_9px_22px_rgba(0,0,0,0.055)] sm:h-[90px] sm:px-3 md:h-[100px] md:px-4 lg:h-[112px] lg:rounded-[13px]"
                            >
                                {hasLogo ? (
                                    <OptimizedImage
                                        media={logo}
                                        size="thumbnail"
                                        alt={brandName}
                                        className="h-[65%] w-full transition-transform duration-300 group-hover/brand:scale-[1.035] [&_img]:h-full [&_img]:w-full [&_img]:object-contain"
                                    />
                                ) : (
                                    <span className="line-clamp-2 text-center text-[16px] font-semibold leading-snug text-[#202020]">
                                        {brandName}
                                    </span>
                                )}
                            </Link>
                        </CarouselItem>
                    )
                })}
            </CarouselContent>

            {showNavigation ? (
                <>
                    <CarouselPrevious
                        aria-label="Xem thương hiệu trước"
                        className="absolute -left-[23px] top-[68%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
                    />

                    <CarouselNext
                        aria-label="Xem thương hiệu tiếp theo"
                        className="absolute -right-[23px] top-[68%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
                    />
                </>
            ) : null}
        </Carousel>
    )
}