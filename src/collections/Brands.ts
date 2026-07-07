import { revalidateTag } from 'next/cache'
import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'

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
      async () => {
        await revalidateBrandTags()
      },
    ],
    afterDelete: [
      async () => {
        await revalidateBrandTags()
      },
    ],
  },
  admin: { useAsTitle: 'name' },
  fields: [
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
  ],
}
