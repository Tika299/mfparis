import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
    extractFundiinOrderId,
    extractFundiinOrderToken,
    extractFundiinStatus,
    extractFundiinTransactionId,
    updateFundiinOrderStatus,
    verifyFundiinSignature,
} from '@/lib/orders/fundiinOrderStatus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const rawBody = await req.text()

    if (!verifyFundiinSignature(rawBody, req.headers)) {
        return NextResponse.json(
            { success: false, error: 'Invalid Fundiin signature' },
            { status: 401 },
        )
    }

    let body: unknown

    try {
        body = JSON.parse(rawBody)
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON' },
            { status: 400 },
        )
    }

    const orderId = extractFundiinOrderId(body)
    const rawStatus = extractFundiinStatus(body)

    if (!orderId) {
        return NextResponse.json(
            { success: false, error: 'Missing order id' },
            { status: 400 },
        )
    }

    const payload = await getPayload({ config: configPromise })

    const result = await updateFundiinOrderStatus({
        payload,
        orderId,
        rawStatus,
        transactionId: extractFundiinTransactionId(body),
        orderToken: extractFundiinOrderToken(body),
        source: 'webhook',
    })

    return NextResponse.json({
        success: true,
        changed: result.changed,
        orderId,
        paymentStatus: result.order.paymentStatus,
        orderStatus: result.order.status,
        fundiinStatus: result.order.fundiin?.paymentStatus,
    })
}