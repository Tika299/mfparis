'use client'

import {
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
} from 'react'
import Link from 'next/link'
import {
    Check,
    Copy,
    Crown,
    Info,
    TicketPercent,
    Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FrontendVoucherDTO } from '@/types/voucher'
import { cn } from '@/utilities'

type VoucherCardProps = Readonly<{
    voucher: FrontendVoucherDTO
    detailsHref?: string
}>

type VoucherTheme = Readonly<{
    backgroundClassName: string
    textClassName: string
    icon: typeof TicketPercent
    label: string
}>

const SAVED_VOUCHERS_STORAGE_KEY =
    'mf-paris-saved-vouchers'

function normalizeVoucherKey(
    voucher: FrontendVoucherDTO,
): string {
    return (
        voucher.normalizedCode ||
        voucher.code ||
        String(voucher.id)
    )
        .trim()
        .toUpperCase()
}

function readSavedVoucherCodes(): string[] {
    if (typeof window === 'undefined') {
        return []
    }

    try {
        const storedValue =
            window.localStorage.getItem(
                SAVED_VOUCHERS_STORAGE_KEY,
            )

        if (!storedValue) {
            return []
        }

        const parsedValue: unknown =
            JSON.parse(storedValue)

        if (!Array.isArray(parsedValue)) {
            return []
        }

        return parsedValue.filter(
            (item): item is string =>
                typeof item === 'string',
        )
    } catch {
        return []
    }
}

function saveVoucherCode(
    voucherCode: string,
): void {
    const savedCodes =
        readSavedVoucherCodes()

    if (savedCodes.includes(voucherCode)) {
        return
    }

    window.localStorage.setItem(
        SAVED_VOUCHERS_STORAGE_KEY,
        JSON.stringify([
            ...savedCodes,
            voucherCode,
        ]),
    )
}

function formatCompactMoney(
    value: number,
): string {
    if (!Number.isFinite(value)) {
        return '0'
    }

    if (value >= 1_000_000) {
        const millionValue =
            value / 1_000_000

        return Number.isInteger(millionValue)
            ? `${millionValue}TR`
            : `${millionValue
                .toFixed(1)
                .replace('.', ',')}TR`
    }

    if (value >= 1_000) {
        return `${Math.round(
            value / 1_000,
        )}K`
    }

    return String(value)
}

function getVoucherTheme(
    voucher: FrontendVoucherDTO,
): VoucherTheme {
    const searchableText = [
        voucher.code,
        voucher.normalizedCode,
        voucher.title,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

    const isFreeship =
        searchableText.includes('freeship') ||
        searchableText.includes('free ship') ||
        searchableText.includes('miễn ship') ||
        searchableText.includes('vận chuyển')

    if (isFreeship) {
        return {
            backgroundClassName:
                'bg-gradient-to-br from-[#3D9B59] to-[#62B979]',
            textClassName: 'text-white',
            icon: Truck,
            label: 'MIỄN SHIP',
        }
    }

    const isMemberVoucher =
        searchableText.includes('member') ||
        searchableText.includes('thành viên') ||
        searchableText.includes('vip') ||
        searchableText.includes('sinh nhật')

    if (isMemberVoucher) {
        return {
            backgroundClassName:
                'bg-gradient-to-br from-[#7D50A7] to-[#A77ACD]',
            textClassName: 'text-white',
            icon: Crown,
            label: 'THÀNH VIÊN',
        }
    }

    if (voucher.type === 'percent') {
        return {
            backgroundClassName:
                'bg-gradient-to-br from-[#D56A35] to-[#EE8A55]',
            textClassName: 'text-white',
            icon: TicketPercent,
            label: `${voucher.value}% GIẢM`,
        }
    }

    return {
        backgroundClassName:
            'bg-gradient-to-br from-[#A91F24] to-[#CF3B40]',
        textClassName: 'text-white',
        icon: TicketPercent,
        label: `${formatCompactMoney(
            voucher.value,
        )} GIẢM TIỀN`,
    }
}

export function VoucherCard({
    voucher,
    detailsHref,
}: VoucherCardProps) {
    const [hasMounted, setHasMounted] =
        useState(false)

    const [isSaved, setIsSaved] =
        useState(false)

    const voucherKey =
        normalizeVoucherKey(voucher)

    const theme = useMemo(
        () => getVoucherTheme(voucher),
        [voucher],
    )

    const ThemeIcon = theme.icon

    const usageLimit = Number(
        voucher.usageLimit ?? 0,
    )

    const usedCount = Number(
        voucher.usedCount ?? 0,
    )

    const isDepleted =
        usageLimit > 0 &&
        usedCount >= usageLimit

    /**
     * Draft cũng không nên cho khách lưu,
     * dù yêu cầu chính chỉ nhắc inactive.
     */
    const isUnavailable =
        voucher.status !== 'active' ||
        isDepleted

    const isSaveDisabled =
        !hasMounted ||
        isUnavailable ||
        isSaved

    useEffect(() => {
        setHasMounted(true)

        const savedVoucherCodes =
            readSavedVoucherCodes()

        setIsSaved(
            savedVoucherCodes.includes(
                voucherKey,
            ),
        )
    }, [voucherKey])

    const handleCopyCode = async (
        event: MouseEvent<HTMLButtonElement>,
    ): Promise<void> => {
        event.preventDefault()
        event.stopPropagation()

        try {
            await navigator.clipboard.writeText(
                voucher.normalizedCode,
            )

            toast.success(
                `Đã sao chép mã ${voucher.normalizedCode}`,
            )
        } catch {
            toast.error(
                'Không thể sao chép mã voucher.',
            )
        }
    }

    const handleSaveVoucher = (): void => {
        if (
            !hasMounted ||
            isUnavailable ||
            isSaved
        ) {
            return
        }

        saveVoucherCode(voucherKey)
        setIsSaved(true)

        toast.success(
            `Đã lưu voucher ${voucher.normalizedCode}`,
        )
    }

    const saveButtonLabel = isDepleted
        ? 'Hết lượt'
        : voucher.status !== 'active'
            ? 'Không khả dụng'
            : isSaved
                ? 'Đã lưu'
                : 'Lưu voucher'

    const applicationText =
        voucher.type === 'percent' &&
            Number(
                voucher.maxDiscountAmount ?? 0,
            ) > 0
            ? `Giảm tối đa ${voucher.display.maxDiscountAmount}`
            : 'Theo điều kiện chương trình'

    return (
        <article
            className={cn(
                'grid min-h-[190px] grid-cols-[1fr_3fr] overflow-hidden rounded-2xl border border-neutral-100 bg-white',
                'shadow-[0_4px_18px_rgba(0,0,0,0.035)] transition-all duration-300',
                'hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.065)]',
                isUnavailable &&
                'opacity-60 hover:translate-y-0 hover:shadow-[0_4px_18px_rgba(0,0,0,0.035)]',
            )}
        >
            {/* Phần màu bên trái */}
            <div
                className={cn(
                    'relative flex min-w-0 flex-col items-center justify-center px-3 py-5 text-center',
                    theme.backgroundClassName,
                    theme.textClassName,
                )}
            >
                <ThemeIcon
                    aria-hidden="true"
                    size={25}
                    strokeWidth={1.8}
                    className="mb-3 opacity-90"
                />

                <strong className="max-w-full text-[17px] font-black leading-tight tracking-tight sm:text-xl">
                    {theme.label}
                </strong>

                <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    Marais de France
                </span>

                {/* Hai nửa hình tròn tạo cảm giác vé */}
                <span
                    aria-hidden="true"
                    className="absolute -right-2 top-[-8px] h-4 w-4 rounded-full bg-white"
                />

                <span
                    aria-hidden="true"
                    className="absolute -right-2 bottom-[-8px] h-4 w-4 rounded-full bg-white"
                />
            </div>

            {/* Nội dung bên phải */}
            <div className="flex min-w-0 flex-col border-l border-dashed border-neutral-200 px-4 py-4 sm:px-5">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-neutral-950 sm:text-[15px]">
                    {voucher.title ||
                        voucher.display.discountLabel}
                </h3>

                {/* Mã voucher */}
                <div className="mt-2 flex min-w-0 items-center gap-2">
                    <span className="text-[11px] text-neutral-500">
                        Mã:
                    </span>

                    <strong className="truncate font-mono text-[11px] font-bold uppercase tracking-wide text-neutral-800 sm:text-xs">
                        {voucher.normalizedCode}
                    </strong>

                    <button
                        type="button"
                        onClick={(event) => {
                            void handleCopyCode(event)
                        }}
                        aria-label={`Sao chép mã ${voucher.normalizedCode}`}
                        title="Sao chép mã"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-[#B72828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828]"
                    >
                        <Copy
                            aria-hidden="true"
                            size={14}
                        />
                    </button>
                </div>

                {/* Điều kiện */}
                <ul className="mt-3 space-y-1.5 text-[10px] leading-4 text-neutral-600 sm:text-[11px]">
                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-neutral-400"
                        />

                        <span>
                            Đơn tối thiểu:{' '}
                            <strong className="font-medium text-neutral-800">
                                {voucher.display.minOrderAmount}
                            </strong>
                        </span>
                    </li>

                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-neutral-400"
                        />

                        <span>
                            Áp dụng:{' '}
                            <strong className="font-medium text-neutral-800">
                                {applicationText}
                            </strong>
                        </span>
                    </li>

                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-neutral-400"
                        />

                        <span>
                            HSD:{' '}
                            <strong className="font-medium text-neutral-800">
                                {voucher.display.endsAt}
                            </strong>
                        </span>
                    </li>
                </ul>

                {/* Trạng thái hết lượt */}
                {isDepleted ? (
                    <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[9px] font-semibold text-[#B72828]">
                        <Info
                            aria-hidden="true"
                            size={11}
                        />
                        Voucher đã hết lượt
                    </div>
                ) : null}

                {/* Actions */}
                <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4">
                    <button
                        type="button"
                        onClick={handleSaveVoucher}
                        disabled={isSaveDisabled}
                        className={cn(
                            'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
                            isSaved
                                ? 'bg-emerald-50 text-emerald-700'
                                : isUnavailable
                                    ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                                    : 'bg-[#B72828] text-white hover:bg-[#951F1F]',
                        )}
                    >
                        {isSaved ? (
                            <Check
                                aria-hidden="true"
                                size={14}
                            />
                        ) : null}

                        {saveButtonLabel}
                    </button>

                    <Link
                        href={
                            detailsHref ??
                            `/vouchers/${voucher.id}`
                        }
                        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-[#B72828]/30 hover:bg-red-50 hover:text-[#B72828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
                    >
                        Chi tiết
                    </Link>
                </div>
            </div>
        </article>
    )
}