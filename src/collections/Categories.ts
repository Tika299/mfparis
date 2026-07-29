import { revalidateTag } from 'next/cache'
import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { trackCategorySlugHistory } from '@/collections/hooks/trackSlugHistory'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { siloSeoFields } from '@/collections/fields/siloSeoFields'
import { landingSeoContentFields } from '@/collections/fields/seoFields'
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
    ...siloSeoFields({ kind: 'product' }),
    {
      type: 'tabs',
      tabs: [
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
