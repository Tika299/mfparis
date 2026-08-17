import { revalidateTag } from 'next/cache'
import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { trackCategorySlugHistory } from '@/collections/hooks/trackSlugHistory'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { siloSeoFields } from '@/collections/fields/siloSeoFields'
import { landingSeoContentFields, seoFields } from '@/collections/fields/seoFields'
import { internalLinkingFields } from '@/collections/fields/internalLinkingFields'

const revalidateCategoryTags = async () => {
  try {
    revalidateTag('categories', 'max')
    revalidateTag('products', 'max')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('static generation store missing')) {
      console.warn(
        '[revalidateTag] Bo qua vi dang chay ngoai ngu canh Next.js request/render.',
      )
      return
    }

    throw error
  }
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  hooks: {
    afterChange: [
      trackCategorySlugHistory,
      async () => {
        await revalidateCategoryTags()
      },
    ],
    afterDelete: [
      async () => {
        await revalidateCategoryTags()
      },
    ],
  },
  admin: { useAsTitle: 'name' },
  fields: [
    internalLinkingFields,
    { name: 'name', type: 'text', required: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    htmlEditorField({
      name: 'description',
      label: 'Mo ta danh muc',
      description:
        'Mo ta danh muc luu dang HTML, co the soan truc quan hoac chinh ma HTML.',
      rows: 20,
    }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: { beforeChange: [beforeChangeSlug] },
      admin: {
        position: 'sidebar',
        description:
          'Tu dong tao tu ten, co the chinh sua thu cong de toi uu SEO',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Danh muc cha',
    },
    {
      name: 'filterProfile',
      type: 'group',
      label: 'Bo loc danh muc',
      admin: {
        description:
          'Dieu khien bo loc hien tren trang danh muc san pham. Neu chua cau hinh, he thong se tu chon theo ten/slug danh muc.',
      },
      fields: [
        {
          name: 'preset',
          type: 'select',
          label: 'Kieu bo loc',
          defaultValue: 'auto',
          options: [
            { label: 'Tu dong theo danh muc', value: 'auto' },
            { label: 'Nuoc hoa', value: 'fragrance' },
            { label: 'Skincare / duoc my pham', value: 'skincare' },
            { label: 'Trang diem', value: 'makeup' },
            { label: 'Thuc pham chuc nang / suc khoe', value: 'health' },
            { label: 'Cham soc toc', value: 'hair' },
            { label: 'Cham soc co the', value: 'body' },
            { label: 'Toi gian', value: 'minimal' },
            { label: 'Tuy chinh thu cong', value: 'custom' },
          ],
        },
        {
          name: 'inheritParentProfile',
          type: 'checkbox',
          label: 'Ke thua cau hinh tu danh muc cha',
          defaultValue: true,
          admin: {
            description:
              'Neu bat va danh muc hien tai chua co facet tuy chinh, he thong co the dung ho so bo loc cua danh muc cha.',
          },
        },
        {
          name: 'coreFilters',
          type: 'group',
          label: 'Bo loc co ban',
          fields: [
            {
              name: 'brand',
              type: 'checkbox',
              label: 'Thuong hieu',
              defaultValue: true,
            },
            {
              name: 'category',
              type: 'checkbox',
              label: 'Danh muc',
              defaultValue: true,
            },
            {
              name: 'price',
              type: 'checkbox',
              label: 'Gia',
              defaultValue: true,
            },
            {
              name: 'availability',
              type: 'checkbox',
              label: 'Tinh trang hang',
              defaultValue: true,
            },
            {
              name: 'sale',
              type: 'checkbox',
              label: 'Uu dai',
              defaultValue: true,
            },
            {
              name: 'rating',
              type: 'checkbox',
              label: 'Danh gia',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'showFragranceNotes',
          type: 'checkbox',
          label: 'Hien bo loc tang huong',
          defaultValue: false,
          admin: {
            description:
              'Dung cho danh muc nuoc hoa hoac danh muc co san pham can loc theo note huong.',
          },
        },
        {
          name: 'facetKeys',
          type: 'array',
          label: 'Facet tuy chinh',
          labels: {
            singular: 'Facet',
            plural: 'Facet',
          },
          admin: {
            description:
              'Dung khi muon chi dinh chinh xac facet hien thi. Vi du: attr_loai-da, attr_nhom-huong, attr_dung-tich, note.',
          },
          fields: [
            {
              name: 'key',
              type: 'text',
              label: 'Facet key',
              required: true,
            },
            {
              name: 'label',
              type: 'text',
              label: 'Ghi chu',
              admin: {
                description:
                  'Chi de admin de nho y nghia facet; giao dien van dung ten facet that.',
              },
            },
          ],
        },
      ],
    },
    ...siloSeoFields({ kind: 'product' }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'SEO nâng cao',
          fields: [
            seoFields({
              schemaTypeOptions: [
                { label: 'Tự động theo danh mục sản phẩm', value: 'auto' },
                { label: 'CollectionPage', value: 'CollectionPage' },
                { label: 'WebPage', value: 'WebPage' },
                { label: 'Không xuất schema riêng', value: 'none' },
              ],
            }),
          ],
        },
        {
          label: 'Nội dung SEO',
          fields: landingSeoContentFields,
        },
      ],
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WordPress ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      label: 'URL gốc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'importNotes',
      type: 'textarea',
      label: 'Ghi chu import category',
      admin: {
        position: 'sidebar',
        rows: 3,
      },
    },
    {
      name: 'internalLinkPreview',
      type: 'ui',
      admin: {
        components: {
          Field: {
            path: '@/components/Admin/InternalLinkPreview#InternalLinkPreview',
            clientProps: {
              collection: 'posts',
            },
          },
        },
      },
    }
  ],
}
