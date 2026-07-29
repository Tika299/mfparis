import { revalidateTag } from 'next/cache'
import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  Where,
} from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { trackProductSlugHistory } from '@/collections/hooks/trackSlugHistory'
import { ensureLegacyProductRedirectHook } from '@/collections/hooks/ensureLegacyProductRedirect'
import { productSeoLifecycleFields } from '@/collections/fields/productSeoLifecycleFields'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { buildProductSearchKeywords } from '@/utilities/searchKeywords'
import { internalLinkingFields } from '@/collections/fields/internalLinkingFields'

type EntityID = string | number

type RelationshipReference =
  | EntityID
  | {
    id?: EntityID | null
  }

type ProductAttributeSiblingData = {
  attribute?: RelationshipReference | null
}

function getRelationshipID(
  value: unknown,
): EntityID | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return value
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value)
  ) {
    return undefined
  }

  const id = value.id

  return typeof id === 'string' ||
    typeof id === 'number'
    ? id
    : undefined
}

const syncProductSearchKeywords: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
}) => {
  if (!data || typeof data !== 'object') {
    return data
  }

  const keys = Object.keys(data)

  if (
    keys.length === 1 &&
    typeof data.searchKeywords === 'string'
  ) {
    return data
  }

  data.searchKeywords = buildProductSearchKeywords({
    ...(originalDoc || {}),
    ...data,
  })

  return data
}

const syncVariantPrice: CollectionBeforeChangeHook = async ({ data }) => {
  if (data?.productType !== 'variable') {
    return data
  }

  const variants = Array.isArray(data?.variants)
    ? data.variants.filter((variant: any) => variant?.isActive !== false)
    : []

  if (!variants.length) {
    return data
  }

  const defaultVariant =
    variants.find((variant: any) => variant?.isDefault) || variants[0]

  const basePrice = Number(defaultVariant?.basePrice || 0)
  const salePrice = Number(defaultVariant?.salePrice || 0)
  const stock = variants.reduce((total: number, variant: any) => {
    return total + Number(variant?.stock || 0)
  }, 0)

  data.price = {
    ...(data.price || {}),
    basePrice,
    salePrice: salePrice > 0 ? salePrice : undefined,
    stock,
  }

  return data
}

const revalidateProductTags = async () => {
  try {
    revalidateTag('products', 'max')
    revalidateTag('categories', 'max')
    revalidateTag('brands', 'max')
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    if (
      message.includes(
        'static generation store missing',
      )
    ) {
      console.warn(
        '[revalidateTag] Bỏ qua vì đang chạy ngoài ngữ cảnh Next.js request/render.',
      )
      return
    }

    throw error
  }
}

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

  hooks: {
    afterChange: [
      trackProductSlugHistory,
      ensureLegacyProductRedirectHook,
      async () => {
        await revalidateProductTags()
      },
    ],
    afterDelete: [
      async () => {
        await revalidateProductTags()
      },
    ],
    beforeChange: [syncProductSearchKeywords, syncVariantPrice],
  },

  fields: [
    internalLinkingFields,
    ...productSeoLifecycleFields,
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
                {
                  name: 'gtin',
                  type: 'text',
                  label: 'GTIN / EAN / Barcode',
                  admin: {
                    width: '20%',
                    description:
                      'Nhập mã vạch chuẩn nếu sản phẩm có. Ví dụ EAN-13 cho hàng nhập khẩu.',
                  },
                },
                {
                  name: 'mpn',
                  type: 'text',
                  label: 'MPN / Mã hãng',
                  admin: {
                    width: '20%',
                    description:
                      'Dùng khi không có GTIN hoặc cần mã định danh từ hãng.',
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
                  index: true,
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
                  index: true,
                  label: 'Danh mục sản phẩm',
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'productType',
              type: 'select',
              label: 'Loại sản phẩm',
              defaultValue: 'simple',
              options: [
                {
                  label: 'Sản phẩm thường',
                  value: 'simple',
                },
                {
                  label: 'Sản phẩm có biến thể',
                  value: 'variable',
                },
              ],
              admin: {
                description: 'Chọn sản phẩm có biến thể nếu sản phẩm có nhiều dung tích, màu, quy cách...',
              },
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
                      index: true,
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
          label: 'Thuộc tính & Bộ lọc',
          fields: [
            {
              name: 'productAttributes',
              type: 'array',
              label: 'Thuộc tính có cấu trúc',
              admin: {
                description:
                  'Dữ liệu dùng cho bộ lọc danh mục, tìm kiếm và so sánh sản phẩm.',
                initCollapsed: false,
              },
              fields: [
                {
                  name: 'attribute',
                  type: 'relationship',
                  relationTo: 'attributes',
                  required: true,
                  label: 'Thuộc tính',
                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },
                },
                {
                  name: 'values',
                  type: 'relationship',
                  relationTo: 'attribute-values',
                  hasMany: true,
                  label: 'Giá trị lựa chọn',

                  filterOptions: ({
                    siblingData,
                  }): Where => {
                    const currentRow =
                      siblingData as ProductAttributeSiblingData

                    const attributeID =
                      getRelationshipID(
                        currentRow.attribute,
                      )

                    const conditions: Where[] = [
                      {
                        isActive: {
                          equals: true,
                        },
                      },
                    ]

                    if (attributeID !== undefined) {
                      conditions.unshift({
                        attribute: {
                          equals: attributeID,
                        },
                      })
                    }

                    return {
                      and: conditions,
                    }
                  },
                },
                {
                  name: 'numericValue',
                  type: 'number',
                  label: 'Giá trị số trực tiếp',
                  admin: {
                    description:
                      'Dùng khi sản phẩm có giá trị riêng, ví dụ độ lưu hương 7 giờ.',
                  },
                },
                {
                  name: 'booleanValue',
                  type: 'checkbox',
                  label: 'Giá trị đúng/sai',
                },
                {
                  name: 'textValue',
                  type: 'text',
                  label: 'Giá trị văn bản',
                },
              ],
            },
          ],
        },
        {
          label: 'Hồ sơ nước hoa',
          fields: [
            {
              name: 'fragranceProfile',
              type: 'group',
              label: 'Kiến trúc mùi hương',

              fields: [
                {
                  name: 'topNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'Hương đầu',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chọn các nốt hương xuất hiện đầu tiên sau khi xịt.',
                  },
                },

                {
                  name: 'middleNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'Hương giữa',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chọn các nốt hương tạo nên phần lõi của mùi hương.',
                  },
                },

                {
                  name: 'baseNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'Hương cuối',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chọn các nốt hương lưu lại lâu nhất trên da.',
                  },
                },

                {
                  type: 'row',
                  fields: [
                    {
                      name: 'longevityScore',
                      type: 'number',
                      label: 'Độ lưu hương',
                      min: 0,
                      max: 10,

                      admin: {
                        width: '50%',
                        step: 0.5,
                        description:
                          'Chấm theo thang điểm 0–10.',
                      },
                    },

                    {
                      name: 'sillageScore',
                      type: 'number',
                      label: 'Độ tỏa hương',
                      min: 0,
                      max: 10,

                      admin: {
                        width: '50%',
                        step: 0.5,
                        description:
                          'Chấm theo thang điểm 0–10.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Biến thể',
          fields: [
            {
              name: 'variants',
              type: 'array',
              label: 'Danh sách biến thể',
              admin: {
                description:
                  'Dùng cho các biến thể như 30ml, 50ml, 100ml, fullbox, tester, màu sắc, quy cách...',
                condition: (data) => data?.productType === 'variable',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: 'Tên biến thể',
                      required: true,
                      admin: {
                        width: '40%',
                        placeholder: 'VD: 30ml, 50ml, 100ml',
                      },
                    },
                    {
                      name: 'sku',
                      type: 'text',
                      label: 'SKU biến thể',
                      admin: {
                        width: '30%',
                      },
                    },
                    {
                      name: 'wpVariationId',
                      type: 'number',
                      label: 'WooCommerce variation ID',
                      admin: {
                        width: '30%',
                        readOnly: true,
                      },
                    },
                    {
                      name: 'isDefault',
                      type: 'checkbox',
                      label: 'Biến thể mặc định',
                      defaultValue: false,
                      admin: {
                        width: '30%',
                      },
                    },
                    {
                      name: 'optionValues',
                      type: 'relationship',
                      relationTo: 'attribute-values',
                      hasMany: true,
                      label: 'Giá trị thuộc tính của biến thể',
                      admin: {
                        description:
                          'Ví dụ: 50ml, màu đỏ, fullbox hoặc tester.',
                      },
                      filterOptions: {
                        isActive: {
                          equals: true,
                        },
                      },
                    },
                  ],
                },

                {
                  type: 'row',
                  fields: [
                    {
                      name: 'basePrice',
                      type: 'number',
                      label: 'Giá niêm yết',
                      required: true,
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'salePrice',
                      type: 'number',
                      label: 'Giá khuyến mãi',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'stock',
                      type: 'number',
                      label: 'Tồn kho',
                      defaultValue: 0,
                      admin: {
                        width: '33.33%',
                      },
                    },
                  ],
                },

                {
                  type: 'row',
                  fields: [
                    {
                      name: 'image',
                      type: 'upload',
                      relationTo: 'media',
                      label: 'Ảnh riêng của biến thể',
                      admin: {
                        width: '50%',
                      },
                    },
                    {
                      name: 'isActive',
                      type: 'checkbox',
                      label: 'Đang bán',
                      defaultValue: true,
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
            htmlEditorField({
              name: 'description',
              label: 'Mo ta san pham',
              description:
                'Nội dung chi tiet san pham luu dang HTML. Co the soan truc quan, dan noi dung tu WordPress hoac chinh ma HTML.',
            }),
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
            {
              name: 'faq',
              type: 'array',
              label: 'FAQ san pham',
              admin: {
                description:
                  'Chi nhap cau hoi/cau tra loi that su hien thi tren trang san pham.',
              },
              fields: [
                {
                  name: 'question',
                  type: 'text',
                  required: true,
                  label: 'Câu hỏi',
                },
                {
                  name: 'answer',
                  type: 'textarea',
                  required: true,
                  label: 'Cau tra loi',
                },
              ],
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
      name: 'averageRating',
      label: 'Điểm đánh giá trung bình',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      index: true,

      /**
       * Không cho request thông thường tự ghi đè.
       * Hook Reviews sử dụng overrideAccess: true nên vẫn cập nhật được.
       */
      access: {
        create: () => false,
        update: () => false,
      },

      admin: {
        readOnly: true,
        position: 'sidebar',
        step: 0.01,
        description:
          'Được tính tự động từ các review đã duyệt.',
      },
    },
    {
      name: 'reviewCount',
      label: 'Tổng số đánh giá',
      type: 'number',
      min: 0,
      defaultValue: 0,
      index: true,

      access: {
        create: () => false,
        update: () => false,
      },

      admin: {
        readOnly: true,
        position: 'sidebar',
        step: 1,
        description:
          'Tổng số review đã duyệt của sản phẩm.',
      },
    },

    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'draft',
      index: true,
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
      index: true,
      options: [
        {
          label: 'Sản phẩm bán chạy',
          value: 'best-seller',
        },
        {
          label: 'Sản phẩm combo',
          value: 'combo',
        },
        {
          label: 'Sản phẩm mới',
          value: 'new-arrival',
        },
        {
          label: 'Flash Sale',
          value: 'flash-sale',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'searchKeywords',
      type: 'textarea',
      index: true,
      label: 'Search keywords',
      admin: {
        position: 'sidebar',
        readOnly: true,
        hidden: true,
        description:
          'Normalized text used for fast product search suggestions and search pages.',
      },
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WooCommerce product ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      label: 'URL san pham goc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'importNotes',
      type: 'textarea',
      label: 'Ghi chu import product',
      admin: {
        position: 'sidebar',
        rows: 3,
      },
    }
  ],
}
