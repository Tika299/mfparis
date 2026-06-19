/**
 * Loại voucher tương ứng với field `type`
 * trong Payload Collection.
 */
export type VoucherType =
    | 'fixed'
    | 'percent'

/**
 * Trạng thái quản trị của voucher.
 *
 * Lưu ý:
 * `active` không nhất thiết đồng nghĩa voucher còn hạn.
 * Muốn biết khả dụng thực tế còn phải kiểm tra:
 * - isPublic
 * - startsAt
 * - endsAt
 * - usageLimit / usedCount
 */
export type VoucherStatus =
    | 'active'
    | 'inactive'
    | 'draft'

/**
 * Trạng thái hiển thị trên frontend.
 *
 * Đây là trạng thái tính toán, không phải field
 * được lưu trực tiếp trong Payload.
 */
export type VoucherAvailability =
    | 'available'
    | 'upcoming'
    | 'expired'
    | 'depleted'
    | 'unavailable'

/**
 * Dữ liệu Voucher thô nhận từ Payload CMS.
 */
export interface Voucher {
    id: number

    code: string
    title?: string | null

    status: VoucherStatus
    isPublic: boolean

    type: VoucherType
    value: number

    minOrderAmount?: number | null
    maxDiscountAmount?: number | null

    startsAt?: string | null
    endsAt?: string | null

    /**
     * 0 = không giới hạn.
     */
    usageLimit?: number | null

    /**
     * 0 = không giới hạn mỗi khách hàng.
     */
    usageLimitPerCustomer?: number | null

    usedCount?: number | null

    /**
     * Payload tự sinh hai field này
     * nếu collection không tắt timestamps.
     */
    createdAt?: string
    updatedAt?: string
}

/**
 * Các giá trị đã format sẵn để component
 * không phải xử lý tiền và ngày nhiều lần.
 */
export interface VoucherDisplayData {
    /**
     * Ví dụ:
     * - 50.000 ₫
     * - 10%
     */
    discountValue: string

    /**
     * Ví dụ:
     * - Giảm 50.000 ₫
     * - Giảm 10%
     */
    discountLabel: string

    /**
     * Ví dụ:
     * - Không yêu cầu
     * - 299.000 ₫
     */
    minOrderAmount: string

    /**
     * Ví dụ:
     * - Không giới hạn
     * - 70.000 ₫
     */
    maxDiscountAmount: string

    /**
     * DD/MM/YYYY hoặc dấu gạch ngang.
     */
    startsAt: string
    endsAt: string

    /**
     * Ví dụ:
     * 01/06/2026 - 30/06/2026
     */
    validity: string

    /**
     * Ví dụ:
     * - Không giới hạn lượt dùng
     * - Còn 25/100 lượt
     */
    usage: string

    /**
     * Ví dụ:
     * - Mỗi khách hàng dùng 1 lần
     * - Không giới hạn mỗi khách hàng
     */
    usagePerCustomer: string

    /**
     * Nhãn trạng thái hiển thị.
     */
    availabilityLabel: string
}

/**
 * DTO dùng trực tiếp cho VoucherCard,
 * danh sách voucher và phần voucher nổi bật.
 */
export interface FrontendVoucherDTO
    extends Voucher {
    normalizedCode: string

    /**
     * null nghĩa là voucher không giới hạn tổng lượt.
     */
    remainingUses: number | null

    availability: VoucherAvailability

    display: VoucherDisplayData
}

const VND_FORMATTER =
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    })

const DATE_FORMATTER =
    new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })

/**
 * Format số tiền theo VNĐ.
 *
 * Ví dụ:
 * formatVND(299000) → "299.000 ₫"
 */
export function formatVND(
    value: number | null | undefined,
): string {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
    ) {
        return VND_FORMATTER.format(0)
    }

    return VND_FORMATTER.format(
        Math.max(0, value),
    )
}

/**
 * Format thời gian ISO từ Payload
 * thành DD/MM/YYYY.
 *
 * Có chỉ định Asia/Ho_Chi_Minh để kết quả
 * giữa server và client nhất quán.
 */
export function formatVoucherDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return DATE_FORMATTER.format(date)
}

function normalizeNonNegativeNumber(
    value: number | null | undefined,
): number {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
    ) {
        return 0
    }

    return Math.max(0, value)
}

function getVoucherAvailability(
    voucher: Voucher,
    now: Date,
): VoucherAvailability {
    if (
        voucher.status !== 'active' ||
        voucher.isPublic !== true
    ) {
        return 'unavailable'
    }

    const nowTimestamp = now.getTime()

    const startsAtTimestamp =
        voucher.startsAt
            ? new Date(voucher.startsAt).getTime()
            : null

    const endsAtTimestamp =
        voucher.endsAt
            ? new Date(voucher.endsAt).getTime()
            : null

    if (
        startsAtTimestamp !== null &&
        Number.isFinite(startsAtTimestamp) &&
        startsAtTimestamp > nowTimestamp
    ) {
        return 'upcoming'
    }

    if (
        endsAtTimestamp !== null &&
        Number.isFinite(endsAtTimestamp) &&
        endsAtTimestamp < nowTimestamp
    ) {
        return 'expired'
    }

    const usageLimit =
        normalizeNonNegativeNumber(
            voucher.usageLimit,
        )

    const usedCount =
        normalizeNonNegativeNumber(
            voucher.usedCount,
        )

    if (
        usageLimit > 0 &&
        usedCount >= usageLimit
    ) {
        return 'depleted'
    }

    return 'available'
}

function getAvailabilityLabel(
    availability: VoucherAvailability,
): string {
    switch (availability) {
        case 'available':
            return 'Đang áp dụng'

        case 'upcoming':
            return 'Sắp diễn ra'

        case 'expired':
            return 'Đã hết hạn'

        case 'depleted':
            return 'Đã hết lượt'

        case 'unavailable':
        default:
            return 'Không khả dụng'
    }
}

/**
 * Chuyển Voucher thô từ Payload
 * thành DTO sử dụng trực tiếp cho frontend.
 *
 * Truyền `now` từ server khi cần kết quả
 * cố định cho toàn bộ request.
 */
export function toFrontendVoucherDTO(
    voucher: Voucher,
    now: Date = new Date(),
): FrontendVoucherDTO {
    const value =
        normalizeNonNegativeNumber(
            voucher.value,
        )

    const minOrderAmount =
        normalizeNonNegativeNumber(
            voucher.minOrderAmount,
        )

    const maxDiscountAmount =
        normalizeNonNegativeNumber(
            voucher.maxDiscountAmount,
        )

    const usageLimit =
        normalizeNonNegativeNumber(
            voucher.usageLimit,
        )

    const usedCount =
        normalizeNonNegativeNumber(
            voucher.usedCount,
        )

    const usageLimitPerCustomer =
        normalizeNonNegativeNumber(
            voucher.usageLimitPerCustomer,
        )

    const remainingUses =
        usageLimit > 0
            ? Math.max(
                usageLimit - usedCount,
                0,
            )
            : null

    const discountValue =
        voucher.type === 'percent'
            ? `${value}%`
            : formatVND(value)

    const startsAtLabel =
        formatVoucherDate(
            voucher.startsAt,
        )

    const endsAtLabel =
        formatVoucherDate(
            voucher.endsAt,
        )

    const availability =
        getVoucherAvailability(
            voucher,
            now,
        )

    return {
        ...voucher,

        normalizedCode:
            voucher.code
                .trim()
                .toUpperCase(),

        remainingUses,

        availability,

        display: {
            discountValue,

            discountLabel:
                voucher.type === 'percent'
                    ? `Giảm ${value}%`
                    : `Giảm ${formatVND(value)}`,

            minOrderAmount:
                minOrderAmount > 0
                    ? formatVND(minOrderAmount)
                    : 'Không yêu cầu',

            maxDiscountAmount:
                voucher.type === 'percent' &&
                    maxDiscountAmount > 0
                    ? formatVND(
                        maxDiscountAmount,
                    )
                    : 'Không giới hạn',

            startsAt: startsAtLabel,
            endsAt: endsAtLabel,

            validity:
                voucher.startsAt &&
                    voucher.endsAt
                    ? `${startsAtLabel} - ${endsAtLabel}`
                    : 'Không giới hạn thời gian',

            usage:
                remainingUses === null
                    ? 'Không giới hạn lượt dùng'
                    : `Còn ${remainingUses.toLocaleString(
                        'vi-VN',
                    )}/${usageLimit.toLocaleString(
                        'vi-VN',
                    )} lượt`,

            usagePerCustomer:
                usageLimitPerCustomer > 0
                    ? `Mỗi khách hàng dùng ${usageLimitPerCustomer.toLocaleString(
                        'vi-VN',
                    )} lần`
                    : 'Không giới hạn mỗi khách hàng',

            availabilityLabel:
                getAvailabilityLabel(
                    availability,
                ),
        },
    }
}