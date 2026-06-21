'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import type { Product } from '@/payload-types'
import { ProductCard } from '@/components/ProductCard'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type HomeProduct = Product & {
    comboDescription?: string | null
    shortDescription?: string | null
    excerpt?: string | null
}

type HomeProductTabsProps = Readonly<{
    bestSellers: HomeProduct[]
    newArrivals: HomeProduct[]
    combos: HomeProduct[]
}>

type ProductSectionMode =
    | 'combo'
    | 'new'
    | 'bestSeller'

type ProductSectionProps = Readonly<{
    title: string
    products: HomeProduct[]
    mode: ProductSectionMode
    href: string
}>

/**
 * Nội dung mô tả ngắn dưới tên combo.
 *
 * Hệ thống ưu tiên:
 * 1. comboDescription
 * 2. shortDescription
 * 3. excerpt
 */
function getComboDescription(
    product: HomeProduct,
): string | undefined {
    const description =
        product.comboDescription ??
        product.shortDescription ??
        product.excerpt

    if (
        typeof description !== 'string' ||
        !description.trim()
    ) {
        return undefined
    }

    return description.trim()
}

export function HomeProductTabs({
    bestSellers,
    newArrivals,
    combos,
}: HomeProductTabsProps) {
    return (
        <>
            {/* 1. SẢN PHẨM COMBO */}
            <HomeProductSection
                title="Sản phẩm combo"
                products={combos}
                mode="combo"
                href="/products?isCombo=true"
            />

            {/* 2. SẢN PHẨM MỚI */}
            <HomeProductSection
                title="Sản phẩm mới"
                products={newArrivals}
                mode="new"
                href="/products?sort=-createdAt"
            />

            {/* 3. SẢN PHẨM BÁN CHẠY */}
            <HomeProductSection
                title="Sản phẩm bán chạy"
                products={bestSellers}
                mode="bestSeller"
                href="/products?sort=best-selling"
            />
        </>
    )
}

function HomeProductSection({
    title,
    products,
    mode,
    href,
}: ProductSectionProps) {
    if (!products?.length) {
        return null
    }

    /**
     * Desktop hiển thị 6 sản phẩm.
     * Các sản phẩm còn lại xem bằng carousel.
     */
    const hasCarouselNavigation =
        products.length > 6

    /**
     * Theo ảnh mẫu:
     * Chỉ section bán chạy hiện nút tròn hai bên.
     */
    const showNavigation =
        mode === 'bestSeller' &&
        hasCarouselNavigation

    return (
        <section className="container-ux mt-7 md:mt-8">
            <div className="relative overflow-visible rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-5 pt-5 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 sm:pb-6 sm:pt-6 md:rounded-[28px] md:px-7 md:pb-7 md:pt-7 lg:px-8">
                {/* ================================================
            SECTION HEADER
        ================================================= */}
                <div className="mb-6 flex items-center justify-between gap-4 md:mb-7">
                    <h2 className="min-w-0 font-heading text-[27px] font-semibold leading-[1.15] tracking-[-0.025em] text-black sm:text-[32px] md:text-[38px]">
                        {title}
                    </h2>

                    <Link
                        href={href}
                        className="group inline-flex h-[48px] shrink-0 items-center justify-center gap-1 rounded-[15px] border border-[#efd8cf] bg-white px-4 text-[13px] font-semibold text-[#202020] transition-colors hover:border-[#b40008] hover:text-[#b40008] sm:h-[52px] sm:px-5 sm:text-[14px]"
                    >
                        <span>Xem tất cả</span>

                        <ChevronRight
                            aria-hidden="true"
                            size={16}
                            strokeWidth={2}
                            className="text-[#d4a093] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#b40008]"
                        />
                    </Link>
                </div>

                {/* ================================================
            PRODUCT CAROUSEL
        ================================================= */}
                <Carousel
                    opts={{
                        align: 'start',
                        loop: hasCarouselNavigation,
                        containScroll: 'trimSnaps',
                    }}
                    className="relative w-full"
                >
                    <CarouselContent className="-ml-3 pb-0 md:-ml-4">
                        {products.map(
                            (product, index) => (
                                <CarouselItem
                                    key={product.id}
                                    className={[
                                        /*
                                         * Mobile: một card lớn, thấy một phần card tiếp theo.
                                         * Tablet: 2–4 card.
                                         * Desktop lớn: đúng 6 card.
                                         */
                                        'basis-[82%] pl-3',
                                        'min-[480px]:basis-[48%]',
                                        'md:basis-1/3 md:pl-4',
                                        'lg:basis-1/4',
                                        'xl:basis-1/6',
                                    ].join(' ')}
                                >
                                    {mode === 'combo' ? (
                                        <ProductCard
                                            product={product}
                                            mode="combo"
                                            badgeText="COMBO"
                                            description={
                                                getComboDescription(
                                                    product,
                                                )
                                            }
                                            showRating={false}
                                            showAddToCart={false}
                                            className="h-full rounded-[18px] border-[#e8e8e8] shadow-none hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                                        />
                                    ) : null}

                                    {mode === 'new' ? (
                                        <ProductCard
                                            product={product}
                                            mode="new"
                                            badgeText="MỚI"
                                            showRating={false}
                                            showAddToCart={false}
                                            className="h-full rounded-[18px] border-[#e8e8e8] shadow-none hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                                        />
                                    ) : null}

                                    {mode === 'bestSeller' ? (
                                        <ProductCard
                                            product={product}
                                            mode="bestSeller"
                                            rank={index + 1}
                                            showRating
                                            showAddToCart={false}
                                            className="h-full rounded-[18px] border-[#e8e8e8] shadow-none hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                                        />
                                    ) : null}
                                </CarouselItem>
                            ),
                        )}
                    </CarouselContent>

                    {/* Nút điều hướng chỉ hiện cho bán chạy */}
                    {showNavigation ? (
                        <>
                            <CarouselPrevious
                                aria-label="Xem sản phẩm trước"
                                className="absolute -left-[22px] top-1/2 z-30 hidden h-[50px] w-[50px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
                            />

                            <CarouselNext
                                aria-label="Xem sản phẩm tiếp theo"
                                className="absolute -right-[22px] top-1/2 z-30 hidden h-[50px] w-[50px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
                            />
                        </>
                    ) : null}
                </Carousel>

                {/* Nút mobile */}
                <div className="mt-5 sm:hidden">
                    <Link
                        href={href}
                        className="flex h-11 w-full items-center justify-center gap-1 rounded-[13px] border border-[#efd8cf] bg-white text-[13px] font-semibold text-[#202020]"
                    >
                        Xem tất cả

                        <ChevronRight
                            size={15}
                            className="text-[#d4a093]"
                        />
                    </Link>
                </div>
            </div>
        </section>
    )
}