import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'description',
      type: 'richText',
      label: 'Mô tả danh mục',
      admin: {
        description: 'Mô tả danh mục đã được convert sang RichText.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: { beforeChange: [beforeChangeSlug] },
      admin: {
        position: 'sidebar',
        description: 'Tự động tạo từ tên, có thể chỉnh sửa thủ công để tối ưu SEO',
      },
    },
    { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Danh mục cha' },
  ],
}
