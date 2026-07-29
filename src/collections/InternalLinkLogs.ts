import type { CollectionConfig } from 'payload'

export const InternalLinkLogs: CollectionConfig = {
  slug: 'internal-link-logs',
  admin: {
    useAsTitle: 'summary',
    group: 'SEO',
    defaultColumns: [
      'summary',
      'sourceType',
      'targetUrl',
      'insertedCount',
      'totalInsertedCount',
      'lastCheckedAt',
    ],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'summary',
      type: 'text',
      required: true,
      label: 'Tom tat',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'logKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Log key',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      index: true,
      label: 'Loai noi dung',
      options: [
        { label: 'Bai viet', value: 'posts' },
        { label: 'San pham', value: 'products' },
        { label: 'Danh muc san pham', value: 'categories' },
        { label: 'Thuong hieu', value: 'brands' },
        { label: 'Danh muc bai viet', value: 'post-categories' },
      ],
    },
    {
      name: 'sourceId',
      type: 'text',
      required: true,
      index: true,
      label: 'ID noi dung',
    },
    {
      name: 'sourceTitle',
      type: 'text',
      label: 'Tieu de noi dung',
    },
    {
      name: 'sourceUrl',
      type: 'text',
      required: true,
      index: true,
      label: 'URL nguon',
    },
    {
      name: 'rule',
      type: 'relationship',
      relationTo: 'internal-link-rules',
      label: 'Rule',
      index: true,
    },
    {
      name: 'ruleTitle',
      type: 'text',
      label: 'Ten rule',
    },
    {
      name: 'keyword',
      type: 'text',
      required: true,
      index: true,
      label: 'Keyword',
    },
    {
      name: 'anchorText',
      type: 'text',
      label: 'Anchor text',
    },
    {
      name: 'targetUrl',
      type: 'text',
      required: true,
      index: true,
      label: 'URL dich',
    },
    {
      name: 'insertedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'So link chen trong lan kiem tra gan nhat',
    },
    {
      name: 'skippedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'So lan bo qua trong lan kiem tra gan nhat',
    },
    {
      name: 'totalInsertedCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Tong so link da ghi nhan',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'previewCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'So lan preview',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'skipReasons',
      type: 'textarea',
      label: 'Ly do bi bo qua gan nhat',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastTextPreview',
      type: 'textarea',
      label: 'Doan text gan nhat',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastRunId',
      type: 'text',
      index: true,
      label: 'Run ID gan nhat',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastCheckedAt',
      type: 'date',
      index: true,
      label: 'Lan kiem tra gan nhat',
      admin: {
        readOnly: true,
      },
    },
  ],
}
