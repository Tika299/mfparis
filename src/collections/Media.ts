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
          format: 'avif',
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
    {
      name: 'title',
      type: 'text',
      label: 'Ten hien thi',
      admin: {
        description:
          'Tên để quản trị tìm kiếm media. Đổi tên này sẽ cập nhật ở các nội dung dùng relationship media.',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Chu thich anh',
      admin: {
        rows: 3,
      },
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WordPress media ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      index: true,
      label: 'URL anh goc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceFilename',
      type: 'text',
      index: true,
      label: 'Ten file goc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'importedFrom',
      type: 'select',
      label: 'Nguon import',
      defaultValue: 'manual',
      options: [
        { label: 'Nhap tay', value: 'manual' },
        { label: 'WordPress', value: 'wordpress' },
        { label: 'WooCommerce', value: 'woocommerce' },
      ],
      admin: {
        position: 'sidebar',
      },
    }
  ],
}