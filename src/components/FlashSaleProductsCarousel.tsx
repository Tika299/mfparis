'use client'

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import {
    ProductCard,
    type ProductCardProduct,
} from '@/components/ProductCard'

type FlashSaleProductsCarouselProps =
    Readonly<{
        products: ProductCardProduct[]
    }>

export function FlashSaleProductsCarousel({
    products,
}: FlashSaleProductsCarouselProps) {
    if (!products?.length) {
        return null
    }

    return (
        <Carousel
            opts={{
                align: 'start',
                containScroll: 'trimSnaps',
                loop: products.length > 4,
                dragFree: false,
            }}
            className="relative min-w-0 w-full"
        >
            <CarouselContent className="-ml-2.5 pb-1 md:-ml-3 lg:-ml-4">
                {products.map((product) => (
                    <CarouselItem
                        key={product.id}
                        className={[
                            'basis-1/2 pl-2.5',
                            'md:basis-1/3 md:pl-3',
                            'lg:basis-1/4 lg:pl-4',
                            'xl:basis-1/4',
                            '2xl:basis-1/4',
                        ].join(' ')}
                    >
                        <ProductCard
                            product={product}
                            mode="flash"
                            className="h-full rounded-[18px] shadow-none hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.055)]"
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>

            {products.length > 4 ? (
                <>
                    <CarouselPrevious
                        aria-label="Xem sản phẩm Flash Sale trước"
                        className={[
                            'absolute left-2 top-1/2 z-30 hidden',
                            'h-10 w-10 -translate-y-1/2',
                            'border border-[#eeeeee] bg-white text-[#333333]',
                            'shadow-[0_6px_18px_rgba(0,0,0,0.13)]',
                            'transition-colors',
                            'hover:border-[#b40008] hover:bg-[#b40008] hover:text-white',
                            'lg:flex',
                        ].join(' ')}
                    />

                    <CarouselNext
                        aria-label="Xem sản phẩm Flash Sale tiếp theo"
                        className={[
                            'absolute right-2 top-1/2 z-30 hidden',
                            'h-10 w-10 -translate-y-1/2',
                            'border border-[#eeeeee] bg-white text-[#333333]',
                            'shadow-[0_6px_18px_rgba(0,0,0,0.13)]',
                            'transition-colors',
                            'hover:border-[#b40008] hover:bg-[#b40008] hover:text-white',
                            'lg:flex',
                        ].join(' ')}
                    />
                </>
            ) : null}
        </Carousel>
    )
}