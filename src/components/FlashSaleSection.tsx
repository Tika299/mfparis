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
    /**
     * Không có voucher khả dụng:
     * Vẫn giữ layout nhưng thông báo chưa có ưu đãi.
     */
    if (!primaryVoucher) {
        return (
            <div className="flex min-h-[170px] items-center justify-center rounded-[16px] bg-[linear-gradient(145deg,#8f0000_0%,#bd0008_46%,#d2050d_100%)] px-4 text-center text-white sm:min-h-[210px] sm:rounded-[18px] lg:min-h-[410px] lg:rounded-[20px]">
                <div>
                    <Zap
                        size={42}
                        fill="currentColor"
                        className="mx-auto text-[#ffdc76]"
                    />

                    <p className="mt-4 text-[21px] font-bold uppercase">
                        Flash Sale
                    </p>

                    <p className="mt-2 text-sm text-white/80">
                        Voucher mới sẽ sớm được cập nhật
                    </p>
                </div>
            </div>
        )
    }

    return (
        <Link
            href="/vouchers"
            className="group relative min-h-[185px] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_90%_18%,rgba(255,50,50,0.65),transparent_35%),linear-gradient(145deg,#8f0000_0%,#bd0008_46%,#d2050d_100%)] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:min-h-[230px] sm:rounded-[18px] sm:px-5 sm:py-5 lg:min-h-[410px] lg:rounded-[20px] lg:px-6 lg:py-7"
            aria-label={`Xem voucher ${primaryVoucher.code}`}
        >
            {/* Nền sáng */}
            <div className="pointer-events-none absolute -right-16 -top-14 h-52 w-52 rounded-full bg-red-400/20 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[#720000]/70 blur-3xl" />

            {/* Đường trang trí vàng */}
            <svg
                aria-hidden="true"
                viewBox="0 0 180 120"
                className="pointer-events-none absolute right-2 top-[70px] h-[120px] w-[180px] opacity-90"
                fill="none"
            >
                <path
                    d="M8 102C18 54 58 24 91 40C112 51 115 12 145 17C164 20 176 38 169 61"
                    stroke="#d8ab3b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />

                <circle
                    cx="91"
                    cy="40"
                    r="2.5"
                    fill="#d8ab3b"
                />
            </svg>

            {/* Nội dung voucher chính */}
            <div className="relative z-10">
                <h3 className="line-clamp-1 text-[25px] font-medium uppercase leading-none tracking-[-0.02em] sm:text-[27px] pt-2">
                    {primaryVoucher.title}
                </h3>

                <p className="mt-5 text-[16px] font-normal">
                    Sale thêm đến
                </p>

                <p className="mt-1 font-heading text-[66px] font-bold italic leading-none text-[#ffdc76] drop-shadow-sm">
                    {primaryVoucher.value}
                </p>

                <p className="mt-3 line-clamp-2 text-[15px] font-normal">
                    {primaryVoucher.sub}
                </p>

                {secondaryVoucher ? (
                    <>
                        <div className="my-5 h-px w-[72%] bg-gradient-to-r from-[#ffd879] via-[#ffd879]/80 to-transparent" />

                        <p className="line-clamp-1 text-[16px] font-bold text-[#ffe189]">
                            + Giảm thêm{' '}
                            {secondaryVoucher.value}
                        </p>

                        <p className="mt-3 line-clamp-2 text-[15px]">
                            {secondaryVoucher.sub}
                        </p>
                    </>
                ) : null}
            </div>

            <GiftArtwork />

            {/* Mã voucher */}
            <div className="absolute bottom-7 left-6 z-20 flex min-h-[56px] w-[74%] items-center justify-between rounded-[11px] bg-white px-4 py-2.5 text-[#b40008] shadow-[0_8px_20px_rgba(78,0,0,0.18)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <div className="min-w-0">
                    <p className="text-[10px] font-medium text-[#777777]">
                        Nhập mã
                    </p>

                    <p className="mt-1 truncate text-[15px] font-bold uppercase tracking-[0.18em]">
                        {primaryVoucher.code}
                    </p>
                </div>

                <ChevronRight
                    aria-hidden="true"
                    size={17}
                    className="shrink-0 text-[#d39b9b]"
                />
            </div>
        </Link>
    )
}

/* =========================================================
   GIFT ARTWORK
========================================================= */

function GiftArtwork() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-[-11px] z-10 h-[185px] w-[180px]"
        >
            <div className="absolute bottom-[-15px] right-1 h-14 w-40 rounded-full bg-[#620000]/45 blur-xl" />

            <div className="absolute bottom-0 right-0 h-[112px] w-[145px] rounded-t-[3px] bg-[linear-gradient(135deg,#ed1119_0%,#b10007_48%,#f12028_100%)] shadow-[-12px_14px_25px_rgba(77,0,0,0.35)]">
                <div className="absolute left-[57px] top-0 h-full w-[25px] bg-[linear-gradient(90deg,#c89224,#ffe591,#b47a13)]" />

                <div className="absolute left-0 top-[27px] h-[25px] w-full bg-[linear-gradient(180deg,#f4d467,#b37814,#f7dc75)]" />
            </div>

            <div className="absolute bottom-[102px] right-[-4px] h-[28px] w-[153px] rotate-[-2deg] rounded-[3px] bg-[linear-gradient(180deg,#ff2930,#b30008)] shadow-[0_6px_12px_rgba(77,0,0,0.3)]">
                <div className="absolute left-[61px] top-0 h-full w-[26px] bg-[linear-gradient(90deg,#c28b20,#ffe68c,#ad7110)]" />
            </div>

            <div className="absolute bottom-[124px] right-[75px] h-[48px] w-[66px] rotate-[17deg] rounded-[50%_50%_45%_55%] border-[8px] border-[#e2b53f] border-r-[#ffea8e]" />

            <div className="absolute bottom-[123px] right-[23px] h-[47px] w-[65px] rotate-[-18deg] rounded-[50%_50%_55%_45%] border-[8px] border-[#e2b53f] border-l-[#ffea8e]" />

            <div className="absolute bottom-[121px] right-[70px] h-[30px] w-[34px] rotate-[-4deg] rounded-[45%] bg-[radial-gradient(circle_at_35%_30%,#fff1a6,#ca8e18_72%)] shadow-md" />
        </div>
    )
}