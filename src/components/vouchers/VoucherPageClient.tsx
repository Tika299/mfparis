'use client'

import { useMemo, useState } from 'react'
import {
    BadgePercent,
    CircleDollarSign,
    Clock3,
    PackageOpen,
    Truck,
} from 'lucide-react'

import { VoucherHero } from '@/components/vouchers/VoucherHero'
import { VoucherCard } from '@/components/vouchers/VoucherCard'
import type { FrontendVoucherDTO } from '@/types/voucher'
import { cn } from '@/utilities'

type VoucherFilter =
    | 'all'
    | 'fixed'
    | 'percent'
    | 'freeship'
    | 'expiring'

type VoucherPageClientProps = Readonly<{
    vouchers: FrontendVoucherDTO[]
    referenceNow: string
}>

type FilterTab = Readonly<{
    value: VoucherFilter
    label: string
    icon: typeof PackageOpen
}>

const EXPIRING_SOON_DAYS = 7

const FILTER_TABS: FilterTab[] = [
    {
        value: 'all',
        label: 'Tất cả',
        icon: PackageOpen,
    },
    {
        value: 'fixed',
        label: 'Voucher giảm tiền',
        icon: CircleDollarSign,
    },
    {
        value: 'percent',
        label: 'Voucher %',
        icon: BadgePercent,
    },
    {
        value: 'freeship',
        label: 'Freeship',
        icon: Truck,
    },
    {
        value: 'expiring',
        label: 'Sắp hết hạn',
        icon: Clock3,
    },
]

function getSearchableVoucherText(
    voucher: FrontendVoucherDTO,
): string {
    return [
        voucher.code,
        voucher.normalizedCode,
        voucher.title,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
}

function isFreeshipVoucher(
    voucher: FrontendVoucherDTO,
): boolean {
    const searchableText =
        getSearchableVoucherText(voucher)

    return (
        searchableText.includes('freeship') ||
        searchableText.includes('free ship') ||
        searchableText.includes('miễn ship') ||
        searchableText.includes('vận chuyển')
    )
}

function isMemberVoucher(
    voucher: FrontendVoucherDTO,
): boolean {
    const searchableText =
        getSearchableVoucherText(voucher)

    return (
        searchableText.includes('member') ||
        searchableText.includes('thành viên') ||
        searchableText.includes('vip') ||
        searchableText.includes('sinh nhật')
    )
}

function isExpiringSoon(
    voucher: FrontendVoucherDTO,
    referenceTimestamp: number,
): boolean {
    if (
        voucher.availability !== 'available' ||
        !voucher.endsAt
    ) {
        return false
    }

    const endsAtTimestamp =
        new Date(voucher.endsAt).getTime()

    if (!Number.isFinite(endsAtTimestamp)) {
        return false
    }

    const remainingTime =
        endsAtTimestamp - referenceTimestamp

    const threshold =
        EXPIRING_SOON_DAYS *
        24 *
        60 *
        60 *
        1000

    return (
        remainingTime >= 0 &&
        remainingTime <= threshold
    )
}

export function VoucherPageClient({
    vouchers,
    referenceNow,
}: VoucherPageClientProps) {
    const [activeFilter, setActiveFilter] =
        useState<VoucherFilter>('all')

    /**
     * referenceNow được tạo ở Server Component
     * rồi truyền xuống dưới dạng string.
     * Không dùng Date.now() trong render để tránh
     * server/client cho kết quả khác nhau.
     */
    const referenceTimestamp = useMemo(
        () => new Date(referenceNow).getTime(),
        [referenceNow],
    )

    const filteredVouchers = useMemo(() => {
        switch (activeFilter) {
            case 'fixed':
                return vouchers.filter(
                    (voucher) =>
                        voucher.type === 'fixed' &&
                        !isFreeshipVoucher(voucher),
                )

            case 'percent':
                return vouchers.filter(
                    (voucher) =>
                        voucher.type === 'percent',
                )

            case 'freeship':
                return vouchers.filter(
                    isFreeshipVoucher,
                )

            case 'expiring':
                return vouchers.filter(
                    (voucher) =>
                        isExpiringSoon(
                            voucher,
                            referenceTimestamp,
                        ),
                )

            case 'all':
            default:
                return vouchers
        }
    }, [
        activeFilter,
        referenceTimestamp,
        vouchers,
    ])

    const stats = useMemo(() => {
        const availableVouchers =
            vouchers.filter(
                (voucher) =>
                    voucher.availability ===
                    'available',
            )

        return {
            total: availableVouchers.length,

            expiring:
                availableVouchers.filter(
                    (voucher) =>
                        isExpiringSoon(
                            voucher,
                            referenceTimestamp,
                        ),
                ).length,

            freeship:
                availableVouchers.filter(
                    isFreeshipVoucher,
                ).length,

            member:
                availableVouchers.filter(
                    isMemberVoucher,
                ).length,
        }
    }, [
        referenceTimestamp,
        vouchers,
    ])

    /**
     * Collection hiện chưa có field isFeatured.
     * Vì dữ liệu đã sort -createdAt từ server,
     * ba voucher khả dụng đầu tiên chính là
     * ba voucher mới nhất dùng cho khối nổi bật.
     */
    const featuredVouchers = useMemo(
        () =>
            vouchers
                .filter(
                    (voucher) =>
                        voucher.availability ===
                        'available',
                )
                .slice(0, 3),
        [vouchers],
    )

    return (
        <main className="pb-12 pt-5 md:pb-16 md:pt-7">
            <VoucherHero
                totalVouchers={stats.total}
                expiringSoonCount={stats.expiring}
                freeshipCount={stats.freeship}
                memberVoucherCount={stats.member}
                collectHref="#voucher-list"
            />

            <section
                id="voucher-list"
                className="container-ux mt-8 scroll-mt-36 md:mt-10"
                aria-labelledby="voucher-list-heading"
            >
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <span className="sub-heading">
                            Ưu đãi đang áp dụng
                        </span>

                        <h2
                            id="voucher-list-heading"
                            className="font-heading text-2xl font-semibold leading-tight text-neutral-950 md:text-3xl"
                        >
                            Tất cả voucher
                        </h2>
                    </div>

                    <p className="hidden text-sm text-neutral-500 sm:block">
                        {filteredVouchers.length.toLocaleString(
                            'vi-VN',
                        )}{' '}
                        voucher
                    </p>
                </div>

                <div className="sticky top-[112px] z-30 -mx-2 mb-6 overflow-x-auto border-y border-neutral-100 bg-[#f4f6f8]/95 px-2 py-3 backdrop-blur-md lg:top-[116px]">
                    <div
                        className="flex min-w-max items-center gap-2"
                        role="tablist"
                        aria-label="Bộ lọc voucher"
                    >
                        {FILTER_TABS.map((tab) => {
                            const Icon = tab.icon
                            const isActive =
                                activeFilter === tab.value

                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        setActiveFilter(tab.value)
                                    }}
                                    className={cn(
                                        'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
                                        isActive
                                            ? 'border-[#B72828] bg-[#B72828] text-white shadow-sm'
                                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#B72828]/30 hover:bg-red-50 hover:text-[#B72828]',
                                    )}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        size={15}
                                        strokeWidth={1.9}
                                    />

                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {filteredVouchers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredVouchers.map(
                            (voucher) => (
                                <VoucherCard
                                    key={voucher.id}
                                    voucher={voucher}
                                />
                            ),
                        )}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center">
                        <PackageOpen
                            aria-hidden="true"
                            size={34}
                            className="mx-auto text-neutral-300"
                        />

                        <p className="mt-4 text-sm font-semibold text-neutral-700">
                            Chưa có voucher phù hợp
                        </p>

                        <p className="mt-1 text-xs text-neutral-400">
                            Hãy thử chọn một nhóm ưu đãi khác.
                        </p>
                    </div>
                )}
            </section>

            {featuredVouchers.length > 0 ? (
                <section
                    className="container-ux mt-10 md:mt-12"
                    aria-labelledby="featured-vouchers-heading"
                >
                    <div className="overflow-hidden rounded-[2rem] border border-red-100/70 bg-gradient-to-br from-[#fffafa] via-white to-[#fff2f2] p-4 shadow-[0_8px_32px_rgba(122,25,25,0.05)] sm:p-6 md:rounded-[2.5rem] md:p-8">
                        <div className="mb-6">
                            <span className="sub-heading">
                                Ưu đãi chọn lọc
                            </span>

                            <h2
                                id="featured-vouchers-heading"
                                className="font-heading text-2xl font-semibold leading-tight text-neutral-950 md:text-3xl"
                            >
                                Voucher nổi bật hôm nay
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                                Ba ưu đãi mới và nổi bật nhất
                                đang khả dụng cho khách hàng.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {featuredVouchers.map(
                                (voucher) => (
                                    <VoucherCard
                                        key={voucher.id}
                                        voucher={voucher}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                </section>
            ) : null}
        </main>
    )
}
