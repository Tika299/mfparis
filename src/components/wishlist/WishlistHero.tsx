import type {
    LucideIcon,
} from 'lucide-react'
import type {
    ReactNode,
} from 'react'
import Link from 'next/link'
import {
    AlarmClock,
    BadgePercent,
    Heart,
    RotateCcw,
    ShoppingBag,
} from 'lucide-react'

type WishlistHeroProps = Readonly<{
    savedCount: number
    saleCount: number
    lowStockCount: number
    repurchaseCount: number

    /**
     * Có thể truyền component Image hoặc một khối
     * minh họa riêng vào khu vực bên phải.
     */
    visual?: ReactNode

    continueShoppingHref?: string
}>

type WishlistStat = Readonly<{
    label: string
    value: number
    suffix: string
    icon: LucideIcon
    iconClassName: string
    iconBackgroundClassName: string
}>

export function WishlistHero({
    savedCount,
    saleCount,
    lowStockCount,
    repurchaseCount,
    visual,
    continueShoppingHref = '/products',
}: WishlistHeroProps) {
    const stats: WishlistStat[] = [
        {
            label: 'Đã lưu',
            value: savedCount,
            suffix: 'sản phẩm',
            icon: Heart,
            iconClassName:
                'text-[#B72828]',
            iconBackgroundClassName:
                'bg-red-50',
        },
        {
            label: 'Đang giảm giá',
            value: saleCount,
            suffix: 'sản phẩm',
            icon: BadgePercent,
            iconClassName:
                'text-[#C95D4E]',
            iconBackgroundClassName:
                'bg-orange-50',
        },
        {
            label: 'Sắp hết hàng',
            value: lowStockCount,
            suffix: 'sản phẩm',
            icon: AlarmClock,
            iconClassName:
                'text-[#D17A35]',
            iconBackgroundClassName:
                'bg-amber-50',
        },
        {
            label: 'Có thể mua lại',
            value: repurchaseCount,
            suffix: 'sản phẩm',
            icon: RotateCcw,
            iconClassName:
                'text-[#8F5BA8]',
            iconBackgroundClassName:
                'bg-purple-50',
        },
    ]

    return (
        <section
            className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8"
            aria-labelledby="wishlist-hero-heading"
        >
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl border border-red-100/70 bg-gradient-to-br from-[#fff8f5] via-[#fff1ec] to-[#fce5df] shadow-[0_10px_35px_rgba(111,31,31,0.05)]">
                {/* Decorative background */}
                <div
                    aria-hidden="true"
                    className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#F6C6BD]/35 blur-3xl"
                />

                <div
                    aria-hidden="true"
                    className="absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-white/70 blur-3xl"
                />

                <div className="relative z-10 grid min-h-[270px] items-center gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1fr_0.95fr] md:px-10 md:py-10 lg:min-h-[300px] lg:px-12">
                    {/* CONTENT */}
                    <div className="max-w-xl">
                        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#B72828]/10 bg-white/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B72828] backdrop-blur-sm sm:text-[11px]">
                            <Heart
                                aria-hidden="true"
                                size={14}
                                fill="currentColor"
                            />

                            Danh sách của bạn
                        </span>

                        <h1
                            id="wishlist-hero-heading"
                            className="font-heading text-3xl font-semibold leading-tight tracking-[-0.025em] text-[#B72828] sm:text-4xl lg:text-5xl"
                        >
                            Sản phẩm yêu thích
                        </h1>

                        <p className="mt-4 max-w-lg text-sm font-normal leading-7 text-neutral-600 sm:text-base">
                            Lưu lại những sản phẩm mỹ phẩm,
                            nước hoa và thực phẩm chăm sóc sức
                            khỏe bạn yêu thích để dễ dàng mua
                            sắm sau này.
                        </p>

                        <Link
                            href={continueShoppingHref}
                            className="group mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B72828] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(183,40,40,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#951F1F] hover:shadow-[0_12px_28px_rgba(183,40,40,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
                        >
                            <ShoppingBag
                                aria-hidden="true"
                                size={17}
                                className="transition-transform duration-300 group-hover:-rotate-6"
                            />

                            Tiếp tục mua sắm
                        </Link>
                    </div>

                    {/* VISUAL / PLACEHOLDER */}
                    <div className="relative hidden min-h-[220px] items-center justify-center md:flex">
                        {visual ?? (
                            <div className="relative flex h-[220px] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 backdrop-blur-sm">
                                <div
                                    aria-hidden="true"
                                    className="absolute h-40 w-40 rounded-full border border-red-200/60"
                                />

                                <div
                                    aria-hidden="true"
                                    className="absolute h-28 w-28 rounded-full bg-red-100/60 blur-xl"
                                />

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#B72828] shadow-sm">
                                        <Heart
                                            aria-hidden="true"
                                            size={30}
                                            strokeWidth={1.7}
                                            fill="currentColor"
                                        />
                                    </span>

                                    <p className="mt-4 text-xs font-medium text-neutral-500">
                                        Khu vực hình ảnh sản phẩm
                                    </p>

                                    <p className="mt-1 text-[11px] text-neutral-400">
                                        Tỷ lệ gợi ý 4:3 hoặc PNG nền trong suốt
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* STATS ROW */}
            <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-4 md:gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon

                    return (
                        <div
                            key={stat.label}
                            className="flex min-h-[104px] items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-red-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.055)] sm:gap-4 sm:px-5"
                        >
                            <div
                                className={[
                                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12',
                                    stat.iconBackgroundClassName,
                                    stat.iconClassName,
                                ].join(' ')}
                            >
                                <Icon
                                    aria-hidden="true"
                                    size={22}
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-neutral-500 sm:text-xs">
                                    {stat.label}
                                </p>

                                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                                    <strong className="text-xl font-semibold leading-none text-[#B72828] sm:text-2xl">
                                        {stat.value.toLocaleString(
                                            'vi-VN',
                                        )}
                                    </strong>

                                    <span className="text-[10px] font-normal text-neutral-400 sm:text-[11px]">
                                        {stat.suffix}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}