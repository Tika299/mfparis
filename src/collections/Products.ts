import { revalidateTag } from 'next/cache'
import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  Where,
} from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { trackProductSlugHistory } from '@/collections/hooks/trackSlugHistory'
import { productSeoLifecycleFields } from '@/collections/fields/productSeoLifecycleFields'

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
  revalidateTag('products', 'max')
  revalidateTag('categories', 'max')
  revalidateTag('brands', 'max')
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
      async () => {
        await revalidateProductTags()
      },
    ],
    afterDelete: [
      async () => {
        await revalidateProductTags()
      },
    ],
    beforeChange: [syncVariantPrice],
  },

  fields: [
    ...productSeoLifecycleFields,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'ThÃ´ng tin chung',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  label: 'TÃªn sáº£n pháº©m',
                  admin: {
                    width: '70%',
                  },
                },
                {
                  name: 'sku',
                  type: 'text',
                  label: 'MÃ£ SKU',
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
                  label: 'ThÆ°Æ¡ng hiá»‡u',
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'categories',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                  label: 'Danh má»¥c sáº£n pháº©m',
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'productType',
              type: 'select',
              label: 'Loáº¡i sáº£n pháº©m',
              defaultValue: 'simple',
              options: [
                {
                  label: 'Sáº£n pháº©m thÆ°á»ng',
                  value: 'simple',
                },
                {
                  label: 'Sáº£n pháº©m cÃ³ biáº¿n thá»ƒ',
                  value: 'variable',
                },
              ],
              admin: {
                description: 'Chá»n sáº£n pháº©m cÃ³ biáº¿n thá»ƒ náº¿u sáº£n pháº©m cÃ³ nhiá»u dung tÃ­ch, mÃ u, quy cÃ¡ch...',
              },
            },

            {
              name: 'price',
              type: 'group',
              label: 'GiÃ¡ & Kho hÃ ng',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'basePrice',
                      type: 'number',
                      required: true,
                      label: 'GiÃ¡ niÃªm yáº¿t (Ä‘)',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'salePrice',
                      type: 'number',
                      label: 'GiÃ¡ khuyáº¿n mÃ£i (Ä‘)',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'stock',
                      type: 'number',
                      label: 'Sá»‘ lÆ°á»£ng kho',
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
              label: 'Bá»™ sÆ°u táº­p hÃ¬nh áº£nh',
              admin: {
                description: 'áº¢nh sáº£n pháº©m nÃªn dÃ¹ng tá»‰ lá»‡ 1:1 Ä‘á»ƒ hiá»ƒn thá»‹ Ä‘áº¹p.',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'áº¢nh',
                },
              ],
            },

            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'MÃ´ táº£ ngáº¯n',
              admin: {
                rows: 4,
                description: 'Hiá»ƒn thá»‹ á»Ÿ pháº§n Ä‘áº§u trang sáº£n pháº©m.',
              },
            },
          ],
        },

        {
          label: 'ThÃ´ng sá»‘ ká»¹ thuáº­t',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'ThÃ´ng sá»‘ tÃ¹y chá»‰nh',
              admin: {
                description: 'DÃ¹ng cho dung tÃ­ch, xuáº¥t xá»©, nhÃ³m hÆ°Æ¡ng, loáº¡i da, ná»“ng Ä‘á»™...',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: 'TÃªn thÃ´ng sá»‘',
                      required: true,
                      admin: {
                        width: '50%',
                      },
                    },
                    {
                      name: 'value',
                      type: 'text',
                      label: 'GiÃ¡ trá»‹',
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
          label: 'Thuá»™c tÃ­nh & Bá»™ lá»c',
          fields: [
            {
              name: 'productAttributes',
              type: 'array',
              label: 'Thuá»™c tÃ­nh cÃ³ cáº¥u trÃºc',
              admin: {
                description:
                  'Dá»¯ liá»‡u dÃ¹ng cho bá»™ lá»c danh má»¥c, tÃ¬m kiáº¿m vÃ  so sÃ¡nh sáº£n pháº©m.',
                initCollapsed: false,
              },
              fields: [
                {
                  name: 'attribute',
                  type: 'relationship',
                  relationTo: 'attributes',
                  required: true,
                  label: 'Thuá»™c tÃ­nh',
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
                  label: 'GiÃ¡ trá»‹ lá»±a chá»n',

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
                  label: 'GiÃ¡ trá»‹ sá»‘ trá»±c tiáº¿p',
                  admin: {
                    description:
                      'DÃ¹ng khi sáº£n pháº©m cÃ³ giÃ¡ trá»‹ riÃªng, vÃ­ dá»¥ Ä‘á»™ lÆ°u hÆ°Æ¡ng 7 giá».',
                  },
                },
                {
                  name: 'booleanValue',
                  type: 'checkbox',
                  label: 'GiÃ¡ trá»‹ Ä‘Ãºng/sai',
                },
                {
                  name: 'textValue',
                  type: 'text',
                  label: 'GiÃ¡ trá»‹ vÄƒn báº£n',
                },
              ],
            },
          ],
        },
        {
          label: 'Há»“ sÆ¡ nÆ°á»›c hoa',
          fields: [
            {
              name: 'fragranceProfile',
              type: 'group',
              label: 'Kiáº¿n trÃºc mÃ¹i hÆ°Æ¡ng',

              fields: [
                {
                  name: 'topNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'HÆ°Æ¡ng Ä‘áº§u',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chá»n cÃ¡c ná»‘t hÆ°Æ¡ng xuáº¥t hiá»‡n Ä‘áº§u tiÃªn sau khi xá»‹t.',
                  },
                },

                {
                  name: 'middleNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'HÆ°Æ¡ng giá»¯a',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chá»n cÃ¡c ná»‘t hÆ°Æ¡ng táº¡o nÃªn pháº§n lÃµi cá»§a mÃ¹i hÆ°Æ¡ng.',
                  },
                },

                {
                  name: 'baseNotes',
                  type: 'relationship',
                  relationTo: 'fragrance-notes',
                  hasMany: true,
                  label: 'HÆ°Æ¡ng cuá»‘i',

                  filterOptions: {
                    isActive: {
                      equals: true,
                    },
                  },

                  admin: {
                    description:
                      'Chá»n cÃ¡c ná»‘t hÆ°Æ¡ng lÆ°u láº¡i lÃ¢u nháº¥t trÃªn da.',
                  },
                },

                {
                  type: 'row',
                  fields: [
                    {
                      name: 'longevityScore',
                      type: 'number',
                      label: 'Äá»™ lÆ°u hÆ°Æ¡ng',
                      min: 0,
                      max: 10,

                      admin: {
                        width: '50%',
                        step: 0.5,
                        description:
                          'Cháº¥m theo thang Ä‘iá»ƒm 0â€“10.',
                      },
                    },

                    {
                      name: 'sillageScore',
                      type: 'number',
                      label: 'Äá»™ tá»a hÆ°Æ¡ng',
                      min: 0,
                      max: 10,

                      admin: {
                        width: '50%',
                        step: 0.5,
                        description:
                          'Cháº¥m theo thang Ä‘iá»ƒm 0â€“10.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Biáº¿n thá»ƒ',
          fields: [
            {
              name: 'variants',
              type: 'array',
              label: 'Danh sÃ¡ch biáº¿n thá»ƒ',
              admin: {
                description:
                  'DÃ¹ng cho cÃ¡c biáº¿n thá»ƒ nhÆ° 30ml, 50ml, 100ml, fullbox, tester, mÃ u sáº¯c, quy cÃ¡ch...',
                condition: (data) => data?.productType === 'variable',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      label: 'TÃªn biáº¿n thá»ƒ',
                      required: true,
                      admin: {
                        width: '40%',
                        placeholder: 'VD: 30ml, 50ml, 100ml',
                      },
                    },
                    {
                      name: 'sku',
                      type: 'text',
                      label: 'SKU biáº¿n thá»ƒ',
                      admin: {
                        width: '30%',
                      },
                    },
                    {
                      name: 'isDefault',
                      type: 'checkbox',
                      label: 'Biáº¿n thá»ƒ máº·c Ä‘á»‹nh',
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
                      label: 'GiÃ¡ trá»‹ thuá»™c tÃ­nh cá»§a biáº¿n thá»ƒ',
                      admin: {
                        description:
                          'VÃ­ dá»¥: 50ml, mÃ u Ä‘á», fullbox hoáº·c tester.',
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
                      label: 'GiÃ¡ niÃªm yáº¿t',
                      required: true,
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'salePrice',
                      type: 'number',
                      label: 'GiÃ¡ khuyáº¿n mÃ£i',
                      admin: {
                        width: '33.33%',
                      },
                    },
                    {
                      name: 'stock',
                      type: 'number',
                      label: 'Tá»“n kho',
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
                      label: 'áº¢nh riÃªng cá»§a biáº¿n thá»ƒ',
                      admin: {
                        width: '50%',
                      },
                    },
                    {
                      name: 'isActive',
                      type: 'checkbox',
                      label: 'Äang bÃ¡n',
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
          label: 'Ná»™i dung chi tiáº¿t',
          fields: [
            {
              name: 'description',
              type: 'richText',
              label: 'MÃ´ táº£ sáº£n pháº©m',
              admin: {
                description:
                  'Ná»™i dung chi tiáº¿t sáº£n pháº©m Ä‘Æ°á»£c convert tá»« HTML WordPress sang RichText. Giá»¯ H2, H3, list, link, báº£ng náº¿u editor há»— trá»£.',
              },
            },
          ],
        },

        {
          label: 'Combo',
          fields: [
            {
              name: 'isCombo',
              type: 'checkbox',
              label: 'ÄÃ¢y lÃ  bá»™ sáº£n pháº©m / combo',
              defaultValue: false,
            },
            {
              name: 'comboItems',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              label: 'Danh sÃ¡ch sáº£n pháº©m trong combo',
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
      label: 'ÄÆ°á»ng dáº«n',
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description: 'Tá»± Ä‘á»™ng táº¡o tá»« tÃªn sáº£n pháº©m, cÃ³ thá»ƒ chá»‰nh tay Ä‘á»ƒ tá»‘i Æ°u SEO.',
      },
    },

    {
      name: 'averageRating',
      label: 'Äiá»ƒm Ä‘Ã¡nh giÃ¡ trung bÃ¬nh',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      index: true,

      /**
       * KhÃ´ng cho request thÃ´ng thÆ°á»ng tá»± ghi Ä‘Ã¨.
       * Hook Reviews sá»­ dá»¥ng overrideAccess: true nÃªn váº«n cáº­p nháº­t Ä‘Æ°á»£c.
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
          'ÄÆ°á»£c tÃ­nh tá»± Ä‘á»™ng tá»« cÃ¡c review Ä‘Ã£ duyá»‡t.',
      },
    },
    {
      name: 'reviewCount',
      label: 'Tá»•ng sá»‘ Ä‘Ã¡nh giÃ¡',
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
          'Tá»•ng sá»‘ review Ä‘Ã£ duyá»‡t cá»§a sáº£n pháº©m.',
      },
    },

    {
      name: 'status',
      type: 'select',
      label: 'Tráº¡ng thÃ¡i',
      defaultValue: 'draft',
      options: [
        {
          label: 'NhÃ¡p',
          value: 'draft',
        },
        {
          label: 'Äang bÃ¡n',
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
      label: 'Vá»‹ trÃ­ trang chá»§',
      hasMany: true,
      options: [
        {
          label: 'Sáº£n pháº©m bÃ¡n cháº¡y',
          value: 'best-seller',
        },
        {
          label: 'Sáº£n pháº©m combo',
          value: 'combo',
        },
        {
          label: 'Sáº£n pháº©m má»›i',
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
  ],
}