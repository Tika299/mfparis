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
              type: 'row',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: 'Tên mục menu',
                  required: true,
                  admin: {
                    width: '40%',
                    placeholder: 'Nước hoa',
                  },
                },
                {
                  name: 'link',
                  type: 'text',
                  label: 'Đường dẫn',
                  required: true,
                  admin: {
                    width: '60%',
                    placeholder: '/categories/nuoc-hoa',
                  },
                },
              ],
            },
            {
              name: 'megaGroups',
              type: 'array',
              label: 'Nhóm mega menu',
              admin: {
                description:
                  'Chỉ là nhãn nhóm trong menu, frontend render bằng div/span để không ảnh hưởng cấu trúc heading SEO.',
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Tên nhóm',
                  required: true,
                  admin: {
                    placeholder: 'Theo người dùng',
                  },
                },
                {
                  name: 'links',
                  type: 'array',
                  label: 'Liên kết trong nhóm',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'label',
                          type: 'text',
                          label: 'Tên liên kết',
                          required: true,
                          admin: {
                            width: '40%',
                            placeholder: 'Nước hoa nam',
                          },
                        },
                        {
                          name: 'link',
                          type: 'text',
                          label: 'Đường dẫn',
                          required: true,
                          admin: {
                            width: '60%',
                            placeholder: '/categories/nuoc-hoa-nam',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Thông tin liên hệ',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Số điện thoại gọi điện',
          admin: { width: '50%' },
        },
        {
          name: 'email',
          type: 'text',
          label: 'Email chăm sóc khách hàng',
          admin: { width: '50%' },
        },
        {
          name: 'zalo',
          type: 'text',
          label: 'Số Zalo hoặc Zalo ID',
          admin: { width: '50%' },
        },
        {
          name: 'zaloLink',
          type: 'text',
          label: 'Link Zalo',
          admin: { width: '50%' },
        },
        {
          name: 'address',
          type: 'textarea',
          label: 'Địa chỉ cửa hàng',
        },
        {
          name: 'facebookUrl',
          type: 'text',
          label: 'Facebook URL',
        },
        {
          name: 'googleMapUrl',
          type: 'text',
          label: 'Google Maps URL',
        },
      ],
    },
    {
      name: 'payment',
      type: 'group',
      label: 'Cấu hình thanh toán',
      fields: [
        {
          name: 'bankName',
          type: 'text',
          label: 'Tên ngân hàng',
        },
        {
          name: 'bankAccountName',
          type: 'text',
          label: 'Tên chủ tài khoản',
        },
        {
          name: 'bankAccountNumber',
          type: 'text',
          label: 'Số tài khoản',
        },
        {
          name: 'bankBranch',
          type: 'text',
          label: 'Chi nhánh',
        },
        {
          name: 'bankQrImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Ảnh QR chuyển khoản',
        },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      label: 'Footer',
      fields: [
        {
          name: 'description',
          type: 'textarea',
          label: 'Mô tả ngắn',
        },
        {
          name: 'workingHours',
          type: 'text',
          label: 'Giờ làm việc',
        },
        {
          name: 'chatUrl',
          type: 'text',
          label: 'Link chat mặc định',
        },
        {
          name: 'social',
          type: 'array',
          label: 'Mạng xã hội',
          fields: [
            {
              name: 'icon',
              type: 'select',
              label: 'Biểu tượng',
              required: true,
              options: [
                { label: 'Facebook', value: 'facebook' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'TikTok', value: 'tiktok' },
                { label: 'Zalo', value: 'zalo' },
              ],
            },
            {
              name: 'name',
              type: 'text',
              label: 'Tên hiển thị',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              required: true,
            },
          ],
        },
        {
          name: 'aboutLinks',
          type: 'array',
          label: 'Liên kết Về chúng tôi',
          admin: {
            description:
              'Các link ở cột footer Về chúng tôi. Tiêu đề cột chỉ hiển thị bằng div, không dùng thẻ heading.',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Tên liên kết',
              required: true,
            },
            {
              name: 'link',
              type: 'text',
              label: 'Đường dẫn',
              required: true,
              admin: {
                placeholder: '/about',
              },
            },
          ],
        },
        {
          name: 'policyLinks',
          type: 'array',
          label: 'Liên kết chính sách',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Tên chính sách',
              required: true,
            },
            {
              name: 'link',
              type: 'text',
              label: 'Đường dẫn',
              required: true,
              admin: {
                placeholder: '/chinh-sach-doi-tra',
              },
            },
          ],
        },
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
          type: 'relationship',
          relationTo: 'vouchers',
          hasMany: true,
          maxRows: 4,
          label: 'Voucher hiển thị tại Flash Sale',

          filterOptions: {
            status: {
              equals: 'active',
            },
          },

          admin: {
            isSortable: true,
            allowCreate: true,
            allowEdit: true,
            description:
              'Chọn tối đa 4 voucher từ kho voucher. Có thể kéo thả để thay đổi thứ tự hiển thị.',
          },
        },
      ],
    },
  ],
}
