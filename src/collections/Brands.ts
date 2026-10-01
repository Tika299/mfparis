import { revalidateTag } from 'next/cache'
import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { landingSeoContentFields, seoFields } from '@/collections/fields/seoFields'
import { internalLinkingFields } from '@/collections/fields/internalLinkingFields'
import {
  disableBrandInboundInternalLinks,
  syncBrandInboundInternalLinks,
} from '@/collections/hooks/syncBrandInboundInternalLinks'

const revalidateBrandTags = async () => {
  try {
    revalidateTag('brands', 'max')
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

export const Brands: CollectionConfig = {
  slug: 'brands',
  hooks: {
    afterChange: [
      syncBrandInboundInternalLinks,
      async () => {
        await revalidateBrandTags()
      },
    ],
    afterDelete: [
      disableBrandInboundInternalLinks,
      async () => {
        await revalidateBrandTags()
      },
    ],
  },
  admin: { useAsTitle: 'name' },
  fields: [
    internalLinkingFields,
    {
      name: 'inboundInternalLinks',
      type: 'group',
      label: 'Nhận link tự động',
      admin: {
        position: 'sidebar',
        description:
          'Cấu hình keyword để nội dung khác tự động liên kết đến thương hiệu này.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Bật nhận link tự động',
          defaultValue: false,
        },
        {
          name: 'keywords',
          type: 'array',
          label: 'Từ khóa nhận link',
          fields: [
            {
              name: 'keyword',
              type: 'text',
              required: true,
              label: 'Keyword',
            },
          ],
        },
        {
          name: 'scope',
          type: 'select',
          hasMany: true,
          defaultValue: ['posts'],
          label: 'Áp dụng trên loại nội dung nguồn',
          options: [
            { label: 'Bài viết blog', value: 'posts' },
            { label: 'Sản phẩm', value: 'products' },
            { label: 'Danh mục sản phẩm', value: 'categories' },
            { label: 'Thương hiệu', value: 'brands' },
            { label: 'Danh mục blog', value: 'post-categories' },
          ],
        },
        {
          name: 'maxInsertionsPerPage',
          type: 'number',
          defaultValue: 1,
          min: 1,
          max: 10,
          label: 'Số link tối đa trên mỗi trang nguồn',
        },
      ],
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeChange: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description:
          'Tu dong tao tu ten, co the chinh sua thu cong de toi uu SEO',
      },
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    htmlEditorField({
      name: 'description',
      label: 'Mo ta thuong hieu',
      description:
        'Mo ta thuong hieu luu dang HTML, co the soan truc quan hoac chinh ma HTML.',
      rows: 20,
    }),
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Thuong hieu noi bat',
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'SEO nâng cao',
          fields: [
            seoFields({
              schemaTypeOptions: [
                { label: 'Tự động theo trang thương hiệu', value: 'auto' },
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
      label: 'Ghi chu import brand',
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
              collection: 'brands',
            },
          },
        },
      },
    }
  ],
}
