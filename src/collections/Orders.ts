import { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
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
      required: true,
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
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'quantity', type: 'number', required: true },
        { name: 'priceAtPurchase', type: 'number', required: true, label: 'Giá lúc mua' },
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
  ],
}
