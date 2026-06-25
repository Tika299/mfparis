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

type FeaturedCategoriesCarouselProps =
    Readonly<{
        categories: any[]
    }>

export function FeaturedCategoriesCarousel({
    categories,
}: FeaturedCategoriesCarouselProps) {
    if (!categories?.length) {
        return null
    }

    const categoryPairs: any[][] = []

    for (let index = 0; index < categories.length; index += 2) {
        categoryPairs.push(
            categories.slice(index, index + 2),
        )
    }

    return (
        <Carousel
            opts={{
                align: 'start',
                loop: true,
            }}
            className="relative w-full"
        >
            <CarouselContent className="-ml-4 pb-2 md:-ml-5">
                {categoryPairs.map((pair, index) => (
                    <CarouselItem
                        key={index}
                        className="basis-[52%] pl-4 sm:basis-[38%] md:basis-[28%] md:pl-5 lg:basis-[22%] xl:basis-[18%]"
                    >
                        <div className="grid grid-rows-2 gap-4">
                            {pair.map((cat) => {
                                const categoryName =
                                    typeof cat.name === 'string'
                                        ? cat.name
                                        : 'Danh mục'

                                const categorySlug =
                                    typeof cat.slug === 'string'
                                        ? cat.slug
                                        : ''

                                return (
                                    <Link
                                        key={cat.id}
                                        href={
                                            categorySlug
                                                ? `/categories/${categorySlug}`
                                                : '/categories'
                                        }
                                        className="group flex min-w-0 flex-col items-center rounded-2xl border border-transparent p-2.5 transition-colors hover:border-primary/20"
                                    >
                                        <div className="mb-3 flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-black/5 md:h-[102px] md:w-[102px]">
                                            <div className="relative h-[62px] w-[62px] overflow-hidden rounded-full bg-gray-50 md:h-[74px] md:w-[74px]">
                                                <OptimizedImage
                                                    media={cat.image}
                                                    size="thumbnail"
                                                    alt={categoryName}
                                                    className="h-full w-full object-contain transition-transform duration-1000 ease-in-out"
                                                />

                                                <div className="absolute inset-0 bg-black/5 transition-colors duration-500 group-hover:bg-black/5" />
                                            </div>
                                        </div>

                                        <span className="line-clamp-2 min-h-[36px] w-full px-1 text-center text-[12px] font-semibold leading-[1.4] tracking-[-0.01em] text-neutral-800 transition-colors group-hover:text-primary md:text-[13px]">
                                            {categoryName}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>

            <CarouselPrevious className="absolute -left-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
            <CarouselNext className="absolute -right-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
        </Carousel>
    )
}