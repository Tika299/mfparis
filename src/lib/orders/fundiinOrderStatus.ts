import crypto from 'crypto'
import type { Payload } from 'payload'

type OrderPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded'
type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled' | 'failed'

type FundiinStatusResult = {
    normalizedStatus: string
    paymentStatus: OrderPaymentStatus
    orderStatus: OrderStatus
    emailKind: 'paid' | 'cancelled' | 'failed' | 'pending'
}

type UpdateFundiinOrderInput = {
    payload: Payload
    orderId: string | number
    rawStatus: unknown
    transactionId?: string | null
    orderToken?: string | null
    source?: 'return' | 'webhook'
}

const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn').replace(/\/$/, '')

const SHOP_EMAIL =
    process.env.ORDER_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_FROM ||
    'vukofa9120@gmail.com'

const SUCCESS_STATUSES = new Set([
    '0',
    '00',
    'success',
    'successful',
    'paid',
    'completed',
    'approved',
    'captured',
])

const CANCELLED_STATUSES = new Set([
    'cancel',
    'canceled',
    'cancelled',
    'user_cancel',
    'user_canceled',
    'user_cancelled',
    'merchant_cancelled',
    'expired',
    'timeout',
])

const FAILED_STATUSES = new Set([
    'fail',
    'failed',
    'failure',
    'error',
    'rejected',
    'denied',
    'declined',
])

const PENDING_STATUSES = new Set([
    'pending',
    'processing',
    'initialized',
    'created',
    'waiting',
])

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function normalizeStatus(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function formatMoney(value: unknown): string {
    const amount = typeof value === 'number' ? value : Number(value ?? 0)

    return Number.isFinite(amount) ? amount.toLocaleString('vi-VN') : '0'
}

function getString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function mapFundiinStatus(rawStatus: unknown): FundiinStatusResult {
    const normalizedStatus = normalizeStatus(rawStatus)

    if (SUCCESS_STATUSES.has(normalizedStatus)) {
        return {
            normalizedStatus,
            paymentStatus: 'paid',
            orderStatus: 'confirmed',
            emailKind: 'paid',
        }
    }

    if (CANCELLED_STATUSES.has(normalizedStatus)) {
        return {
            normalizedStatus,
            paymentStatus: 'failed',
            orderStatus: 'cancelled',
            emailKind: 'cancelled',
        }
    }

    if (FAILED_STATUSES.has(normalizedStatus)) {
        return {
            normalizedStatus,
            paymentStatus: 'failed',
            orderStatus: 'failed',
            emailKind: 'failed',
        }
    }

    if (PENDING_STATUSES.has(normalizedStatus)) {
        return {
            normalizedStatus,
            paymentStatus: 'pending',
            orderStatus: 'pending',
            emailKind: 'pending',
        }
    }

    return {
        normalizedStatus: normalizedStatus || 'unknown',
        paymentStatus: 'failed',
        orderStatus: 'failed',
        emailKind: 'failed',
    }
}

function buildOrderRows(order: any): string {
    const items = Array.isArray(order.items) ? order.items : []

    if (items.length === 0) {
        return `
      <tr>
        <td colspan="4" style="padding:12px;border:1px solid #ddd;text-align:center;color:#777;">
          Chưa có sản phẩm trong đơn.
        </td>
      </tr>
    `
    }

    return items
        .map((item: any) => {
            const title = item.productTitleSnapshot || item.product?.title || 'Sản phẩm'
            const variant = item.variantNameSnapshot
                ? `<div style="margin-top:4px;color:#666;font-size:12px;">${escapeHtml(item.variantNameSnapshot)}</div>`
                : ''
            const sku = item.skuSnapshot
                ? `<div style="margin-top:2px;color:#777;font-size:12px;">SKU: ${escapeHtml(item.skuSnapshot)}</div>`
                : ''

            const quantity = Number(item.quantity || 0)
            const price = Number(item.priceAtPurchase || 0)

            return `
        <tr>
          <td style="padding:10px;border:1px solid #ddd;">
            <b>${escapeHtml(title)}</b>
            ${variant}
            ${sku}
          </td>
          <td style="padding:10px;border:1px solid #ddd;text-align:center;">${quantity}</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:right;">${formatMoney(price)}đ</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:right;">${formatMoney(quantity * price)}đ</td>
        </tr>
      `
        })
        .join('')
}

function statusText(kind: FundiinStatusResult['emailKind']): string {
    if (kind === 'paid') return 'Thanh toán Fundiin đã được ghi nhận'
    if (kind === 'cancelled') return 'Đơn thanh toán Fundiin đã bị hủy'
    if (kind === 'pending') return 'Thanh toán Fundiin đang chờ xác nhận'
    return 'Thanh toán Fundiin chưa thành công'
}

function statusColor(kind: FundiinStatusResult['emailKind']): string {
    if (kind === 'paid') return '#15803d'
    if (kind === 'cancelled') return '#b72828'
    if (kind === 'pending') return '#a16207'
    return '#b72828'
}

async function sendFundiinStatusEmails({
    payload,
    order,
    status,
}: {
    payload: Payload
    order: any
    status: FundiinStatusResult
}) {
    if (status.emailKind === 'pending') return

    const customerEmail = String(order.customerInfo?.email || '').trim().toLowerCase()
    const canSendCustomerEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    const rows = buildOrderRows(order)
    const title = statusText(status.emailKind)
    const color = statusColor(status.emailKind)

    const customerHtml = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222;border:1px solid #eee;border-radius:12px;overflow:hidden;">
      <div style="background:${color};color:#fff;padding:24px;text-align:center;">
        <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;">Marais de France</div>
        <h2 style="margin:10px 0 0;font-size:24px;">${escapeHtml(title)}</h2>
      </div>

      <div style="padding:24px;">
        <p>Xin chào <b>${escapeHtml(order.customerInfo?.fullName)}</b>,</p>
        <p style="line-height:1.6;">
          Đơn hàng <b>#${escapeHtml(order.id)}</b> của bạn đã được cập nhật trạng thái thanh toán qua Fundiin:
          <b style="color:${color};">${escapeHtml(title)}</b>.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="text-align:left;padding:10px;border:1px solid #ddd;">Sản phẩm</th>
              <th style="text-align:center;padding:10px;border:1px solid #ddd;">SL</th>
              <th style="text-align:right;padding:10px;border:1px solid #ddd;">Đơn giá</th>
              <th style="text-align:right;padding:10px;border:1px solid #ddd;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="text-align:right;font-size:18px;margin:18px 0;">
          <b>Tổng thanh toán: <span style="color:#b72828;">${formatMoney(order.totalAmount)}đ</span></b>
        </div>

        <p style="color:#666;line-height:1.6;">
          Nếu bạn cần hỗ trợ thêm, vui lòng phản hồi email này hoặc liên hệ hotline 079.29.79.299.
        </p>
      </div>
    </div>
  `

    const shopHtml = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #eee;padding:20px;">
      <h2 style="color:${color};">Cập nhật Fundiin - Đơn #${escapeHtml(order.id)}</h2>
      <p>Trạng thái mới: <b>${escapeHtml(title)}</b></p>
      <p>Khách hàng: <b>${escapeHtml(order.customerInfo?.fullName)}</b></p>
      <p>SĐT: ${escapeHtml(order.customerInfo?.phone)}</p>
      <p>Email: ${escapeHtml(order.customerInfo?.email)}</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="text-align:left;padding:10px;border:1px solid #ddd;">Sản phẩm</th>
            <th style="text-align:center;padding:10px;border:1px solid #ddd;">SL</th>
            <th style="text-align:right;padding:10px;border:1px solid #ddd;">Đơn giá</th>
            <th style="text-align:right;padding:10px;border:1px solid #ddd;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="text-align:right;font-size:18px;">
        <b>Tổng cộng: <span style="color:#b72828;">${formatMoney(order.totalAmount)}đ</span></b>
      </p>

      <p style="text-align:center;margin-top:28px;">
        <a href="${SITE_URL}/admin/collections/orders/${order.id}"
          style="background:#111;color:#fff;padding:12px 22px;text-decoration:none;font-weight:bold;">
          Xem đơn trong admin
        </a>
      </p>
    </div>
  `

    await payload.sendEmail({
        to: SHOP_EMAIL,
        subject: `[MF Paris] ${title} - Đơn #${order.id}`,
        html: shopHtml,
    })

    if (canSendCustomerEmail) {
        await payload.sendEmail({
            to: customerEmail,
            subject: `[MF Paris] ${title} - Đơn #${order.id}`,
            html: customerHtml,
        })
    }
}

export function verifyFundiinSignature(rawBody: string, headers: Headers): boolean {
    const secret = process.env.FUNDIIN_WEBHOOK_SECRET || process.env.FUNDIIN_SECRET_KEY

    if (!secret) return true

    const signature =
        headers.get('signature') ||
        headers.get('x-signature') ||
        headers.get('x-fundiin-signature')

    if (!signature) return false

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
        return false
    }
}

export function extractFundiinOrderId(data: unknown): string | null {
    if (!isRecord(data)) return null

    const directOrderId =
        getString(data.orderId) ||
        getString(data.order_id) ||
        getString(data.merchantOrderId) ||
        getString(data.merchant_order_id)

    if (directOrderId) return directOrderId.replace(/^ORD-/i, '')

    const referenceId = getString(data.referenceId) || getString(data.reference_id)

    if (referenceId) {
        const match = referenceId.match(/ORD-(\d+)/i)
        if (match?.[1]) return match[1]
    }

    const extraData = getString(data.extraData) || getString(data.extra_data)

    if (extraData) {
        const match = extraData.match(/Order_(\d+)/i)
        if (match?.[1]) return match[1]
    }

    if (isRecord(data.data)) {
        return extractFundiinOrderId(data.data)
    }

    return null
}

export function extractFundiinStatus(data: unknown): string {
    if (!isRecord(data)) return 'unknown'

    const status =
        getString(data.paymentStatus) ||
        getString(data.payment_status) ||
        getString(data.transactionStatus) ||
        getString(data.transaction_status) ||
        getString(data.status) ||
        getString(data.resultCode) ||
        getString(data.result_code) ||
        getString(data.result)

    if (status) return status

    if (isRecord(data.data)) {
        return extractFundiinStatus(data.data)
    }

    return 'unknown'
}

export function extractFundiinTransactionId(data: unknown): string | null {
    if (!isRecord(data)) return null

    const transactionId =
        getString(data.transactionId) ||
        getString(data.transaction_id) ||
        getString(data.referenceId) ||
        getString(data.reference_id)

    if (transactionId) return transactionId

    if (isRecord(data.data)) {
        return extractFundiinTransactionId(data.data)
    }

    return null
}

export function extractFundiinOrderToken(data: unknown): string | null {
    if (!isRecord(data)) return null

    const token = getString(data.orderToken) || getString(data.order_token)

    if (token) return token

    if (isRecord(data.data)) {
        return extractFundiinOrderToken(data.data)
    }

    return null
}

export async function updateFundiinOrderStatus({
    payload,
    orderId,
    rawStatus,
    transactionId,
    orderToken,
}: UpdateFundiinOrderInput) {
    const nextStatus = mapFundiinStatus(rawStatus)

    const order: any = await payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 1,
        overrideAccess: true,
    })

    const previousPaymentStatus = order.paymentStatus
    const previousOrderStatus = order.status
    const previousFundiinStatus = order.fundiin?.paymentStatus

    const hasNoChange =
        previousPaymentStatus === nextStatus.paymentStatus &&
        previousOrderStatus === nextStatus.orderStatus &&
        previousFundiinStatus === nextStatus.normalizedStatus

    if (hasNoChange) {
        return {
            order,
            changed: false,
            status: nextStatus,
        }
    }

    const updatedOrder: any = await payload.update({
        collection: 'orders',
        id: order.id,
        depth: 1,
        overrideAccess: true,
        data: {
            paymentStatus: nextStatus.paymentStatus,
            status: nextStatus.orderStatus,
            fundiin: {
                transactionId: transactionId || order.fundiin?.transactionId || null,
                orderToken: orderToken || order.fundiin?.orderToken || null,
                paymentStatus: nextStatus.normalizedStatus,
            },
        },
    })

    await sendFundiinStatusEmails({
        payload,
        order: updatedOrder,
        status: nextStatus,
    })

    return {
        order: updatedOrder,
        changed: true,
        status: nextStatus,
    }
}