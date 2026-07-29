import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { siloSeoFields } from '@/collections/fields/siloSeoFields'
import { blogLandingSeoContentFields } from '@/collections/fields/seoFields'
import { internalLinkingFields } from '@/collections/fields/internalLinkingFields'

export const PostCategories: CollectionConfig = {
  slug: 'post-categories',
  admin: {
    useAsTitle: 'title',
    group: 'Nội dung',
  },
  access: {
    read: () => true,
  },
  fields: [
    internalLinkingFields,
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tên danh mục bài viết',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
      },
    },
    htmlEditorField({
      name: 'description',
      label: 'Mo ta danh muc bai viet',
      description:
        'Mo ta danh muc bai viet luu dang HTML. Khi import se thay anh trong HTML bang media Payload.',
      rows: 20,
    }),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'post-categories',
      label: 'Danh mục cha',
      admin: {
        position: 'sidebar',
      },
    },
    ...siloSeoFields({ kind: 'post' }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Nội dung SEO',
          fields: blogLandingSeoContentFields,
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
      label: 'Ghi chu import post category',
      admin: {
        position: 'sidebar',
        rows: 3,
      },
    }
  ],
}
