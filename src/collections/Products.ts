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
    read: () => true, // Cho phép mọi người xem sản phẩm
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        /* TAB 1: THÔNG TIN CƠ BẢN */
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
                },
                {
                  name: 'categories',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                  label: 'Danh mục sản phẩm',
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'price',
                  type: 'group',
                  label: 'Giá & Kho hàng',
                  fields: [
                    {
                      type: 'row', // Đưa cả 3 ô vào cùng 1 hàng
                      fields: [
                        {
                          name: 'basePrice',
                          type: 'number',
                          required: true,
                          label: 'Giá niêm yết (đ)',
                          admin: {
                            width: '33.33%', // Chia đều 1/3 hàng
                          },
                        },
                        {
                          name: 'salePrice',
                          type: 'number',
                          label: 'Giá khuyến mãi (đ)',
                          admin: {
                            width: '33.33%', // Chia đều 1/3 hàng
                          },
                        },
                        {
                          name: 'stock',
                          type: 'number',
                          label: 'Số lượng kho',
                          defaultValue: 0,
                          admin: {
                            width: '33.33%', // Chia đều 1/3 hàng
                          },
                        },
                      ],
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
              label: 'Mô tả ngắn (Hiện ở đầu trang chi tiết)',
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Nội dung mô tả chi tiết',
            },
          ],
        },

        /* TAB 2: THUỘC TÍNH TỰ ĐỊNH NGHĨA (Đây là phần bạn yêu cầu) */
        {
          label: 'Thông số kỹ thuật',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'Thông số tùy chỉnh',
              labels: {
                singular: 'Thông số',
                plural: 'Các thông số',
              },
              admin: {
                description: 'Bạn có thể tự thêm các ô như: Mùi hương, SPF, Calo, Thành phần...',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: 'Tên thuộc tính (VD: Nồng độ)',
                      required: true,
                    },
                    {
                      name: 'value',
                      type: 'text',
                      label: 'Giá trị (VD: EDP 20%)',
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* TAB 3: CẤU HÌNH SEO (RANK MATH STYLE) */
        {
          label: 'SEO',
          fields: [
            {
              name: 'seoTitle',
              type: 'text',
              label: 'SEO Title',
              admin: {
                description: 'Tiêu đề hiển thị trên Google (Mặc định sẽ lấy tên sản phẩm)',
              },
            },
            {
              name: 'seoDescription',
              type: 'textarea',
              label: 'Meta Description',
              admin: {
                description: 'Mô tả ngắn hiển thị trên kết quả tìm kiếm Google',
              },
            },
          ],
        },
      ],
    },

    /* SIDEBAR FIELDS */
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Đường dẫn (Slug)',
      hooks: {
        // Gắn hook xử lý tự động vào đây
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description: 'Tự động tạo từ tên, có thể chỉnh sửa thủ công để tối ưu SEO',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái sản phẩm',
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
      label: 'Hiển thị trên trang chủ',
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
  hooks: {
    // Tự động tạo slug từ title nếu slug trống
    beforeValidate: [
      ({ data }) => {
        if (data?.title && !data.slug) {
          return {
            ...data,
            slug: data.title
              .toLowerCase()
              .replace(/ /g, '-')
              .replace(/[^\w-]+/g, ''),
          }
        }
        return data
      },
    ],
  },
}
