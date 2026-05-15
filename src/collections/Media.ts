import { CollectionConfig } from 'payload'
import path from 'path'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media', // Ảnh sẽ lưu trong thư mục /media ở gốc dự án
    imageSizes: [
      {
        name: 'thumbnail', // Dùng cho ảnh giỏ hàng, tìm kiếm nhanh
        width: 150,
        height: 150,
        position: 'centre',
      },
      {
        name: 'card', // Dùng cho danh sách sản phẩm (Tỉ lệ 1:1)
        width: 600,
        height: 600,
        position: 'centre',
      },
      {
        name: 'large', // Dùng cho ảnh chính trang chi tiết
        width: 1200,
        height: undefined, // Tự động theo tỉ lệ ảnh gốc
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true, // Bắt buộc nhập Alt text để Google Index ảnh tốt
      label: 'Mô tả hình ảnh (SEO)',
    },
  ],
}
