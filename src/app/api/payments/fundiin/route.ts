import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// 1. Hàm bổ trợ format thời gian giống hệt Postman: YYYY-MM-DD HH:mm:ss
function pad(n: number) { return n < 10 ? "0" + n : n }

function formatDate(date: Date) {
    return (
        date.getFullYear() + "-" +
        pad(date.getMonth() + 1) + "-" +
        pad(date.getDate()) + " " +
        pad(date.getHours()) + ":" +
        pad(date.getMinutes()) + ":" +
        pad(date.getSeconds())
    )
}

// 2. Hàm xóa dấu tiếng Việt (để JSON "sạch" nhất có thể)
function removeTones(str: string) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json()
        const payload = await getPayload({ config: configPromise })
        const order: any = await payload.findByID({ collection: 'orders', id: orderId, depth: 2 })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        // CHUẨN BỊ CÁC THAM SỐ HEADER
        const requestTime = formatDate(new Date())
        const idempotencyKey = crypto.randomUUID()
        const cleanPhone = order.customerInfo.phone.replace(/\D/g, '')

        // CHUẨN BỊ BODY GIỐNG HỆT POSTMAN THÀNH CÔNG
        const fundiinBody = {
            merchantId: process.env.FUNDIIN_MERCHANT_ID,
            referenceId: `ORD-${order.id}-${Date.now()}`,
            storeId: process.env.FUNDIIN_STORE_ID,
            requestType: "installment",

            transExpiredTime: 15 * 60 * 1000,

            installment: {
                packageId: ""
            },

            paymentMethod: "WEB",
            lang: "vi",
            extraData: `Order_${order.id}`,
            description: removeTones(`Thanh toan don hang ${order.id} tai MF Paris`),
            successRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
            unSuccessRedirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
            amount: {
                currency: "VND",
                value: Math.floor(Number(order.totalAmount))
            },
            items: order.items.map((item: any) => ({
                productId: String(item.product.id),
                productName: removeTones(item.product.title.substring(0, 50)),
                description: "My pham Phap",
                category: "cosmetic",
                currency: "VND",
                quantity: Number(item.quantity),
                price: Math.floor(Number(item.priceAtPurchase)),
                totalAmount: Math.floor(Number(item.priceAtPurchase) * Number(item.quantity))
            })),
            customer: {
                phoneNumber: cleanPhone,
                email: order.customerInfo.email || 'customer@mfparis.vn',
                firstName: removeTones(order.customerInfo.fullName.split(' ').pop() || 'Guest'),
                lastName: removeTones(order.customerInfo.fullName.split(' ')[0] || 'MF'),
                gender: "F",
                dateOfBirth: "01-01-2000"
            },
            shipping: {
                city: removeTones(order.customerInfo.province || "Ho Chi Minh"),
                zipCode: "700000",
                district: removeTones(order.customerInfo.district || "1"),
                ward: removeTones(order.customerInfo.ward || "1"),
                street: removeTones(order.customerInfo.address || "Street"),
                houseNumber: "N/A",
                country: "VN"
            }
        }

        // TẠO CHỮ KÝ (HMAC-SHA256)
        const bodyString = JSON.stringify(fundiinBody)
        const signature = crypto
            .createHmac('sha256', process.env.FUNDIIN_SECRET_KEY!)
            .update(bodyString)
            .digest('hex')

        // GỌI API FUNDIIN VỚI ENDPOINT /v2/payments
        const response = await fetch(`${process.env.FUNDIIN_API_URL}/v2/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Request-Time': requestTime,
                'Client-Id': process.env.FUNDIIN_CLIENT_ID!,
                'Signature': signature,
                'Idempotency-Key': idempotencyKey
            },
            body: bodyString
        })

        const result = await response.json()

        // Kiểm tra kết quả
        if (result.paymentUrl) {
            // Cập nhật thông tin giao dịch vào Database Payload
            await payload.update({
                collection: 'orders',
                id: orderId,
                data: {
                    fundiin: {
                        transactionId: result.referenceId,
                        paymentStatus: result.resultStatus || 'APPROVED',
                    }
                } as any
            })

            return NextResponse.json({ paymentUrl: result.paymentUrl })
        } else {
            console.error("❌ FUNDIIN API ERROR:", result)
            return NextResponse.json({
                error: result.resultMsg || 'Lỗi từ phía Fundiin'
            }, { status: 400 })
        }

    } catch (error: any) {
        console.error('🔥 SERVER ERROR:', error.message)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}