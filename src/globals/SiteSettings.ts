import { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  fields: [
    {
      name: 'heroSliders',
      type: 'array',
      label: 'Slider Trang chủ (Đa thiết bị)',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'imageDesktop',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Ảnh PC (Gợi ý: 1920x800)',
              admin: { width: '33%' },
            },
            {
              name: 'imageTablet',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Ảnh Tablet (Gợi ý: 1024x1024)',
              admin: { width: '33%' },
            },
            {
              name: 'imageMobile',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Ảnh Mobile (Gợi ý: 600x800)',
              admin: { width: '33%' },
            },
          ],
        },
        {
          name: 'link',
          type: 'text',
          label: 'Đường dẫn khi click',
        },
      ],
    },
    {
      name: 'header',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo Website' },
        {
          name: 'navItems',
          type: 'array',
          label: 'Menu điều hướng',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Tên mục menu (VD: Nước hoa)',
              required: true,
            },
            {
              name: 'link',
              type: 'text',
              label: 'Đường dẫn (VD: /categories/nuoc-hoa)',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Số điện thoại gọi điện',
          admin: { width: '50%' },
        },
        {
          name: 'zaloLink',
          type: 'text',
          label: 'Link Zalo (Zalo ME)',
          admin: { width: '50%' },
        },
        { name: 'address', type: 'textarea' },
        { name: 'facebookUrl', type: 'text' },
      ],
    },
  ],
}
