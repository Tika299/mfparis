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
                  admin: {
                    width: '70%',
                    placeholder: 'Nhập tên sản phẩm (VD: Nước hoa Dior J’adore)',
                  },
                },
                {
                  name: 'sku',
                  type: 'text',
                  label: 'Mã sản phẩm (SKU)',
                  admin: {
                    width: '30%',
                    placeholder: 'VD: DIOR-JAD-100',
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
            /* PHẦN GIÁ VÀ KHO HÀNG - ĐÃ FIX LỖI LỆCH HÀNG */
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
              label: 'Bộ sưu tập hình ảnh (Tỷ lệ 1:1)',
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
              label: 'Mô tả ngắn (Hiển thị cạnh giá tiền)',
              admin: {
                placeholder: 'Nhập mô tả tóm tắt về sản phẩm...',
              },
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Nội dung mô tả chi tiết',
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
          ],
        },

        /* TAB 2: THÔNG SỐ KỸ THUẬT (DYNAMIC ATTRIBUTES) */
        {
          label: 'Thông số kỹ thuật',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'Thuộc tính sản phẩm',
              labels: {
                singular: 'Thông số',
                plural: 'Các thông số',
              },
              admin: {
                description: 'Thêm các thông số như: Nồng độ, Mùi hương, SPF, Calo, Thành phần...',
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
                        placeholder: 'VD: Mùi hương',
                      },
                    },
                    {
                      name: 'value',
                      type: 'text',
                      label: 'Giá trị',
                      required: true,
                      admin: {
                        width: '50%',
                        placeholder: 'VD: Hương gỗ phương Đông',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* TAB 3: CẤU HÌNH SEO */
        {
          label: 'SEO',
          fields: [
            {
              name: 'seoTitle',
              type: 'text',
              label: 'SEO Title',
              admin: {
                description: 'Tiêu đề hiển thị trên Google (Để trống sẽ lấy tên sản phẩm)',
              },
            },
            {
              name: 'seoDescription',
              type: 'textarea',
              label: 'Meta Description',
              admin: {
                description: 'Mô tả ngắn gọn khi tìm kiếm trên Google',
              },
            },
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
        description: 'Tự động tạo từ tên, có thể chỉnh sửa thủ công',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'draft',
      options: [
        { label: 'Nháp (Ẩn)', value: 'draft' },
        { label: 'Đang bán (Hiện)', value: 'published' },
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
        { label: 'Sản phẩm bán chạy', value: 'best-seller' },
        { label: 'Làm sạch làn da', value: 'cleansing' },
        { label: 'Sản phẩm mới', value: 'new-arrival' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
