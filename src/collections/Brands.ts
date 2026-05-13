import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'

export const Brands: CollectionConfig = {
  slug: 'brands',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeChange: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description: 'Tự động tạo từ tên, có thể chỉnh sửa thủ công để tối ưu SEO',
      },
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'description', type: 'textarea' },
    { name: 'isFeatured', type: 'checkbox', label: 'Thương hiệu nổi bật' },
  ],
}
