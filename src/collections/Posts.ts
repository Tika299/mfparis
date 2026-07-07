import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    group: 'Noi dung',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tieu de bai viet',
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
        description:
          'Tu dong tao tu ten, co the chinh sua thu cong de toi uu SEO',
      },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Anh dai dien bai viet',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'post-categories',
      hasMany: true,
      label: 'Danh muc bai viet',
      admin: {
        position: 'sidebar',
      },
    },
    htmlEditorField({
      name: 'content',
      label: 'Noi dung bai viet',
      description:
        'Noi dung bai viet luu dang HTML, co the soan truc quan hoac chinh ma HTML.',
    }),
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Mo ta ngan',
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Cau hinh SEO',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
      ],
    },
  ],
}
