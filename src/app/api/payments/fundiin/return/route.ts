import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { updateFundiinOrderStatus } from '@/lib/orders/fundiinOrderStatus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn').replace(/\/$/, '')

function firstParam(searchParams: URLSearchParams, keys: string[]) {
    for (const key of keys) {
        const value = searchParams.get(key)

        if (value) return value
    }

    return null
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const searchParams = url.searchParams

    const orderId = firstParam(searchParams, [
        'orderId',
        'order_id',
        'merchantOrderId',
        'referenceId',
    ])?.replace(/^ORD-/i, '')

    const rawStatus =
        firstParam(searchParams, [
            'paymentStatus',
            'payment_status',
            'transactionStatus',
            'status',
            'resultCode',
            'result',
        ]) || 'unknown'

    if (!orderId) {
        return NextResponse.redirect(`${SITE_URL}/checkout?fundiin=missing-order`)
    }

    const payload = await getPayload({ config: configPromise })

    const result = await updateFundiinOrderStatus({
        payload,
        orderId,
        rawStatus,
        transactionId: firstParam(searchParams, ['transactionId', 'transaction_id']),
        orderToken: firstParam(searchParams, ['orderToken', 'order_token']),
        source: 'return',
    })

    if (result.order.paymentStatus === 'paid') {
        return NextResponse.redirect(`${SITE_URL}/checkout/success?orderId=${orderId}`)
    }

    if (result.order.status === 'cancelled') {
        return NextResponse.redirect(`${SITE_URL}/checkout?payment=fundiin&fundiin=cancelled&orderId=${orderId}`)
    }

    return NextResponse.redirect(`${SITE_URL}/checkout?payment=fundiin&fundiin=failed&orderId=${orderId}`)
}