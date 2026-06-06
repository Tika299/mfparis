import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'

export const Products: CollectionConfig = {
  slug: 'products',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', 'status', 'updatedAt'],
    group: 'Kinh doanh',
  },

  access: {
    read: () => true,
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thông tin chung',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  label: 'Tên sản phẩm',
                  admin: {
                    width: '70%',
                  },
                },
                {
                  name: 'sku',
                  type: 'text',
                  label: 'Mã SKU',
                  admin: {
                    width: '30%',
                  },
                },
              ],
            },

            {
              type: 'row',
              fields: [
                {
                  name: 'brand',
                  type: 'relationship',
                  relationTo: 'brands',
                  required: true,
                  label: 'Thương hiệu',
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'categories',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                  label: 'Danh mục sản phẩm',
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },

            {
              name: 'price',
              type: 'group',
              label: 'Giá & Kho hàng',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'basePrice',
                      type: 'number',
                      required: true,
                      label: 'Giá niêm yết (đ)',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'salePrice',
                      type: 'number',
                      label: 'Giá khuyến mãi (đ)',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'stock',
                      type: 'number',
                      label: 'Số lượng kho',
                      defaultValue: 0,
                      admin: {
                        width: '33.33%',
                      },
                    },
                  ],
                },
              ],
            },

            {
              name: 'images',
              type: 'array',
              label: 'Bộ sưu tập hình ảnh',
              admin: {
                description: 'Ảnh sản phẩm nên dùng tỉ lệ 1:1 để hiển thị đẹp.',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Ảnh',
                },
              ],
            },

            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Mô tả ngắn',
              admin: {
                rows: 4,
                description: 'Hiển thị ở phần đầu trang sản phẩm.',
              },
            },
          ],
        },

        {
          label: 'Thông số kỹ thuật',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'Thông số tùy chỉnh',
              admin: {
                description: 'Dùng cho dung tích, xuất xứ, nhóm hương, loại da, nồng độ...',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: 'Tên thông số',
                      required: true,
                      admin: {
                        width: '50%',
                      },
                    },
                    {
                      name: 'value',
                      type: 'text',
                      label: 'Giá trị',
                      required: true,
                      admin: {
                        width: '50%',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: 'Nội dung chi tiết',
          fields: [
            {
              name: 'accordions',
              type: 'array',
              label: 'Các mục nội dung xổ xuống',
              admin: {
                description:
                  'Nội dung sản phẩm đã được tách theo thẻ H2 từ WordPress. Mỗi mục gồm tiêu đề và nội dung RichText.',
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Tiêu đề mục',
                  required: true,
                },
                {
                  name: 'content',
                  type: 'richText',
                  label: 'Nội dung mục',
                  required: true,
                  admin: {
                    description: 'Nội dung đã được convert từ HTML sang RichText.',
                  },
                },
              ],
            },
          ],
        },

        {
          label: 'Combo',
          fields: [
            {
              name: 'isCombo',
              type: 'checkbox',
              label: 'Đây là bộ sản phẩm / combo',
              defaultValue: false,
            },
            {
              name: 'comboItems',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              label: 'Danh sách sản phẩm trong combo',
              admin: {
                condition: (data) => data?.isCombo,
              },
            },
          ],
        },

        {
          label: 'SEO',
          fields: [
            {
              name: 'seoTitle',
              type: 'text',
              label: 'SEO Title',
            },
            {
              name: 'seoDescription',
              type: 'textarea',
              label: 'Meta Description',
              admin: {
                rows: 4,
              },
            },
          ],
        },
      ],
    },

    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Đường dẫn',
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description: 'Tự động tạo từ tên sản phẩm, có thể chỉnh tay để tối ưu SEO.',
      },
    },

    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'draft',
      options: [
        {
          label: 'Nháp',
          value: 'draft',
        },
        {
          label: 'Đang bán',
          value: 'published',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },

    {
      name: 'displayLocation',
      type: 'select',
      label: 'Vị trí trang chủ',
      hasMany: true,
      options: [
        {
          label: 'Sản phẩm bán chạy',
          value: 'best-seller',
        },
        {
          label: 'Sản phẩm combo',
          value: 'cleansing',
        },
        {
          label: 'Sản phẩm mới',
          value: 'new-arrival',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}