export function normalizeVoucherCode(code: unknown) {
    return String(code || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
}

export function calculateVoucherDiscount(voucher: any, subtotalAmount: number) {
    const type = voucher?.type
    const value = Number(voucher?.value || 0)
    const maxDiscountAmount = Number(voucher?.maxDiscountAmount || 0)

    if (subtotalAmount <= 0 || value <= 0) return 0

    let discount = 0

    if (type === 'percent') {
        discount = Math.floor((subtotalAmount * value) / 100)

        if (maxDiscountAmount > 0) {
            discount = Math.min(discount, maxDiscountAmount)
        }
    } else {
        discount = value
    }

    return Math.min(Math.floor(discount), Math.floor(subtotalAmount))
}

export async function validateVoucher({
    payload,
    code,
    subtotalAmount,
}: {
    payload: any
    code: string
    subtotalAmount: number
}) {
    const normalizedCode = normalizeVoucherCode(code)

    if (!normalizedCode) {
        return {
            voucher: null,
            discountAmount: 0,
        }
    }

    const voucherRes = await payload.find({
        collection: 'vouchers',
        limit: 1,
        where: {
            code: {
                equals: normalizedCode,
            },
        },
    })

    const voucher = voucherRes.docs?.[0]

    if (!voucher) {
        throw new Error('Mã voucher không tồn tại')
    }

    if (voucher.status !== 'active') {
        throw new Error('Mã voucher hiện không khả dụng')
    }

    const now = Date.now()

    if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now) {
        throw new Error('Mã voucher chưa đến thời gian sử dụng')
    }

    if (voucher.endsAt && new Date(voucher.endsAt).getTime() < now) {
        throw new Error('Mã voucher đã hết hạn')
    }

    const minOrderAmount = Number(voucher.minOrderAmount || 0)

    if (minOrderAmount > 0 && subtotalAmount < minOrderAmount) {
        throw new Error(
            `Đơn hàng cần tối thiểu ${minOrderAmount.toLocaleString('vi-VN')}đ để dùng mã này`,
        )
    }

    const usageLimit = Number(voucher.usageLimit || 0)
    const usedCount = Number(voucher.usedCount || 0)

    if (usageLimit > 0 && usedCount >= usageLimit) {
        throw new Error('Mã voucher đã hết lượt sử dụng')
    }

    const discountAmount = calculateVoucherDiscount(voucher, subtotalAmount)

    if (discountAmount <= 0) {
        throw new Error('Mã voucher không hợp lệ cho đơn hàng này')
    }

    return {
        voucher,
        discountAmount,
    }
}