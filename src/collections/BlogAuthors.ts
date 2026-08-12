import type { CollectionConfig } from 'payload'

import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { seoFields } from '@/collections/fields/seoFields'

export const BlogAuthors: CollectionConfig = {
  slug: 'blog-authors',
  labels: {
    singular: 'T\u00e1c gi\u1ea3 blog',
    plural: 'T\u00e1c gi\u1ea3 blog',
  },
  admin: {
    useAsTitle: 'name',
    group: 'N\u1ed9i dung',
    defaultColumns: [
      'name',
      'title',
      'isDefault',
      'updatedAt',
    ],
    description:
      'Qu\u1ea3n l\u00fd h\u1ed3 s\u01a1 t\u00e1c gi\u1ea3 \u0111\u1ec3 ch\u1ecdn trong t\u1eebng b\u00e0i blog v\u00e0 xu\u1ea5t schema t\u00e1c gi\u1ea3.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'T\u00ean t\u00e1c gi\u1ea3',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description:
          'D\u00f9ng cho URL t\u00e1c gi\u1ea3 v\u00e0 @id schema.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Ch\u1ee9c danh',
      defaultValue: 'MF Paris Editorial',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: '\u1ea2nh t\u00e1c gi\u1ea3',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'M\u00f4 t\u1ea3 ng\u1eafn',
      admin: {
        rows: 4,
      },
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL t\u00e1c gi\u1ea3',
      admin: {
        description:
          'C\u00f3 th\u1ec3 nh\u1eadp /author/slug/ ho\u1eb7c URL \u0111\u1ea7y \u0111\u1ee7.',
      },
    },
    {
      name: 'sameAs',
      type: 'array',
      label: 'Li\u00ean k\u1ebft x\u00e3 h\u1ed9i / profile',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          label: 'URL',
        },
      ],
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      label: 'T\u00e1c gi\u1ea3 m\u1eb7c \u0111\u1ecbnh',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'D\u00f9ng khi b\u00e0i vi\u1ebft ch\u01b0a ch\u1ecdn t\u00e1c gi\u1ea3 ri\u00eang.',
      },
    },
    seoFields({
      schemaTypeOptions: [
        { label: 'Tự động theo trang tác giả', value: 'auto' },
        { label: 'ProfilePage', value: 'ProfilePage' },
        { label: 'WebPage', value: 'WebPage' },
        { label: 'Không xuất schema riêng', value: 'none' },
      ],
    }),
  ],
}
