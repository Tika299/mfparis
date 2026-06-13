'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, ShieldCheck, Truck, Zap } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'

type FlashSaleVoucher = {
    id?: string | null
    title?: string | null
    value?: string | null
    sub?: string | null
}

type FlashSaleSectionProps = {
    products: any[]
    categories: any[]
    endTime: string
    vouchers?: FlashSaleVoucher[]
}

function getTimeLeft(endTime: string) {
    const end = new Date(endTime).getTime()
    const now = Date.now()
    const diff = Math.max(0, end - now)

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff / (1000 * 60)) % 60)
    const seconds = Math.floor((diff / 1000) % 60)

    return {
        hours,
        minutes,
        seconds,
        isEnded: diff <= 0,
    }
}

function pad(value: number) {
    return String(value).padStart(2, '0')
}

export function FlashSaleSection({
    products,
    categories,
    endTime,
    vouchers = [],
}: FlashSaleSectionProps) {
    const [activeCategory, setActiveCategory] = useState('all')
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endTime))

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTimeLeft(getTimeLeft(endTime))
        }, 1000)

        return () => window.clearInterval(timer)
    }, [endTime])

    const availableCategories = useMemo(() => {
        const productCategorySlugs = new Set<string>()

        products.forEach((product) => {
            product.categories?.forEach((cat: any) => {
                if (cat?.slug) productCategorySlugs.add(cat.slug)
            })
        })

        return categories
            .filter((cat: any) => productCategorySlugs.has(cat.slug))
            .slice(0, 8)
    }, [products, categories])

    const filteredProducts = useMemo(() => {
        if (activeCategory === 'all') return products

        return products.filter((product) =>
            product.categories?.some((cat: any) => cat?.slug === activeCategory),
        )
    }, [products, activeCategory])

    const heroProducts = products.slice(0, 4)

    const voucherItems =
        vouchers.length > 0
            ? vouchers
            : [
                {
                    title: 'Voucher',
                    value: '15K',
                    sub: 'Đơn từ 799K',
                },
                {
                    title: 'Voucher',
                    value: '35K',
                    sub: 'Đơn từ 1.499K',
                },
                {
                    title: 'Voucher',
                    value: '70K',
                    sub: 'Đơn từ 2.499K',
                },
                {
                    title: 'Theo dõi shop',
                    value: 'Nhận 10K',
                    sub: 'Ưu đãi thành viên',
                },
            ]

    if (!products?.length || timeLeft.isEnded) return null

    return (
        <section className="container-ux mt-8 md:mt-10">
            <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm md:rounded-[2.5rem]">
                {/* Banner Flash Sale */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#7a0000] via-[#b00005] to-[#e10613] px-4 py-7 text-white sm:px-5 md:px-8 md:py-9 lg:px-10 lg:py-10">
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-300 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-red-950 blur-2xl" />
                    </div>

                    <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
                        <div className="lg:col-span-7">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest backdrop-blur md:text-[11px]">
                                <Zap size={15} fill="currentColor" />
                                Deal sốc mỗi ngày
                            </div>

                            <h2 className="text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                                Flash Sale
                            </h2>

                            <p className="mt-4 max-w-2xl text-sm font-semibold text-red-50 md:text-lg">
                                Siêu ưu đãi cho Nước hoa - Mỹ phẩm - TPCN chính hãng
                            </p>

                            <div className="mt-7 max-w-md rounded-2xl border border-white/20 bg-black/15 p-3 backdrop-blur sm:p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-50">
                                    <Clock size={16} />
                                    Kết thúc sau
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3">
                                    <TimeBox value={pad(timeLeft.hours)} label="Giờ" />
                                    <span className="text-xl font-black sm:text-2xl">:</span>
                                    <TimeBox value={pad(timeLeft.minutes)} label="Phút" />
                                    <span className="text-xl font-black sm:text-2xl">:</span>
                                    <TimeBox value={pad(timeLeft.seconds)} label="Giây" />
                                </div>
                            </div>

                            {/* Tablet hero products: không chia 2 cột, kéo ngang cho thoáng */}
                            <div className="mt-7 hidden gap-3 overflow-x-auto pb-2 md:flex lg:hidden">
                                {heroProducts.map((product) => {
                                    const media = product?.images?.[0]?.image

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.slug}`}
                                            className="flex h-36 w-28 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white p-3 shadow-xl transition hover:-translate-y-1"
                                        >
                                            <OptimizedImage
                                                media={media}
                                                size="card"
                                                alt={product.title}
                                                className="h-full w-full [&_img]:object-contain"
                                            />
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Desktop hero products */}
                        <div className="relative hidden min-h-[230px] lg:col-span-5 lg:block">
                            <div className="absolute bottom-0 right-0 h-28 w-full rounded-full bg-yellow-300/20 blur-2xl" />

                            <div className="absolute bottom-0 right-0 flex items-end justify-end gap-3">
                                {heroProducts.map((product, index) => {
                                    const media = product?.images?.[0]?.image

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.slug}`}
                                            className={[
                                                'relative flex items-end justify-center overflow-hidden rounded-3xl border border-white/20 bg-white p-3 shadow-2xl transition hover:-translate-y-2',
                                                index === 0 ? 'h-48 w-32' : '',
                                                index === 1 ? 'h-56 w-36' : '',
                                                index === 2 ? 'h-44 w-32' : '',
                                                index === 3 ? 'h-40 w-28' : '',
                                            ].join(' ')}
                                        >
                                            <OptimizedImage
                                                media={media}
                                                size="card"
                                                alt={product.title}
                                                className="h-full w-full [&_img]:object-contain"
                                            />
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Voucher bar */}
                    <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 rounded-3xl bg-white p-3 text-[#b72828] shadow-xl md:grid-cols-3 lg:grid-cols-5">
                        {voucherItems.slice(0, 4).map((voucher, index) => (
                            <VoucherBox
                                key={index}
                                title={voucher.title || 'Voucher'}
                                value={voucher.value || ''}
                                sub={voucher.sub || ''}
                            />
                        ))}

                        <div className="col-span-2 flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-center md:col-span-1">
                            <ShieldCheck size={22} />
                            <div>
                                <p className="text-sm font-black uppercase leading-tight">100%</p>
                                <p className="text-[10px] font-bold uppercase text-red-700">
                                    Chính hãng
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs + products */}
                <div className="p-4 md:p-6">
                    <div className="mb-5 grid grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 text-center text-xs font-black uppercase tracking-widest sm:grid-cols-2 lg:grid-cols-4">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('all')}
                            className={
                                activeCategory === 'all'
                                    ? 'flex h-14 items-center justify-center gap-2 bg-[#b72828] text-white'
                                    : 'flex h-14 items-center justify-center gap-2 bg-white text-gray-700 hover:text-[#b72828]'
                            }
                        >
                            <Zap size={16} fill="currentColor" />
                            Deal sốc mỗi ngày
                        </button>

                        {availableCategories.slice(0, 3).map((cat: any) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.slug)}
                                className={
                                    activeCategory === cat.slug
                                        ? 'h-14 bg-[#b72828] px-3 text-white'
                                        : 'h-14 bg-white px-3 text-gray-700 hover:text-[#b72828]'
                                }
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('all')}
                            className={
                                activeCategory === 'all'
                                    ? 'shrink-0 rounded-full bg-[#b72828] px-5 py-2.5 text-xs font-bold text-white'
                                    : 'shrink-0 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-500 hover:border-[#b72828] hover:text-[#b72828]'
                            }
                        >
                            Tất cả
                        </button>

                        {availableCategories.map((cat: any) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategory(cat.slug)}
                                className={
                                    activeCategory === cat.slug
                                        ? 'shrink-0 rounded-full bg-[#b72828] px-5 py-2.5 text-xs font-bold text-white'
                                        : 'shrink-0 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-500 hover:border-[#b72828] hover:text-[#b72828]'
                                }
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {filteredProducts.length > 0 ? (
                        <Carousel
                            key={activeCategory}
                            opts={{
                                align: 'start',
                                loop: filteredProducts.length > 4,
                            }}
                            className="relative"
                        >
                            <CarouselContent className="-ml-4 pb-4 md:-ml-5">
                                {filteredProducts.map((product) => (
                                    <CarouselItem
                                        key={product.id}
                                        className="basis-[82%] pl-4 sm:basis-1/2 md:basis-1/2 md:pl-5 lg:basis-1/3 xl:basis-1/4"
                                    >
                                        <ProductCard product={product} />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            <CarouselPrevious className="absolute -left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 border-none bg-white text-neutral-700 shadow-xl transition hover:bg-[#b72828] hover:text-white md:flex" />

                            <CarouselNext className="absolute -right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 border-none bg-white text-neutral-700 shadow-xl transition hover:bg-[#b72828] hover:text-white md:flex" />
                        </Carousel>
                    ) : (
                        <div className="rounded-3xl bg-neutral-50 px-6 py-12 text-center">
                            <p className="text-sm font-semibold text-neutral-500">
                                Chưa có sản phẩm trong danh mục này.
                            </p>
                        </div>
                    )}

                    <div className="mt-6 flex justify-center">
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-4 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-[#b72828]"
                        >
                            Xem tất cả sản phẩm <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

function TimeBox({ value, label }: { value: string; label: string }) {
    return (
        <div className="min-w-[58px] rounded-2xl bg-white px-2.5 py-3 text-center text-[#b72828] shadow-lg sm:min-w-[70px] sm:px-3">
            <p className="text-xl font-black leading-none sm:text-2xl md:text-3xl">
                {value}
            </p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500 sm:text-[10px]">
                {label}
            </p>
        </div>
    )
}

function VoucherBox({
    title,
    value,
    sub,
}: {
    title: string
    value: string
    sub: string
}) {
    return (
        <div className="rounded-2xl border border-red-100 bg-white px-3 py-3 text-center sm:px-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 sm:text-[10px]">
                {title}
            </p>
            <p className="mt-1 text-xl font-black uppercase leading-none text-[#b72828] sm:text-2xl">
                {value}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase text-gray-600 sm:text-[10px]">
                {sub}
            </p>
        </div>
    )
}

function MiniTrust({
    icon,
    title,
    sub,
}: {
    icon: ReactNode
    title: string
    sub: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#b72828]">
                {icon}
            </div>
            <div>
                <p className="text-[11px] font-black uppercase text-gray-900">{title}</p>
                <p className="text-[10px] text-gray-500">{sub}</p>
            </div>
        </div>
    )
}