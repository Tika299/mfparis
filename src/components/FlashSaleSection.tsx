import type { ProductCardProduct } from '@/components/ProductCard'
import Link from 'next/link'
import {
    ChevronRight,
    Zap,
} from 'lucide-react'

import type { Voucher } from '@/payload-types'
import { FlashSaleCountdown } from '@/components/FlashSaleCountdown'
import { FlashSaleProductsCarouselClient } from '@/components/FlashSaleProductsCarouselClient'

type VoucherRelationship =
    | number
    | Voucher
    | null
    | undefined

type FlashSaleVoucherDTO =
    Readonly<{
        id: Voucher['id']
        code: string
        title: string
        value: string
        sub: string
    }>

type FlashSaleSectionProps =
    Readonly<{
        products: ProductCardProduct[]
        endTime: string
        vouchers?:
        | VoucherRelationship[]
        | null
        viewAllHref?: string
    }>

/* =========================================================
   VOUCHER HELPERS
   Chuyển nguyên logic từ HomePage vào đây.
========================================================= */

function isPopulatedVoucher(
    value: VoucherRelationship,
): value is Voucher {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function formatCompactVND(
    amount: number,
): string {
    if (amount >= 1_000_000) {
        return `${(
            amount / 1_000_000
        ).toLocaleString('vi-VN', {
            maximumFractionDigits: 1,
        })} TR`
    }

    if (amount >= 1_000) {
        return `${(
            amount / 1_000
        ).toLocaleString('vi-VN', {
            maximumFractionDigits: 0,
        })} K`
    }

    return `${amount.toLocaleString(
        'vi-VN',
    )} Đ`
}

function isVoucherAvailable(
    voucher: Voucher,
    currentTime: number,
): boolean {
    if (voucher.status !== 'active') {
        return false
    }

    if (voucher.startsAt) {
        const startsAt =
            new Date(
                voucher.startsAt,
            ).getTime()

        if (
            Number.isFinite(startsAt) &&
            startsAt > currentTime
        ) {
            return false
        }
    }

    if (voucher.endsAt) {
        const endsAt =
            new Date(
                voucher.endsAt,
            ).getTime()

        if (
            Number.isFinite(endsAt) &&
            endsAt <= currentTime
        ) {
            return false
        }
    }

    const usageLimit = Number(
        voucher.usageLimit ?? 0,
    )

    const usedCount = Number(
        voucher.usedCount ?? 0,
    )

    if (
        usageLimit > 0 &&
        usedCount >= usageLimit
    ) {
        return false
    }

    return true
}

function toFlashSaleVoucherDTO(
    voucher: Voucher,
): FlashSaleVoucherDTO | null {
    const code = voucher.code
        ?.trim()
        .toUpperCase()

    const discountValue = Number(
        voucher.value ?? 0,
    )

    if (
        !code ||
        !Number.isFinite(
            discountValue,
        ) ||
        discountValue <= 0
    ) {
        return null
    }

    const value =
        voucher.type === 'percent'
            ? `${discountValue.toLocaleString(
                'vi-VN',
            )}%`
            : formatCompactVND(
                discountValue,
            )

    const minimumOrderAmount =
        Number(
            voucher.minOrderAmount ?? 0,
        )

    const maximumDiscountAmount =
        Number(
            voucher.maxDiscountAmount ??
            0,
        )

    let sub =
        minimumOrderAmount > 0
            ? `Đơn từ ${formatCompactVND(
                minimumOrderAmount,
            )}`
            : 'Không yêu cầu đơn tối thiểu'

    if (
        voucher.type === 'percent' &&
        maximumDiscountAmount > 0
    ) {
        sub += ` · Tối đa ${formatCompactVND(
            maximumDiscountAmount,
        )}`
    }

    return {
        id: voucher.id,
        code,

        title:
            voucher.title?.trim() ||
            'Voucher',

        value,
        sub,
    }
}

/* =========================================================
   FLASH SALE SECTION
========================================================= */

export function FlashSaleSection({
    products,
    endTime,
    vouchers = [],
    viewAllHref = '/products',
}: FlashSaleSectionProps) {
    if (!products?.length) {
        return null
    }

    const currentTime = Date.now()

    const availableVouchers =
        (vouchers ?? [])
            .filter(isPopulatedVoucher)
            .filter((voucher) =>
                isVoucherAvailable(
                    voucher,
                    currentTime,
                ),
            )
            .map(toFlashSaleVoucherDTO)
            .filter(
                (
                    voucher,
                ): voucher is FlashSaleVoucherDTO =>
                    voucher !== null,
            )
            .slice(0, 4)

    /**
     * Banner lớn sử dụng voucher đầu tiên.
     */
    const primaryVoucher =
        availableVouchers[0] ?? null

    /**
     * Dòng ưu đãi bổ sung sử dụng voucher thứ hai.
     * Ví dụ: "+ Giảm thêm 100K".
     */
    const secondaryVoucher =
        availableVouchers[1] ?? null

    const displayedProducts = products

    return (
        <section className="container-ux mt-6 md:mt-8 lg:mt-10">
            <div className="overflow-hidden rounded-[16px] border border-[#e8e8e8] bg-white px-3 pb-3 pt-4 shadow-[0_6px_24px_rgba(0,0,0,0.035)] sm:rounded-[20px] sm:px-4 sm:pb-4 sm:pt-5 lg:rounded-[22px] lg:px-6 lg:pb-6 lg:pt-6">
                {/* =================================================
                        HEADER
                    ================================================== */}
                <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Zap
                                aria-hidden="true"
                                size={38}
                                strokeWidth={2.2}
                                fill="currentColor"
                                className="shrink-0 text-[#b40008]"
                            />

                            <h2 className="font-heading text-[30px] font-bold uppercase leading-none tracking-[-0.025em] text-[#b40008] sm:text-[36px] lg:text-[38px]">
                                Flash Sale
                            </h2>
                        </div>

                        <p className="mt-3 text-[14px] font-medium leading-5 text-[#555555] sm:text-[15px]">
                            Ưu đãi chớp nhoáng – Săn ngay kẻo lỡ!
                        </p>
                    </div>

                    <FlashSaleCountdown
                        endTime={endTime}
                    />

                    <Link
                        href={viewAllHref}
                        className="inline-flex min-h-[50px] w-fit items-center justify-center gap-3 rounded-[13px] bg-[#be0008] px-6 text-[14px] font-bold text-white shadow-[0_7px_18px_rgba(190,0,8,0.18)] transition-colors hover:bg-[#980007] lg:min-w-[132px]"
                    >
                        <span>Xem tất cả</span>

                        <ChevronRight
                            aria-hidden="true"
                            size={18}
                            strokeWidth={2.3}
                        />
                    </Link>
                </div>

                {/* =================================================
            VOUCHER + SẢN PHẨM
        ================================================== */}
                <div className="grid items-stretch gap-2.5 md:gap-3 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="order-2 min-w-0 lg:order-1">
                        <PaydayPromotionCard
                            primaryVoucher={primaryVoucher}
                            secondaryVoucher={secondaryVoucher}
                        />
                    </div>

                    <div className="order-1 min-w-0 w-full lg:order-2">
                        <FlashSaleProductsCarouselClient
                            products={displayedProducts}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

/* =========================================================
   PROMOTION CARD
========================================================= */

function PaydayPromotionCard({
    primaryVoucher,
    secondaryVoucher,
}: Readonly<{
    primaryVoucher:
    | FlashSaleVoucherDTO
    | null
    secondaryVoucher:
    | FlashSaleVoucherDTO
    | null
}>) {
    if (!primaryVoucher) {
        return (
            <div className="flex min-h-[170px] items-center justify-center rounded-[16px] bg-[linear-gradient(145deg,#8f0000_0%,#bd0008_46%,#d2050d_100%)] px-4 text-center text-white sm:min-h-[210px] sm:rounded-[18px] lg:min-h-[410px] lg:rounded-[20px]">
                <div>
                    <Zap
                        size={34}
                        fill="currentColor"
                        className="mx-auto text-[#ffdc76] sm:h-10 sm:w-10 lg:h-[42px] lg:w-[42px]"
                    />

                    <p className="mt-3 text-[18px] font-bold uppercase sm:text-[20px] lg:mt-4 lg:text-[21px]">
                        Flash Sale
                    </p>

                    <p className="mt-2 text-[12px] text-white/80 sm:text-[13px] lg:text-sm">
                        Voucher mới sẽ sớm được cập nhật
                    </p>
                </div>
            </div>
        )
    }

    return (
        <Link
            href="/vouchers"
            className="group relative flex min-h-[185px] flex-col justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(145deg,#8f0000_0%,#bd0008_46%,#d2050d_100%)] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:min-h-[230px] sm:rounded-[18px] sm:px-5 sm:py-5 lg:min-h-[410px] lg:rounded-[20px] lg:px-6 lg:py-6"
            aria-label={`Xem voucher ${primaryVoucher.code}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,220,118,0.12),transparent_26%)]" />

            <div className="relative z-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffd66f] sm:text-[12px]">
                    Flash Voucher
                </p>

                <h3 className="mt-2 line-clamp-2 text-[18px] font-semibold uppercase leading-tight sm:text-[20px] lg:text-[24px]">
                    {primaryVoucher.title}
                </h3>

                <p className="mt-4 text-[12px] text-white/85 sm:text-[13px] lg:text-[15px]">
                    Sale thêm đến
                </p>

                <p className="mt-1 font-heading text-[40px] font-bold italic leading-none text-[#ffdc76] sm:text-[48px] lg:text-[64px]">
                    {primaryVoucher.value}
                </p>

                <p className="mt-3 line-clamp-2 max-w-[240px] text-[12px] text-white/90 sm:text-[13px] lg:max-w-none lg:text-[15px]">
                    {primaryVoucher.sub}
                </p>

                {secondaryVoucher ? (
                    <div className="mt-4 rounded-[12px] border border-white/12 bg-white/8 px-3 py-2 backdrop-blur-[2px] lg:mt-5">
                        <p className="line-clamp-1 text-[12px] font-bold text-[#ffe189] lg:text-[14px]">
                            + Giảm thêm {secondaryVoucher.value}
                        </p>

                        <p className="mt-1 line-clamp-2 text-[11px] text-white/85 lg:text-[13px]">
                            {secondaryVoucher.sub}
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="relative z-10 mt-5 flex items-center justify-between rounded-[12px] bg-white px-3 py-3 text-[#b40008] shadow-[0_8px_20px_rgba(78,0,0,0.18)] sm:px-4 lg:mt-6">
                <div className="min-w-0">
                    <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#777777] sm:text-[10px]">
                        Nhập mã
                    </p>

                    <p className="mt-1 truncate text-[13px] font-bold uppercase tracking-[0.14em] sm:text-[14px] lg:text-[15px]">
                        {primaryVoucher.code}
                    </p>
                </div>

                <ChevronRight
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-[#d39b9b]"
                />
            </div>
        </Link>
    )
}