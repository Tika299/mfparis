import { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'title' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thông tin chung',
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Tên sản phẩm' },
            {
              name: 'brand',
              type: 'relationship',
              relationTo: 'brands',
              required: true,
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
            },
            {
              name: 'price',
              type: 'group',
              fields: [
                { name: 'basePrice', type: 'number', label: 'Giá niêm yết' },
                { name: 'salePrice', type: 'number', label: 'Giá khuyến mãi' },
              ],
            },
            { name: 'sku', type: 'text', label: 'Mã sản phẩm (SKU)' },
            { name: 'stock', type: 'number', label: 'Số lượng trong kho', defaultValue: 0 },
            {
              name: 'images',
              type: 'array',
              label: 'Bộ sưu tập ảnh',
              fields: [{ name: 'image', type: 'upload', relationTo: 'media' }],
            },
          ],
        },
        {
          label: 'Chi tiết & Thuộc tính',
          fields: [
            { name: 'shortDescription', type: 'textarea', label: 'Mô tả ngắn' },
            { name: 'description', type: 'richText', label: 'Nội dung chi tiết' },
            {
              name: 'attributes',
              type: 'group',
              fields: [
                { name: 'origin', type: 'text', label: 'Xuất xứ' },
                { name: 'concentration', type: 'text', label: 'Nồng độ (Nước hoa)' },
                { name: 'volume', type: 'text', label: 'Dung tích' },
                {
                  name: 'gender',
                  type: 'select',
                  options: [
                    { label: 'Nam', value: 'men' },
                    { label: 'Nữ', value: 'women' },
                    { label: 'Unisex', value: 'unisex' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'SEO (Rank Math Pro)',
          fields: [
            { name: 'seoTitle', type: 'text', label: 'SEO Title' },
            { name: 'seoDescription', type: 'textarea', label: 'Meta Description' },
            {
              name: 'ogImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Ảnh chia sẻ (FB/Zalo)',
            },
          ],
        },
      ],
    },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { position: 'sidebar' } },
    {
      name: 'status',
      type: 'select',
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
      hasMany: true, // Một sản phẩm có thể vừa là Bán chạy, vừa thuộc mục Làm sạch
      label: 'Vị trí hiển thị trang chủ',
      options: [
        { label: 'Sản phẩm bán chạy', value: 'best-seller' },
        { label: 'Làm sạch làn da', value: 'cleansing' },
        { label: 'Sản phẩm mới', value: 'new-arrival' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
