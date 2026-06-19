import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
    ArrowRight,
    Clock3,
    Crown,
    TicketPercent,
    Truck,
} from 'lucide-react'

type VoucherHeroProps = Readonly<{
    totalVouchers: number
    expiringSoonCount: number
    freeshipCount: number
    memberVoucherCount: number
    collectHref?: string
}>

type VoucherStat = Readonly<{
    label: string
    value: number
    suffix: string
    icon: LucideIcon
    iconClassName: string
    iconBackgroundClassName: string
}>

export function VoucherHero({
    totalVouchers,
    expiringSoonCount,
    freeshipCount,
    memberVoucherCount,
    collectHref = '#voucher-list',
}: VoucherHeroProps) {
    const stats: VoucherStat[] = [
        {
            label: 'Voucher đang có',
            value: totalVouchers,
            suffix: 'voucher',
            icon: TicketPercent,
            iconClassName: 'text-[#B72828]',
            iconBackgroundClassName: 'bg-red-50',
        },
        {
            label: 'Sắp hết hạn',
            value: expiringSoonCount,
            suffix: 'voucher',
            icon: Clock3,
            iconClassName: 'text-[#C97932]',
            iconBackgroundClassName: 'bg-orange-50',
        },
        {
            label: 'Freeship',
            value: freeshipCount,
            suffix: 'voucher',
            icon: Truck,
            iconClassName: 'text-[#4F9B68]',
            iconBackgroundClassName: 'bg-emerald-50',
        },
        {
            label: 'Ưu đãi thành viên',
            value: memberVoucherCount,
            suffix: 'voucher',
            icon: Crown,
            iconClassName: 'text-[#8B5CB5]',
            iconBackgroundClassName: 'bg-purple-50',
        },
    ]

    return (
        <section
            className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8"
            aria-labelledby="voucher-hero-heading"
        >
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-3xl border border-red-100/70 bg-gradient-to-br from-[#fffafa] via-[#fff3f3] to-[#f9e7e7] px-5 py-8 shadow-[0_10px_40px_rgba(111,31,31,0.06)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
                {/* Decorative background */}
                <div
                    aria-hidden="true"
                    className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#B72828]/10 blur-3xl"
                />

                <div
                    aria-hidden="true"
                    className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/80 blur-3xl"
                />

                <div className="relative z-10 max-w-2xl">
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#B72828]/10 bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B72828] backdrop-blur-sm sm:text-[11px]">
                        <TicketPercent
                            aria-hidden="true"
                            size={14}
                        />
                        Ưu đãi dành riêng cho bạn
                    </span>

                    <h1
                        id="voucher-hero-heading"
                        className="font-heading text-3xl font-semibold leading-tight tracking-[-0.025em] text-neutral-950 sm:text-4xl lg:text-5xl"
                    >
                        Kho voucher ưu đãi
                    </h1>

                    <p className="mt-4 max-w-xl text-sm font-normal leading-7 text-neutral-600 sm:text-base">
                        Sưu tầm voucher dành cho mỹ phẩm, nước hoa và sản
                        phẩm chăm sóc sức khỏe chính hãng tại Marais de
                        France.
                    </p>

                    <Link
                        href={collectHref}
                        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#A91F24] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(169,31,36,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8F181D] hover:shadow-[0_12px_28px_rgba(169,31,36,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
                    >
                        Sưu tầm ngay

                        <ArrowRight
                            aria-hidden="true"
                            size={17}
                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                    </Link>
                </div>
            </div>

            {/* Statistics */}
            <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-4 md:gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon

                    return (
                        <div
                            key={stat.label}
                            className="flex min-h-[104px] items-center gap-3 rounded-xl border border-neutral-100 bg-white px-4 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-red-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.055)] sm:gap-4 sm:px-5"
                        >
                            <div
                                className={[
                                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12',
                                    stat.iconBackgroundClassName,
                                    stat.iconClassName,
                                ].join(' ')}
                            >
                                <Icon
                                    aria-hidden="true"
                                    size={21}
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-neutral-500 sm:text-xs">
                                    {stat.label}
                                </p>

                                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                                    <strong className="text-xl font-semibold leading-none text-neutral-950 sm:text-2xl">
                                        {stat.value.toLocaleString('vi-VN')}
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