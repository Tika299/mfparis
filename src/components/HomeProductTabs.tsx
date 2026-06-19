'use client'

import Link from 'next/link'
import { ChevronRight, Flame, Sparkles, PackageCheck } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type HomeProductTabsProps = {
    bestSellers: any[]
    newArrivals: any[]
    combos: any[]
}

type ProductSectionProps = {
    title: string
    subLabel: string
    products: any[]
    icon: any
    href?: string
}

export function HomeProductTabs({
    bestSellers,
    newArrivals,
    combos,
}: HomeProductTabsProps) {
    return (
        <>
            <HomeProductSection
                title="Sản phẩm bán chạy"
                subLabel="Best Seller"
                products={bestSellers}
                icon={Flame}
                href="/products"
            />

            <HomeProductSection
                title="Sản phẩm mới"
                subLabel="New Arrival"
                products={newArrivals}
                icon={Sparkles}
                href="/products"
            />

            <HomeProductSection
                title="Combo tiết kiệm"
                subLabel="Combo Deal"
                products={combos}
                icon={PackageCheck}
                href="/products?isCombo=true"
            />
        </>
    )
}

function HomeProductSection({
    title,
    subLabel,
    products,
    icon: Icon,
    href = '/products',
}: ProductSectionProps) {
    if (!products?.length) return null

    return (
        <section className="container-ux mt-8 md:mt-10">
            <div className="lc-card rounded-[2rem] p-4 sm:p-5 md:rounded-[2.5rem] md:p-8">
                <div className="mb-6 flex flex-col gap-5 px-1 md:mb-8 md:flex-row md:items-center md:justify-between md:px-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-red-100">
                            <Icon size={20} fill="currentColor" />
                        </div>

                        <div className="min-w-0">
                            <span className="sub-heading">{subLabel}</span>
                            <h2 className="font-heading text-[25px] font-semibold leading-[1.15] tracking-[-0.02em] text-neutral-900 md:text-[32px]">
                                {title}
                            </h2>
                        </div>
                    </div>

                    <Link
                        href={href}
                        className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-4 py-2.5 text-[12px] font-semibold tracking-[0.03em] text-primary transition-colors hover:bg-primary hover:text-white md:flex"
                    >
                        Xem tất cả <ChevronRight size={15} />
                    </Link>
                </div>

                <Carousel
                    opts={{
                        align: 'start',
                        loop: products.length > 5,
                    }}
                    className="relative"
                >
                    <CarouselContent className="-ml-3 pb-4 md:-ml-4">
                        {products.map((product) => (
                            <CarouselItem
                                key={product.id}
                                className="basis-1/2 pl-3 md:basis-1/3 md:pl-4 lg:basis-1/4 xl:basis-1/5"
                            >
                                <ProductCard product={product} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>

                    <CarouselPrevious className="absolute -left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 border-none bg-white text-neutral-700 shadow-xl transition hover:bg-primary hover:text-white md:flex" />

                    <CarouselNext className="absolute -right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 border-none bg-white text-neutral-700 shadow-xl transition hover:bg-primary hover:text-white md:flex" />
                </Carousel>

                <div className="mt-6 md:hidden">
                    <Link
                        href={href}
                        className="flex h-12 w-full items-center justify-center rounded-full bg-black text-[13px] font-bold tracking-[0.04em] text-white transition-colors hover:bg-primary"
                    >
                        Xem tất cả sản phẩm
                    </Link>
                </div>
            </div>
        </section>
    )
}