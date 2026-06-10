import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function pad(n: number) {
    return n < 10 ? `0${n}` : String(n)
}

function formatDate(date: Date) {
    return (
        date.getFullYear() +
        '-' +
        pad(date.getMonth() + 1) +
        '-' +
        pad(date.getDate()) +
        ' ' +
        pad(date.getHours()) +
        ':' +
        pad(date.getMinutes()) +
        ':' +
        pad(date.getSeconds())
    )
}

function removeTones(str = '') {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\x20-\x7E]/g, '')
        .trim()
}

function cleanText(str = '', max = 255) {
    return removeTones(String(str)).slice(0, max)
}

function normalizePhone(phone = '') {
    let p = String(phone).replace(/\D/g, '')

    if (p.startsWith('84')) {
        p = `0${p.slice(2)}`
    }

    return p
}

function getEnv(name: string, required = true) {
    const value = process.env[name]?.trim()

    if (required && !value) {
        throw new Error(`Missing env: ${name}`)
    }

    return value
}

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json()

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
        }

        const FUNDIIN_API_URL = getEnv('FUNDIIN_API_URL')
        const FUNDIIN_MERCHANT_ID = getEnv('FUNDIIN_MERCHANT_ID')
        const FUNDIIN_CLIENT_ID = getEnv('FUNDIIN_CLIENT_ID')
        const FUNDIIN_SECRET_KEY = getEnv('FUNDIIN_SECRET_KEY')
        const FUNDIIN_STORE_ID = getEnv('FUNDIIN_STORE_ID', false)
        const BASE_URL = getEnv('NEXT_PUBLIC_BASE_URL')

        const payload = await getPayload({ config: configPromise })

        const order: any = await payload.findByID({
            collection: 'orders',
            id: orderId,
            depth: 2,
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        const totalAmount = Math.floor(Number(order.totalAmount || 0))

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 })
        }

        const cleanPhone = normalizePhone(order.customerInfo?.phone)

        // Docs Fundiin ghi phoneNumber phải dài 10 hoặc 11 số.
        if (!cleanPhone || ![10, 11].includes(cleanPhone.length)) {
            return NextResponse.json(
                {
                    error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại 10 hoặc 11 số.',
                },
                { status: 400 },
            )
        }

        const requestTime = formatDate(new Date())
        const idempotencyKey = crypto.randomUUID()

        const fullName = cleanText(order.customerInfo?.fullName || 'Guest')
        const nameParts = fullName.split(/\s+/).filter(Boolean)

        const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName || 'Guest'
        const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : 'MF'

        const referenceId = `ORD-${String(order.id).replace(/[^0-9a-zA-Z_:-]/g, '')}-${Date.now()}`.slice(
            0,
            60,
        )

        const items = Array.isArray(order.items)
            ? order.items.map((item: any, index: number) => {
                const product = item.product
                const productId =
                    product && typeof product === 'object' && product.id
                        ? String(product.id)
                        : `item-${index + 1}`

                const productName =
                    product && typeof product === 'object' && product.title
                        ? product.title
                        : `San pham ${index + 1}`

                const quantity = Math.max(1, Number(item.quantity || 1))
                const price = Math.floor(Number(item.priceAtPurchase || 0))
                const total = Math.floor(price * quantity)

                return {
                    productId: cleanText(productId, 60),
                    productName: cleanText(productName, 50),
                    description: 'My pham Phap',
                    category: 'cosmetic',
                    currency: 'VND',
                    quantity,
                    price,
                    totalAmount: total,
                }
            })
            : []

        if (!items.length) {
            return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
        }

        const fundiinBody: any = {
            merchantId: FUNDIIN_MERCHANT_ID,
            referenceId,
            requestType: 'installment',
            paymentMethod: 'WEB',
            terminalType: 'DESKTOP_BROWSER',
            lang: 'vi',
            extraData: `Order_${order.id}`,
            description: cleanText(`Thanh toan don hang ${order.id} tai MF Paris`, 255),
            successRedirectUrl: `${BASE_URL}/checkout/success?orderId=${order.id}`,
            unSuccessRedirectUrl: `${BASE_URL}/checkout?orderId=${order.id}`,
            transExpiredTime: 15 * 60 * 1000,
            sendSms: false,
            sendEmail: false,

            installment: {
                packageId: '',
            },

            amount: {
                currency: 'VND',
                value: totalAmount,
            },

            items,

            customer: {
                phoneNumber: cleanPhone,
                email: order.customerInfo?.email || 'customer@mfparis.vn',
                firstName: cleanText(firstName, 50),
                lastName: cleanText(lastName, 50),
                gender: 'U',
                dateOfBirth: '01-01-2000',
            },

            shipping: {
                city: cleanText(order.customerInfo?.province || 'Ho Chi Minh', 100),
                zipCode: '700000',
                district: cleanText(order.customerInfo?.district || '1', 100),
                ward: cleanText(order.customerInfo?.ward || '1', 100),
                street: cleanText(order.customerInfo?.address || 'Street', 255),
                streetNumber: null,
                houseNumber: null,
                houseExtension: null,
                country: 'VN',
            },
        }

        // Có storeId thì gửi, không có thì không gửi.
        if (FUNDIIN_STORE_ID) {
            fundiinBody.storeId = FUNDIIN_STORE_ID
        }

        const bodyString = JSON.stringify(fundiinBody)

        const signature = crypto
            .createHmac('sha256', FUNDIIN_SECRET_KEY)
            .update(bodyString)
            .digest('hex')

        const response = await fetch(`${FUNDIIN_API_URL.replace(/\/$/, '')}/v2/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Request-Time': requestTime,
                'Client-Id': FUNDIIN_CLIENT_ID,
                Signature: signature,
                'Idempotency-Key': idempotencyKey,
            },
            body: bodyString,
            cache: 'no-store',
        })

        const rawText = await response.text()

        let result: any = null
        try {
            result = rawText ? JSON.parse(rawText) : {}
        } catch {
            result = {
                resultMsg: rawText || 'Fundiin returned non-JSON response',
            }
        }

        if (!response.ok || !result?.paymentUrl) {
            console.error('❌ FUNDIIN API ERROR:', {
                httpStatus: response.status,
                resultStatus: result?.resultStatus,
                resultMsg: result?.resultMsg,
                referenceId,
                hasStoreId: Boolean(FUNDIIN_STORE_ID),
            })

            return NextResponse.json(
                {
                    error: result?.resultMsg || 'Lỗi từ phía Fundiin',
                    resultStatus: result?.resultStatus,
                    httpStatus: response.status,
                },
                { status: 400 },
            )
        }

        await payload.update({
            collection: 'orders',
            id: orderId,
            data: {
                fundiin: {
                    transactionId: result.referenceId || referenceId,
                    paymentStatus: result.resultStatus || 'APPROVED',
                },
            } as any,
        })

        return NextResponse.json({
            paymentUrl: result.paymentUrl,
            referenceId: result.referenceId || referenceId,
        })
    } catch (error: any) {
        console.error('🔥 FUNDIIN SERVER ERROR:', {
            message: error?.message,
            stack: error?.stack,
        })

        return NextResponse.json(
            {
                error: error?.message || 'Internal Server Error',
            },
            { status: 500 },
        )
    }
}