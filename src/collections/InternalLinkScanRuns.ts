import type { CollectionConfig } from 'payload'

const sourceTypeOptions = [
  { label: 'Bài viết', value: 'posts' },
  { label: 'Sản phẩm', value: 'products' },
  { label: 'Danh mục sản phẩm', value: 'categories' },
  { label: 'Thương hiệu', value: 'brands' },
]

export const InternalLinkScanRuns: CollectionConfig = {
  slug: 'internal-link-scan-runs',
  admin: {
    useAsTitle: 'id',
    group: 'SEO',
    defaultColumns: [
      'status',
      'sourceTypes',
      'pagesScanned',
      'candidateLinks',
      'issueCount',
      'startedAt',
    ],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      index: true,
      options: [
        { label: 'Đang chạy', value: 'running' },
        { label: 'Hoàn tất', value: 'completed' },
        { label: 'Thất bại', value: 'failed' },
        { label: 'Đã hủy', value: 'cancelled' },
      ],
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'sourceTypes',
      type: 'select',
      hasMany: true,
      required: true,
      options: sourceTypeOptions,
    },
    {
      name: 'currentSourceTypeIndex',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'currentPage',
      type: 'number',
      defaultValue: 1,
      min: 1,
      admin: { readOnly: true },
    },
    {
      name: 'pagesScanned',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'fieldsScanned',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'candidateLinks',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'insertedCandidates',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'skippedCandidates',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'issueCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'finishedAt',
      type: 'date',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      admin: { readOnly: true },
    },
  ],
}
