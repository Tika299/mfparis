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

function getFinalPrice(basePrice: number, salePrice: number) {
    return salePrice > 0 ? salePrice : basePrice
}

async function validateOrderBeforePayment(order: any, payload: any) {
    const checkedItems = []
    let serverTotal = 0

    for (const item of order.items || []) {
        const productId =
            typeof item.product === 'object'
                ? item.product.id
                : item.product

        const variantId = item.variantId || null
        const quantity = Math.floor(Number(item.quantity || 0))

        if (!productId || quantity <= 0) {
            throw new Error('Đơn hàng có sản phẩm không hợp lệ')
        }

        const product: any = await payload.findByID({
            collection: 'products',
            id: productId,
            depth: 1,
        })

        if (!product) {
            throw new Error('Sản phẩm không còn tồn tại')
        }

        let latestPrice = 0
        let latestStock = 0
        let latestTitle = product.title
        let latestSku = product.sku || ''

        if (variantId) {
            const variant = product.variants?.find(
                (variant: any) => String(variant.id) === String(variantId),
            )

            if (!variant || variant?.isActive === false) {
                throw new Error(`Phân loại của sản phẩm "${product.title}" đã ngừng bán`)
            }

            const basePrice = Number(variant?.basePrice || variant?.price || 0)
            const salePrice = Number(variant?.salePrice || 0)

            latestPrice = getFinalPrice(basePrice, salePrice)
            latestStock = Number(variant?.stock || 0)
            latestTitle = `${product.title} - ${variant.name}`
            latestSku = variant.sku || product.sku || ''
        } else {
            const basePrice = Number(product?.price?.basePrice || 0)
            const salePrice = Number(product?.price?.salePrice || 0)

            latestPrice = getFinalPrice(basePrice, salePrice)
            latestStock = Number(product?.price?.stock || 0)
        }

        if (latestPrice <= 0) {
            throw new Error(`Sản phẩm "${latestTitle}" cần liên hệ để báo giá`)
        }

        if (latestStock <= 0) {
            throw new Error(`Sản phẩm "${latestTitle}" đã hết hàng`)
        }

        if (quantity > latestStock) {
            throw new Error(`Sản phẩm "${latestTitle}" chỉ còn ${latestStock} sản phẩm`)
        }

        serverTotal += latestPrice * quantity

        checkedItems.push({
            productId: String(productId),
            productName: removeTones(String(latestTitle).substring(0, 50)),
            description: 'My pham Phap',
            category: 'cosmetic',
            currency: 'VND',
            quantity,
            price: Math.floor(latestPrice),
            totalAmount: Math.floor(latestPrice * quantity),
            sku: latestSku,
        })
    }

    if (checkedItems.length === 0 || serverTotal <= 0) {
        throw new Error('Đơn hàng không có sản phẩm hợp lệ để thanh toán')
    }

    return {
        checkedItems,
        serverTotal: Math.floor(serverTotal),
    }
}

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json()
        const payload = await getPayload({ config: configPromise })
        const order: any = await payload.findByID({ collection: 'orders', id: orderId, depth: 2 })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        if (order.paymentMethod && order.paymentMethod !== 'fundiin') {
            return NextResponse.json(
                { error: 'Đơn hàng này không chọn phương thức Fundiin' },
                { status: 400 },
            )
        }

        const { checkedItems, serverTotal } = await validateOrderBeforePayment(order, payload)

        const orderTotal = Math.floor(Number(order.totalAmount || 0))

        if (orderTotal !== serverTotal) {
            return NextResponse.json(
                {
                    error: 'Tổng tiền đơn hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.',
                },
                { status: 409 },
            )
        }

        // CHUẨN BỊ CÁC THAM SỐ HEADER
        const requestTime = formatDate(new Date())
        const idempotencyKey = `FUNDIIN-${order.id}`
        const cleanPhone = order.customerInfo.phone.replace(/\D/g, '')

        // CHUẨN BỊ BODY GIỐNG HỆT POSTMAN THÀNH CÔNG
        const fundiinBody = {
            merchantId: process.env.FUNDIIN_MERCHANT_ID,
            referenceId: `ORD-${order.id}`,
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
                currency: 'VND',
                value: serverTotal,
            },
            items: checkedItems,
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