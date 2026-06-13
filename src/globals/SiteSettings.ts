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
    {
      name: 'flashSale',
      type: 'group',
      label: 'Flash Sale',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Bật Flash Sale',
          defaultValue: true,
        },
        {
          name: 'endTime',
          type: 'date',
          label: 'Thời gian kết thúc',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'dd/MM/yyyy HH:mm',
            },
          },
        },
        {
          name: 'vouchers',
          type: 'array',
          label: 'Danh sách voucher',
          maxRows: 4,
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Tiêu đề',
              defaultValue: 'Voucher',
            },
            {
              name: 'value',
              type: 'text',
              label: 'Giá trị',
              defaultValue: '15K',
            },
            {
              name: 'sub',
              type: 'text',
              label: 'Điều kiện',
              defaultValue: 'Đơn từ 799K',
            },
          ],
        },
      ],
    },
  ],
}
