import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    group: 'Nội dung',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tiêu đề bài viết',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description: 'Tự động tạo từ tên, có thể chỉnh sửa thủ công để tối ưu SEO',
      },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Ảnh đại diện bài viết',
    },
    {
      name: 'categories', // Đổi tên thành số nhiều nếu muốn chọn nhiều danh mục
      type: 'relationship',
      relationTo: 'post-categories', // Kết nối tới collection vừa tạo ở Bước 1
      hasMany: true, // Cho phép 1 bài viết thuộc nhiều danh mục (giống WordPress)
      label: 'Danh mục bài viết',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'content',
      type: 'richText', // Sử dụng Lexical editor đã cấu hình trong payload.config
      label: 'Nội dung bài viết',
      admin: {
        description: 'Bạn có thể dùng trình soạn thảo trực quan hoặc dán mã HTML vào.',
        components: {
          // Thêm component xem trước vào sau ô nhập liệu
          afterInput: [
            {
              path: '@/components/Admin/RichTextPreview#RichTextPreview',
            },
          ],
        },
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Mô tả ngắn (Hiển thị ở trang danh sách bài viết)',
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Cấu hình SEO',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
      ],
    },
  ],
}
