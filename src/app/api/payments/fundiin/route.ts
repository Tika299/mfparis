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
    const checkedItems: FundiinItem[] = []
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

type FundiinItem = Readonly<{
    productId: string
    productName: string
    description: string
    category: string
    currency: 'VND'
    quantity: number
    price: number
    totalAmount: number
    sku?: string
}>

type DiscountAllocation = {
    itemIndex: number
    discountAmount: number
    fraction: number
}

type TrustedOrderAmounts = Readonly<{
    subtotalAmount: number
    discountAmount: number
    shippingFee: number
    totalAmount: number
}>

function toMoney(
    value: unknown,
    fallback = 0,
): number {
    const numberValue =
        typeof value === 'number'
            ? value
            : typeof value === 'string' &&
                value.trim().length > 0
                ? Number(value)
                : fallback

    return Number.isFinite(numberValue)
        ? Math.floor(numberValue)
        : fallback
}

function validateTrustedOrderAmounts(
    order: Record<string, unknown>,
    serverSubtotal: number,
): TrustedOrderAmounts {
    const storedSubtotal = toMoney(
        order.subtotalAmount,
        serverSubtotal,
    )

    const discountAmount = Math.max(
        0,
        toMoney(order.discountAmount),
    )

    const shippingFee = Math.max(
        0,
        toMoney(order.shippingFee),
    )

    const totalAmount = toMoney(
        order.totalAmount,
        Number.NaN,
    )

    /**
     * Tổng giá sản phẩm hiện tại phải khớp với
     * subtotal đã được API create-order lưu.
     */
    if (storedSubtotal !== serverSubtotal) {
        console.error(
            '[Fundiin] Subtotal mismatch:',
            {
                orderId: order.id,
                serverSubtotal,
                storedSubtotal,
            },
        )

        throw new Error(
            'Tạm tính đơn hàng đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.',
        )
    }

    if (
        discountAmount < 0 ||
        discountAmount > storedSubtotal
    ) {
        throw new Error(
            'Số tiền giảm giá trong đơn hàng không hợp lệ.',
        )
    }

    const expectedTotal = Math.max(
        0,
        storedSubtotal - discountAmount + shippingFee,
    )

    if (
        !Number.isFinite(totalAmount) ||
        totalAmount !== expectedTotal
    ) {
        console.error(
            '[Fundiin] Total mismatch:',
            {
                orderId: order.id,
                storedSubtotal,
                discountAmount,
                expectedTotal,
                totalAmount,
            },
        )

        throw new Error(
            'Tổng tiền đơn hàng không hợp lệ.',
        )
    }

    if (totalAmount <= 0) {
        throw new Error(
            'Số tiền thanh toán qua Fundiin phải lớn hơn 0.',
        )
    }

    return {
        subtotalAmount: storedSubtotal,
        discountAmount,
        shippingFee,
        totalAmount,
    }
}

/**
 * Phân bổ discountAmount vào từng dòng sản phẩm.
 *
 * Bảo đảm:
 * - Tổng item sau giảm bằng totalAmount.
 * - totalAmount mỗi item luôn bằng price × quantity.
 * - Không sử dụng giá âm.
 * - Mỗi dòng gốc sinh tối đa hai dòng Fundiin.
 */
function applyDiscountToFundiinItems(
    items: FundiinItem[],
    discountAmount: number,
): FundiinItem[] {
    if (discountAmount <= 0) {
        return items
    }

    const grossTotal = items.reduce(
        (total, item) =>
            total + item.totalAmount,
        0,
    )

    if (
        grossTotal <= 0 ||
        discountAmount > grossTotal
    ) {
        throw new Error(
            'Không thể phân bổ giảm giá cho đơn hàng.',
        )
    }

    const allocations: DiscountAllocation[] =
        items.map((item, itemIndex) => {
            const rawDiscount =
                (discountAmount *
                    item.totalAmount) /
                grossTotal

            const flooredDiscount = Math.min(
                item.totalAmount,
                Math.floor(rawDiscount),
            )

            return {
                itemIndex,
                discountAmount:
                    flooredDiscount,
                fraction:
                    rawDiscount -
                    Math.floor(rawDiscount),
            }
        })

    let remainingDiscount =
        discountAmount -
        allocations.reduce(
            (total, allocation) =>
                total +
                allocation.discountAmount,
            0,
        )

    /**
     * Phân bổ phần dư theo phương pháp
     * phần thập phân lớn nhất.
     */
    const allocationOrder = [
        ...allocations,
    ].sort(
        (first, second) =>
            second.fraction -
            first.fraction,
    )

    while (remainingDiscount > 0) {
        let allocatedInRound = false

        for (const allocation of allocationOrder) {
            if (remainingDiscount <= 0) {
                break
            }

            const item =
                items[allocation.itemIndex]

            if (
                allocation.discountAmount >=
                item.totalAmount
            ) {
                continue
            }

            allocation.discountAmount += 1
            remainingDiscount -= 1
            allocatedInRound = true
        }

        if (!allocatedInRound) {
            throw new Error(
                'Không thể phân bổ toàn bộ số tiền giảm giá.',
            )
        }
    }

    const result: FundiinItem[] = []

    for (const allocation of allocations) {
        const item =
            items[allocation.itemIndex]

        const netLineAmount =
            item.totalAmount -
            allocation.discountAmount

        /**
         * Dòng được giảm hoàn toàn thì không gửi sang
         * Fundiin vì price phải là số dương.
         */
        if (netLineAmount <= 0) {
            continue
        }

        const quantity = Math.max(
            1,
            Math.floor(item.quantity),
        )

        const baseUnitPrice = Math.floor(
            netLineAmount / quantity,
        )

        const remainder =
            netLineAmount % quantity

        const baseQuantity =
            quantity - remainder

        /**
         * Ví dụ:
         * netLineAmount = 199.999
         * quantity = 2
         *
         * Tạo:
         * - 1 × 99.999
         * - 1 × 100.000
         *
         * Tổng vẫn chính xác 199.999.
         */
        if (
            baseQuantity > 0 &&
            baseUnitPrice > 0
        ) {
            result.push({
                ...item,
                productId:
                    remainder > 0
                        ? `${item.productId}-A`
                        : item.productId,
                quantity: baseQuantity,
                price: baseUnitPrice,
                totalAmount:
                    baseUnitPrice *
                    baseQuantity,
            })
        }

        if (remainder > 0) {
            const remainderUnitPrice =
                baseUnitPrice + 1

            result.push({
                ...item,
                productId:
                    `${item.productId}-B`,
                quantity: remainder,
                price:
                    remainderUnitPrice,
                totalAmount:
                    remainderUnitPrice *
                    remainder,
            })
        }
    }

    const netItemsTotal = result.reduce(
        (total, item) =>
            total + item.totalAmount,
        0,
    )

    const expectedNetTotal =
        grossTotal - discountAmount

    if (
        netItemsTotal !== expectedNetTotal
    ) {
        console.error(
            '[Fundiin] Discount allocation mismatch:',
            {
                grossTotal,
                discountAmount,
                expectedNetTotal,
                netItemsTotal,
            },
        )

        throw new Error(
            'Tổng sản phẩm sau giảm giá không hợp lệ.',
        )
    }

    if (result.length === 0) {
        throw new Error(
            'Đơn hàng không còn giá trị để thanh toán.',
        )
    }

    if (result.length > 200) {
        throw new Error(
            'Đơn hàng vượt quá số dòng sản phẩm Fundiin cho phép.',
        )
    }

    return result
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

        const {
            checkedItems,
            serverTotal: serverSubtotal,
        } = await validateOrderBeforePayment(
            order,
            payload,
        )

        const trustedAmounts =
            validateTrustedOrderAmounts(
                order,
                serverSubtotal,
            )

        const fundiinItems =
            applyDiscountToFundiinItems(
                checkedItems,
                trustedAmounts.discountAmount,
            )

        const fundiinItemsTotal =
            fundiinItems.reduce(
                (total, item) =>
                    total + item.totalAmount,
                0,
            )

        if (
            fundiinItemsTotal !==
            trustedAmounts.totalAmount
        ) {
            console.error(
                '[Fundiin] Payment amount mismatch:',
                {
                    orderId: order.id,
                    fundiinItemsTotal,
                    orderTotal:
                        trustedAmounts.totalAmount,
                },
            )

            return NextResponse.json(
                {
                    error:
                        'Tổng tiền gửi sang Fundiin không hợp lệ.',
                },
                {
                    status: 409,
                },
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
                value: trustedAmounts.totalAmount,
            },
            items: fundiinItems,
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
                        transactionId:
                            result.referenceId,
                        paymentStatus:
                            'initialized',
                        orderToken:
                            typeof result.orderToken === 'string'
                                ? result.orderToken
                                : null,
                    },
                } as any
            })

            return NextResponse.json({ paymentUrl: result.paymentUrl })
        } else {
            console.error("❌ FUNDIIN API ERROR:", result)
            return NextResponse.json({
                error: result.resultMsg || 'Lỗi từ phía Fundiin'
            }, { status: 400 })
        }

    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : 'Internal Server Error'

        console.error(
            '🔥 FUNDIIN SERVER ERROR:',
            error,
        )

        return NextResponse.json(
            {
                error: message,
            },
            {
                status: 500,
            },
        )
    }
}