import type { CollectionConfig } from 'payload'
import path from 'path'

export const Media: CollectionConfig = {
  slug: 'media',

  upload: {
    // Local: ./media
    // Production Coolify: /app/media
    staticDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'),

    formatOptions: {
      format: 'webp',
      options: {
        quality: 82,
      },
    },

    imageSizes: [
      {
        name: 'thumbnail',
        width: 160,
        height: 160,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'heroMobile',
        width: 414,
        height: 552,
        position: 'centre',
        formatOptions: {
          format: 'webp',
        },
      },
      {
        name: 'heroTablet',
        width: 1024,
        height: 1024,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'heroDesktop',
        width: 1920,
        height: 800,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
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