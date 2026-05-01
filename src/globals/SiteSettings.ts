import { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  fields: [
    {
      name: 'heroSliders',
      type: 'array',
      label: 'Slider Trang chủ',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'link', type: 'text', label: 'Link khi bấm vào banner' },
        { name: 'title', type: 'text', label: 'Tiêu đề hiển thị (nếu có)' },
      ],
    },
    {
      name: 'header',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media' },
        {
          name: 'menu',
          type: 'array',
          fields: [
            { name: 'label', type: 'text' },
            { name: 'link', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        { name: 'hotline', type: 'text' },
        { name: 'address', type: 'textarea' },
        { name: 'facebookUrl', type: 'text' },
      ],
    },
  ],
}
