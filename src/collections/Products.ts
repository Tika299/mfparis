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
        /* TAB 1: THÔNG TIN CHUNG */
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
                  admin: { width: '70%' },
                },
                {
                  name: 'sku',
                  type: 'text',
                  label: 'Mã SKU',
                  admin: { width: '30%' },
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
                  admin: { width: '50%' },
                },
                {
                  name: 'categories',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                  label: 'Danh mục sản phẩm',
                  admin: { width: '50%' },
                },
              ],
            },
            /* PHẦN GIÁ & KHO HÀNG - FIX LỖI LỆCH HÀNG */
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
                      admin: { width: '33.33%' },
                    },
                    {
                      name: 'salePrice',
                      type: 'number',
                      label: 'Giá khuyến mãi (đ)',
                      admin: { width: '33.33%' },
                    },
                    {
                      name: 'stock',
                      type: 'number',
                      label: 'Số lượng kho',
                      defaultValue: 0,
                      admin: { width: '33.33%' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'images',
              type: 'array',
              label: 'Bộ sưu tập hình ảnh (Tỉ lệ 1:1)',
              minRows: 1,
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
              ],
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Mô tả ngắn (Hiển thị đầu trang)',
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Mô tả chi tiết (Dạng khối)',
              admin: {
                description: 'Dùng cho nội dung dài hiển thị dưới cùng trang web.'
              }
            },
          ],
        },

        /* TAB 2: THÔNG SỐ KỸ THUẬT (DYNAMIC ATTRIBUTES) */
        {
          label: 'Thông số kỹ thuật',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'Thông số tùy chỉnh',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', label: 'Tên thông số', required: true, admin: { width: '50%' } },
                    { name: 'value', type: 'text', label: 'Giá trị', required: true, admin: { width: '50%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* TAB 3: CHI TIẾT DẠNG ACCORDION (KIỂU LONG CHÂU/HARAVAN) */
        {
          label: 'Chi tiết bổ sung',
          fields: [
            {
              name: 'accordions',
              type: 'array',
              label: 'Các mục nội dung xổ xuống',
              admin: {
                description: 'Nội dung import từ WordPress sẽ tự động chia vào đây theo thẻ H2.'
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
                },
              ],
            },
          ],
        },

        /* TAB 4: COMBO SETTINGS */
        {
          label: 'Combo',
          fields: [
            {
              name: 'isCombo',
              type: 'checkbox',
              label: 'Đây là bộ sản phẩm (Combo)',
              defaultValue: false,
            },
            {
              name: 'comboItems',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              label: 'Danh sách sản phẩm trong bộ',
              admin: {
                condition: (data) => data?.isCombo,
              },
            },
          ],
        },

        /* TAB 5: SEO */
        {
          label: 'SEO',
          fields: [
            { name: 'seoTitle', type: 'text', label: 'SEO Title' },
            { name: 'seoDescription', type: 'textarea', label: 'Meta Description' },
          ],
        },
      ],
    },

    /* SIDEBAR (CỘT PHẢI) */
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Đường dẫn (Slug)',
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'draft',
      options: [
        { label: 'Nháp', value: 'draft' },
        { label: 'Đang bán', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'displayLocation',
      type: 'select',
      label: 'Vị trí trang chủ',
      hasMany: true,
      options: [
        { label: 'Sản phẩm bán chạy', value: 'best-seller' },
        { label: 'Sản phẩm combo', value: 'cleansing' },
        { label: 'Sản phẩm mới', value: 'new-arrival' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}