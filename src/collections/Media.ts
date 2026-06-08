import { CollectionConfig } from 'payload'
import path from 'path'

export const Media: CollectionConfig = {
  slug: 'media',

  upload: {
    // Local: ./media
    // Production Coolify: /app/media
    staticDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'),

    imageSizes: [
      {
        name: 'thumbnail',
        width: 150,
        height: 150,
        position: 'centre',
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        position: 'centre',
      },
      {
        name: 'large',
        width: 1200,
        position: 'centre',
      },
    ],

    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },

  access: {
    read: () => true,
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Mô tả hình ảnh (SEO)',
    },
  ],
}