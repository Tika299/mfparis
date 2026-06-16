import { CollectionConfig } from 'payload'

const sendOrderEmail = async ({ doc, operation, req }: any) => {
  if (operation === 'create') {
    const { payload } = req
    console.log('Dữ liệu đơn hàng:', doc.id)
    // Nội dung Email dạng HTML
    const htmlEmail = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="text-align: center; color: #d90429;">ĐƠN HÀNG MỚI #${doc.id}</h2>
        <p>Chào chủ shop, bạn có một đơn hàng mới từ <b>${doc.customerInfo.fullName}</b>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Sản phẩm</th>
              <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">SL</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Giá</th>
            </tr>
          </thead>
          <tbody>
            ${doc.items
        .map(
          (item: any) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${item.product.title || 'Sản phẩm'}</td>
                <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.priceAtPurchase.toLocaleString()}₫</td>
              </tr>
            `,
        )
        .join('')}
          </tbody>
        </table>

        <p style="text-align: right; font-size: 18px;"><b>Tổng cộng: <span style="color: #d90429;">${doc.totalAmount.toLocaleString()}₫</span></b></p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="margin-top: 0;">Thông tin giao hàng:</h4>
          <p style="margin: 5px 0;">SĐT: ${doc.customerInfo.phone}</p>
          <p style="margin: 5px 0;">Địa chỉ: ${doc.customerInfo.address}, ${doc.customerInfo.province}</p>
          <p style="margin: 5px 0;">Thanh toán: ${doc.paymentMethod.toUpperCase()}</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="https://maraisdefrance.vn/admin/collections/orders/${doc.id}" 
             style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold;">
            XEM ĐƠN TRONG ADMIN
          </a>
        </p>
      </div>
    `

    try {
      await payload.sendEmail({
        to: 'mfparisvn@gmail.com', // Email bạn muốn nhận thông báo
        subject: `[MF PARIS] Đơn hàng mới #${doc.id} - ${doc.customerInfo.fullName}`,
        html: htmlEmail,
      })
    } catch (error) {
      console.error('Lỗi gửi email:', error)
    }
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  hooks: {
    afterChange: [sendOrderEmail],
  },
  admin: {
    useAsTitle: 'id',
    group: 'Kinh doanh',
  },
  fields: [
    // TRƯỜNG QUAN TRỌNG NHẤT: Thêm trường customer để sửa lỗi Join
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: false,
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
      options: [
        { label: 'COD (Thanh toán khi nhận hàng)', value: 'cod' },
        { label: 'Chuyển khoản ngân hàng', value: 'bank_transfer' },
        { label: 'Thanh toán qua Fundiin', value: 'fundiin' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Chờ xử lý', value: 'pending' },
        { label: 'Đã xác nhận', value: 'confirmed' },
        { label: 'Đang giao', value: 'shipping' },
        { label: 'Hoàn thành', value: 'completed' },
        { label: 'Đã hủy', value: 'cancelled' },
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
      name: 'voucherCode',
      type: 'text',
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
