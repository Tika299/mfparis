import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VoucherType = 'fixed' | 'percent'

type ValidateVoucherRequest = Readonly<{
    code: string
    subtotalAmount: number
}>

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function normalizeVoucherCode(
    value: string,
): string {
    return value.trim().toUpperCase()
}

function toFiniteNumber(
    value: unknown,
    fallback = 0,
): number {
    if (
        typeof value === 'number' &&
        Number.isFinite(value)
    ) {
        return value
    }

    if (
        typeof value === 'string' &&
        value.trim().length > 0
    ) {
        const parsedValue = Number(value)

        if (Number.isFinite(parsedValue)) {
            return parsedValue
        }
    }

    return fallback
}

function parseDateTimestamp(
    value: unknown,
): number | null {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        return null
    }

    const timestamp =
        new Date(value).getTime()

    return Number.isFinite(timestamp)
        ? timestamp
        : null
}

function jsonError(
    message: string,
    status: number,
) {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        {
            status,
        },
    )
}

async function readRequestBody(
    request: Request,
): Promise<
    | {
        success: true
        data: ValidateVoucherRequest
    }
    | {
        success: false
        response: NextResponse
    }
> {
    let body: unknown

    try {
        body = await request.json()
    } catch {
        return {
            success: false,
            response: jsonError(
                'Dữ liệu gửi lên không hợp lệ.',
                400,
            ),
        }
    }

    if (!isRecord(body)) {
        return {
            success: false,
            response: jsonError(
                'Dữ liệu gửi lên không hợp lệ.',
                400,
            ),
        }
    }

    if (typeof body.code !== 'string') {
        return {
            success: false,
            response: jsonError(
                'Vui lòng nhập mã voucher.',
                400,
            ),
        }
    }

    const code =
        normalizeVoucherCode(body.code)

    if (!code) {
        return {
            success: false,
            response: jsonError(
                'Vui lòng nhập mã voucher.',
                400,
            ),
        }
    }

    if (code.length > 64) {
        return {
            success: false,
            response: jsonError(
                'Mã voucher không hợp lệ.',
                400,
            ),
        }
    }

    const subtotalAmount =
        toFiniteNumber(
            body.subtotalAmount,
            Number.NaN,
        )

    if (
        !Number.isFinite(subtotalAmount) ||
        subtotalAmount <= 0
    ) {
        return {
            success: false,
            response: jsonError(
                'Giá trị giỏ hàng không hợp lệ.',
                400,
            ),
        }
    }

    return {
        success: true,
        data: {
            code,
            subtotalAmount:
                Math.floor(subtotalAmount),
        },
    }
}

export async function POST(
    request: Request,
): Promise<NextResponse> {
    const parsedRequest =
        await readRequestBody(request)

    if (!parsedRequest.success) {
        return parsedRequest.response
    }

    const {
        code,
        subtotalAmount,
    } = parsedRequest.data

    try {
        const payload = await getPayload({
            config: configPromise,
        })

        /**
         * Dùng overrideAccess vì đây là API nghiệp vụ phía server.
         *
         * Sau khi query, toàn bộ điều kiện voucher vẫn
         * được kiểm tra lại bên dưới. Không tin dữ liệu client.
         */
        const voucherResult =
            await payload.find({
                collection: 'vouchers',
                depth: 0,
                limit: 1,
                pagination: false,
                overrideAccess: true,
                where: {
                    code: {
                        equals: code,
                    },
                },
            })

        const voucher =
            voucherResult.docs[0]

        if (!voucher) {
            return jsonError(
                'Mã không tồn tại.',
                404,
            )
        }

        if (voucher.status !== 'active') {
            return jsonError(
                'Mã voucher hiện không hoạt động.',
                409,
            )
        }

        const now = Date.now()

        const startsAtTimestamp =
            parseDateTimestamp(
                voucher.startsAt,
            )

        const endsAtTimestamp =
            parseDateTimestamp(
                voucher.endsAt,
            )

        if (
            startsAtTimestamp === null ||
            endsAtTimestamp === null
        ) {
            return jsonError(
                'Mã voucher chưa được cấu hình thời gian sử dụng hợp lệ.',
                409,
            )
        }

        if (now < startsAtTimestamp) {
            return jsonError(
                'Mã voucher chưa đến thời gian sử dụng.',
                409,
            )
        }

        if (now > endsAtTimestamp) {
            return jsonError(
                'Mã voucher đã hết hạn.',
                409,
            )
        }

        const minOrderAmount =
            Math.max(
                0,
                toFiniteNumber(
                    voucher.minOrderAmount,
                ),
            )

        if (
            subtotalAmount <
            minOrderAmount
        ) {
            const missingAmount =
                minOrderAmount -
                subtotalAmount

            return jsonError(
                `Đơn hàng cần thêm ${missingAmount.toLocaleString(
                    'vi-VN',
                )}₫ để sử dụng mã này.`,
                409,
            )
        }

        const usageLimit =
            Math.max(
                0,
                Math.floor(
                    toFiniteNumber(
                        voucher.usageLimit,
                    ),
                ),
            )

        const usedCount =
            Math.max(
                0,
                Math.floor(
                    toFiniteNumber(
                        voucher.usedCount,
                    ),
                ),
            )

        /**
         * usageLimit = 0 nghĩa là không giới hạn.
         */
        if (
            usageLimit > 0 &&
            usedCount >= usageLimit
        ) {
            return jsonError(
                'Mã voucher đã hết lượt sử dụng.',
                409,
            )
        }

        const voucherType:
            VoucherType | null =
            voucher.type === 'fixed' ||
                voucher.type === 'percent'
                ? voucher.type
                : null

        if (!voucherType) {
            return jsonError(
                'Loại voucher không hợp lệ.',
                500,
            )
        }

        const voucherValue =
            toFiniteNumber(
                voucher.value,
                Number.NaN,
            )

        if (
            !Number.isFinite(voucherValue) ||
            voucherValue < 0
        ) {
            return jsonError(
                'Giá trị voucher không hợp lệ.',
                500,
            )
        }

        if (
            voucherType === 'percent' &&
            voucherValue > 100
        ) {
            return jsonError(
                'Giá trị voucher phần trăm không hợp lệ.',
                500,
            )
        }

        let discountAmount = 0

        if (voucherType === 'percent') {
            discountAmount = Math.floor(
                subtotalAmount *
                (voucherValue / 100),
            )

            const maxDiscountAmount =
                Math.max(
                    0,
                    toFiniteNumber(
                        voucher.maxDiscountAmount,
                    ),
                )

            if (maxDiscountAmount > 0) {
                discountAmount = Math.min(
                    discountAmount,
                    maxDiscountAmount,
                )
            }
        } else {
            discountAmount =
                Math.floor(voucherValue)
        }

        /**
         * Không cho số tiền giảm:
         * - âm;
         * - vượt quá tổng tiền đơn hàng.
         */
        discountAmount = Math.min(
            subtotalAmount,
            Math.max(
                0,
                Math.floor(discountAmount),
            ),
        )

        if (discountAmount <= 0) {
            return jsonError(
                'Voucher không tạo ra giá trị giảm hợp lệ.',
                409,
            )
        }

        return NextResponse.json(
            {
                success: true,

                voucher: {
                    id: voucher.id,
                    code: voucher.code,
                    type: voucherType,
                    value: voucherValue,
                },

                discountAmount,
            },
            {
                status: 200,
            },
        )
    } catch (error: unknown) {
        console.error(
            '[POST /api/vouchers/validate] Error:',
            error,
        )

        return jsonError(
            'Không thể kiểm tra voucher vào lúc này. Vui lòng thử lại.',
            500,
        )
    }
}