import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { validateVoucher } from '@/lib/voucher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const payload = await getPayload({ config: configPromise })
        const data = await req.json()

        const code = data.code
        const subtotalAmount = Math.floor(Number(data.subtotalAmount || 0))

        if (!code) {
            return NextResponse.json(
                { error: 'Vui lòng nhập mã voucher' },
                { status: 400 },
            )
        }

        if (subtotalAmount <= 0) {
            return NextResponse.json(
                { error: 'Giỏ hàng không hợp lệ' },
                { status: 400 },
            )
        }

        const { voucher, discountAmount } = await validateVoucher({
            payload,
            code,
            subtotalAmount,
        })

        return NextResponse.json({
            valid: true,
            voucher: {
                id: voucher.id,
                code: voucher.code,
                title: voucher.title,
                type: voucher.type,
                value: voucher.value,
            },
            discountAmount,
            finalAmount: Math.max(0, subtotalAmount - discountAmount),
        })
    } catch (error: any) {
        return NextResponse.json(
            {
                valid: false,
                error: error?.message || 'Không thể áp dụng voucher',
            },
            { status: 400 },
        )
    }
}