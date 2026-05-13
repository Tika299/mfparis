import { CollectionConfig } from 'payload'

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
      admin: { position: 'sidebar' },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Ảnh đại diện bài viết',
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Review Nước Hoa', value: 'review' },
        { label: 'Kinh Nghiệm Làm Đẹp', value: 'beauty' },
        { label: 'Tin Tức MF Paris', value: 'news' },
      ],
    },
    {
      name: 'content',
      type: 'richText', // Sử dụng Lexical editor đã cấu hình trong payload.config
      label: 'Nội dung bài viết',
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
