import type {
  CollectionAfterChangeHook,
  CollectionConfig,
} from 'payload'
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn'
type EntityID = string | number

type RelationshipValue =
  | EntityID
  | {
    id: EntityID
  }

type OrderLifecycleStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'completed'
  | 'cancelled'
  | 'failed'

type OrderLifecycleDocument = {
  id: EntityID
  status?: OrderLifecycleStatus | null
  paymentMethod?: string | null
  voucherId?: RelationshipValue | null
  fundiin?: {
    paymentStatus?: string | null
  } | null
}

type RedemptionLifecycleStatus =
  | 'held'
  | 'completed'
  | 'cancelled'

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  )
}

function relationshipID(
  value: unknown,
): EntityID | null {
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
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  if (
    typeof id === 'number' &&
    Number.isFinite(id)
  ) {
    return id
  }

  if (
    typeof id === 'string' &&
    id.trim().length > 0
  ) {
    return id
  }

  return null
}

function normalizeStatus(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
}

/**
 * Điều chỉnh danh sách này đúng với giá trị
 * paymentStatus mà webhook Fundiin của bạn trả về.
 */
const FUNDIIN_SUCCESS_STATUSES =
  new Set<string>([
    'success',
    'successful',
    'paid',
    'completed',
  ])

function isSuccessfulFundiinStatus(
  value: unknown,
): boolean {
  return FUNDIIN_SUCCESS_STATUSES.has(
    normalizeStatus(value),
  )
}

/**
 * Đồng bộ vòng đời Order với VoucherRedemptions.
 *
 * Quy tắc:
 * - completed/Fundiin thành công:
 *     held -> completed
 *
 * - cancelled/failed:
 *     held hoặc completed -> cancelled
 *     usedCount giảm tương ứng
 */
const handleVoucherLifecycle:
  CollectionAfterChangeHook<OrderLifecycleDocument> =
  async ({
    doc,
    previousDoc,
    operation,
    req,
  }) => {
    /**
     * Redemption được tạo riêng trong API tạo đơn.
     * Hook này chỉ xử lý khi Order được cập nhật.
     */
    if (
      operation !== 'update' ||
      !previousDoc
    ) {
      return doc
    }

    const currentOrderStatus =
      normalizeStatus(doc.status)

    const previousOrderStatus =
      normalizeStatus(
        previousDoc.status,
      )

    const movedToCancelled =
      (
        currentOrderStatus ===
        'cancelled' ||
        currentOrderStatus === 'failed'
      ) &&
      currentOrderStatus !==
      previousOrderStatus

    const movedToCompleted =
      currentOrderStatus ===
      'completed' &&
      previousOrderStatus !==
      'completed'

    const currentFundiinStatus =
      doc.fundiin?.paymentStatus

    const previousFundiinStatus =
      previousDoc.fundiin
        ?.paymentStatus

    const fundiinJustSucceeded =
      isSuccessfulFundiinStatus(
        currentFundiinStatus,
      ) &&
      !isSuccessfulFundiinStatus(
        previousFundiinStatus,
      )

    const shouldCancelVoucher =
      movedToCancelled

    const shouldCompleteVoucher =
      movedToCompleted ||
      fundiinJustSucceeded

    if (
      !shouldCancelVoucher &&
      !shouldCompleteVoucher
    ) {
      return doc
    }

    const voucherID =
      relationshipID(doc.voucherId) ??
      relationshipID(
        previousDoc.voucherId,
      )

    /**
     * Đơn không sử dụng voucher thì không cần xử lý.
     */
    if (voucherID === null) {
      return doc
    }

    const redemptionResult =
      await req.payload.find({
        collection:
          'voucher-redemptions',

        depth: 0,
        limit: 10,
        pagination: false,

        overrideAccess: true,

        /**
         * Quan trọng:
         * truyền req để tham gia cùng transaction
         * với thao tác cập nhật Order.
         */
        req,

        where: {
          order: {
            equals: doc.id,
          },
        },
      })

    if (
      redemptionResult.docs.length === 0
    ) {
      console.warn(
        `[Orders] Order ${String(
          doc.id,
        )
        } có voucher nhưng không tìm thấy VoucherRedemption.`,
      )

      return doc
    }

    /**
     * Trường hợp hủy đơn được ưu tiên.
     * Nếu cùng một update có dữ liệu mâu thuẫn,
     * không được đánh dấu voucher completed.
     */
    if (shouldCancelVoucher) {
      const cancellableRedemptions =
        redemptionResult.docs.filter(
          (redemption) =>
            redemption.status ===
            'held' ||
            redemption.status ===
            'completed',
        )

      if (
        cancellableRedemptions.length ===
        0
      ) {
        /**
         * Redemption đã cancelled từ trước.
         * Không giảm usedCount lần thứ hai.
         */
        return doc
      }

      for (
        const redemption of
        cancellableRedemptions
      ) {
        await req.payload.update({
          collection:
            'voucher-redemptions',

          id: redemption.id,

          overrideAccess: true,
          req,

          data: {
            status: 'cancelled',
          },
        })
      }

      const voucher =
        await req.payload.findByID({
          collection: 'vouchers',
          id: voucherID,
          depth: 0,
          overrideAccess: true,
          req,
        })

      const currentUsedCount =
        typeof voucher.usedCount ===
          'number' &&
          Number.isFinite(
            voucher.usedCount,
          )
          ? Math.max(
            0,
            Math.floor(
              voucher.usedCount,
            ),
          )
          : 0

      /**
       * Bình thường mỗi Order chỉ có một redemption,
       * nên giá trị sẽ giảm 1.
       *
       * Nếu dữ liệu từng bị tạo trùng redemption,
       * số lượt giảm tương ứng số bản ghi thực sự
       * vừa chuyển sang cancelled.
       */
      const nextUsedCount =
        Math.max(
          0,
          currentUsedCount -
          cancellableRedemptions.length,
        )

      if (
        nextUsedCount !==
        currentUsedCount
      ) {
        await req.payload.update({
          collection: 'vouchers',
          id: voucherID,

          overrideAccess: true,
          req,

          data: {
            usedCount:
              nextUsedCount,
          },
        })
      }

      return doc
    }

    if (shouldCompleteVoucher) {
      const heldRedemptions =
        redemptionResult.docs.filter(
          (
            redemption,
          ): redemption is typeof redemption & {
            status: 'held'
          } =>
            redemption.status ===
            'held',
        )

      /**
       * Redemption đã completed hoặc cancelled
       * thì không cập nhật lại.
       */
      if (
        heldRedemptions.length === 0
      ) {
        return doc
      }

      for (
        const redemption of
        heldRedemptions
      ) {
        await req.payload.update({
          collection:
            'voucher-redemptions',

          id: redemption.id,

          overrideAccess: true,
          req,

          data: {
            status:
              'completed' satisfies RedemptionLifecycleStatus,
          },
        })
      }
    }

    return doc
  }

const sendOrderEmail = async ({ doc, operation, req }: any) => {
  if (operation === 'create') {
    const { payload } = req
    console.log('Dữ liệu đơn hàng:', doc.id)

    const escapeEmailHTML = (value: unknown): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const formatEmailMoney = (value: unknown): string => {
      const amount = typeof value === 'number' ? value : Number(value ?? 0)

      return Number.isFinite(amount)
        ? amount.toLocaleString('vi-VN')
        : '0'
    }

    const orderItems = Array.isArray(doc.items) ? doc.items : []
    const customerEmail =
      typeof doc.customerInfo?.email === 'string'
        ? doc.customerInfo.email.trim().toLowerCase()
        : ''

    const canSendCustomerEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)

    const orderItemRows = orderItems.length > 0
      ? orderItems
        .map((item: any) => {
          const product =
            item.product &&
              typeof item.product === 'object'
              ? item.product
              : null

          const title =
            item.productTitleSnapshot ||
            product?.title ||
            'Sản phẩm'

          const variantName =
            item.variantNameSnapshot
              ? `<div style="margin-top: 4px; color: #555; font-size: 12px;">${escapeEmailHTML(item.variantNameSnapshot)}</div>`
              : ''

          const sku =
            item.skuSnapshot
              ? `<div style="margin-top: 2px; color: #777; font-size: 12px;">SKU: ${escapeEmailHTML(item.skuSnapshot)}</div>`
              : ''

          const quantity =
            typeof item.quantity === 'number' &&
              Number.isFinite(item.quantity)
              ? item.quantity
              : 0

          const price =
            typeof item.priceAtPurchase === 'number' &&
              Number.isFinite(item.priceAtPurchase)
              ? item.priceAtPurchase
              : 0

          return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">
                  <b>${escapeEmailHTML(title)}</b>
                  ${variantName}
                  ${sku}
                </td>
                <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${quantity}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formatEmailMoney(price)}₫</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formatEmailMoney(quantity * price)}₫</td>
              </tr>
            `
        })
        .join('')
      : `
              <tr>
                <td colspan="4" style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #777;">
                  Chưa có sản phẩm trong đơn.
                </td>
              </tr>
            `

    // Nội dung Email dạng HTML
    const htmlEmail = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="text-align: center; color: #d90429;">ĐƠN HÀNG MỚI #${doc.id}</h2>
        <p>Chào chủ shop, bạn có một đơn hàng mới từ <b>${escapeEmailHTML(doc.customerInfo.fullName)}</b>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Sản phẩm</th>
              <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">SL</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Đơn giá</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemRows}
          </tbody>
        </table>

        <p style="text-align: right; font-size: 18px;"><b>Tổng cộng: <span style="color: #d90429;">${formatEmailMoney(doc.totalAmount)}₫</span></b></p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="margin-top: 0;">Thông tin giao hàng:</h4>
          <p style="margin: 5px 0;">SĐT: ${escapeEmailHTML(doc.customerInfo.phone)}</p>
          <p style="margin: 5px 0;">Địa chỉ: ${escapeEmailHTML(doc.customerInfo.address)}, ${escapeEmailHTML(doc.customerInfo.province)}</p>
          <p style="margin: 5px 0;">Thanh toán: ${escapeEmailHTML(String(doc.paymentMethod || '').toUpperCase())}</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="${NEXT_PUBLIC_URL}/admin/collections/orders/${doc.id}" 
             style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold;">
            XEM ĐƠN TRONG ADMIN
          </a>
        </p>
      </div>
    `

    const customerHtmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; color: #222; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background: #b72828; color: #fff; padding: 24px; text-align: center;">
          <div style="font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;">Marais de France</div>
          <h2 style="margin: 10px 0 0; font-size: 24px;">Cảm ơn bạn đã đặt hàng</h2>
        </div>

        <div style="padding: 24px;">
          <p style="margin: 0 0 12px;">Xin chào <b>${escapeEmailHTML(doc.customerInfo.fullName)}</b>,</p>
          <p style="margin: 0 0 18px; line-height: 1.6;">
            MF Paris đã nhận được đơn hàng <b>#${escapeEmailHTML(doc.id)}</b>. Chúng tôi sẽ kiểm tra và liên hệ xác nhận trong thời gian sớm nhất.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Sản phẩm</th>
                <th style="text-align: center; padding: 10px; border: 1px solid #ddd;">SL</th>
                <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Đơn giá</th>
                <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${orderItemRows}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 18px; margin: 18px 0;">
            <b>Tổng thanh toán: <span style="color: #b72828;">${formatEmailMoney(doc.totalAmount)}₫</span></b>
          </div>

          <div style="background: #f9fafb; padding: 16px; border-radius: 10px; line-height: 1.6;">
            <p style="margin: 0 0 6px;"><b>Thông tin nhận hàng</b></p>
            <p style="margin: 0;">SĐT: ${escapeEmailHTML(doc.customerInfo.phone)}</p>
            <p style="margin: 0;">Địa chỉ: ${escapeEmailHTML(doc.customerInfo.address)}, ${escapeEmailHTML(doc.customerInfo.province)}</p>
            <p style="margin: 0;">Thanh toán: ${escapeEmailHTML(String(doc.paymentMethod || '').toUpperCase())}</p>
          </div>

          <p style="margin: 18px 0 0; color: #666; line-height: 1.6;">
            Nếu thông tin đơn hàng chưa đúng, bạn vui lòng phản hồi email này hoặc liên hệ hotline 079.29.79.299 để MF Paris hỗ trợ.
          </p>

          <p style="text-align: center; margin: 26px 0 0;">
            <a href="${NEXT_PUBLIC_URL}" style="display: inline-block; background: #111; color: #fff; padding: 12px 22px; border-radius: 999px; text-decoration: none; font-weight: bold;">
              Tiếp tục mua sắm
            </a>
          </p>
        </div>
      </div>
    `

    try {
      await payload.sendEmail({
        to: 'vukofa9120@gmail.com', // Email bạn muốn nhận thông báo
        subject: `[MF PARIS] Đơn hàng mới #${doc.id} - ${doc.customerInfo.fullName}`,
        html: htmlEmail,
      })
    } catch (error) {
      console.error('Lỗi gửi email đơn hàng cho shop:', error)
    }

    if (canSendCustomerEmail) {
      try {
        await payload.sendEmail({
          to: customerEmail,
          subject: `[MF Paris] Xác nhận đơn hàng #${doc.id}`,
          html: customerHtmlEmail,
        })
      } catch (error) {
        console.error('Lỗi gửi email xác nhận cho khách:', error)
      }
    }
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  hooks: {
    afterChange: [
      handleVoucherLifecycle,
      sendOrderEmail,
    ],
  },
  admin: {
    useAsTitle: 'id',
    group: 'Kinh doanh',
  },
  fields: [
    {
      name: 'adminOrderSummary',
      type: 'ui',
      admin: {
        components: {
          Field: {
            path: '@/components/Admin/OrderAdminSummary#OrderAdminSummary',
          },
        },
      },
    },
    // TRƯỜNG QUAN TRỌNG NHẤT: Thêm trường customer để sửa lỗi Join
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      index: true,
      label: 'Khách hàng (Tài khoản)',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'customerInfo',
      type: 'group',
      label: 'Thông tin giao hàng (Vietnam Checkout)',
      fields: [
        { name: 'fullName', type: 'text', required: true, label: 'Họ tên người nhận' },
        { name: 'phone', type: 'text', required: true, label: 'Số điện thoại' },
        { name: 'email', type: 'text' },
        { name: 'address', type: 'text', label: 'Địa chỉ cụ thể' },
        { name: 'province', type: 'text', label: 'Tỉnh/Thành' },
        { name: 'district', type: 'text', label: 'Quận/Huyện' },
        { name: 'ward', type: 'text', label: 'Phường/Xã' },
      ],
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      defaultValue: 'home_delivery',
      index: true,
      label: 'Hình thức nhận hàng',
      options: [
        {
          label: 'Giao hàng tận nơi',
          value: 'home_delivery',
        },
        {
          label: 'Nhận tại cửa hàng',
          value: 'store_pickup',
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Danh sách sản phẩm',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          label: 'Sản phẩm',
        },
        {
          name: 'variantId',
          type: 'text',
          label: 'Variant ID',
          admin: {
            description:
              'ID của biến thể trong products.variants tại thời điểm mua.',
          },
        },
        {
          name: 'productTitleSnapshot',
          type: 'text',
          required: true,
          label: 'Tên sản phẩm lúc mua',
        },
        {
          name: 'variantNameSnapshot',
          type: 'text',
          label: 'Tên biến thể lúc mua',
        },
        {
          name: 'skuSnapshot',
          type: 'text',
          label: 'SKU lúc mua',
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          label: 'Số lượng',
          validate: (value: unknown) => {
            if (
              typeof value !== 'number' ||
              !Number.isInteger(value) ||
              value <= 0
            ) {
              return 'Số lượng phải là số nguyên lớn hơn 0.'
            }

            return true
          },
        },
        {
          name: 'priceAtPurchase',
          type: 'number',
          required: true,
          min: 0,
          label: 'Giá lúc mua',
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      label: 'Tổng tiền đơn hàng',
    },
    {
      name: 'paymentMethod',
      type: 'select',
      defaultValue: 'cod',
      index: true,
      options: [
        { label: 'COD (Thanh toán khi nhận hàng)', value: 'cod' },
        { label: 'Chuyển khoản ngân hàng', value: 'bank_transfer' },
        { label: 'Thanh toán qua Fundiin', value: 'fundiin' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      index: true,
      label: 'Trạng thái thanh toán',
      options: [
        {
          label: 'Chưa thanh toán',
          value: 'unpaid',
        },
        {
          label: 'Chờ xác nhận',
          value: 'pending',
        },
        {
          label: 'Đã thanh toán',
          value: 'paid',
        },
        {
          label: 'Thanh toán thất bại',
          value: 'failed',
        },
        {
          label: 'Đã hoàn tiền',
          value: 'refunded',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Chờ xử lý', value: 'pending' },
        { label: 'Đã xác nhận', value: 'confirmed' },
        { label: 'Đang giao', value: 'shipping' },
        { label: 'Hoàn thành', value: 'completed' },
        { label: 'Đã hủy', value: 'cancelled' },
        {
          label: 'Thanh toán thất bại',
          value: 'failed',
        },
      ],
    },
    {
      name: 'fundiin',
      type: 'group',
      fields: [
        { name: 'transactionId', type: 'text', admin: { readOnly: true } },
        { name: 'paymentStatus', type: 'text', admin: { readOnly: true } },
        { name: 'orderToken', type: 'text', admin: { readOnly: true } },
      ],
      admin: { position: 'sidebar' }
    },
    {
      name: 'subtotalAmount',
      type: 'number',
      label: 'Tạm tính',
    },
    {
      name: 'discountAmount',
      type: 'number',
      label: 'Giảm giá',
      defaultValue: 0,
    },
    {
      name: 'shippingFee',
      type: 'number',
      label: 'Phí vận chuyển',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'voucherCode',
      type: 'text',
      index: true,
      label: 'Mã voucher',
    },
    {
      name: 'voucherId',
      type: 'relationship',
      relationTo: 'vouchers',
      label: 'Voucher đã dùng',
    },
  ],
}
