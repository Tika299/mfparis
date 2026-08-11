import type { CollectionConfig } from 'payload'

export const InternalLinkRules: CollectionConfig = {
    slug: 'internal-link-rules',
    admin: {
        useAsTitle: 'title',
        group: 'SEO',
        defaultColumns: ['title', 'targetUrl', 'priority', 'enabled', 'updatedAt'],
    },
    access: {
        read: () => true,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
            label: 'Tên rule',
        },
        {
            name: 'enabled',
            type: 'checkbox',
            defaultValue: true,
            label: 'Đang bật',
            index: true,
        },
        {
            name: 'priority',
            type: 'select',
            required: true,
            defaultValue: 'primary_keyword',
            label: 'Độ ưu tiên',
            options: [
                { label: 'Keyword chính', value: 'primary_keyword' },
                { label: 'Danh mục', value: 'category' },
                { label: 'Thương hiệu', value: 'brand' },
                { label: 'Sản phẩm', value: 'product' },
                { label: 'Bài viết liên quan', value: 'post' },
            ],
        },
        {
            name: 'keywords',
            type: 'array',
            required: true,
            label: 'Keyword / Anchor text',
            fields: [
                {
                    name: 'keyword',
                    type: 'text',
                    required: true,
                    label: 'Keyword',
                },
                {
                    name: 'matchType',
                    type: 'select',
                    defaultValue: 'contains',
                    label: 'Kiểu match',
                    options: [
                        { label: 'Chứa cụm từ', value: 'contains' },
                        { label: 'Khớp nguyên cụm', value: 'phrase' },
                    ],
                },
                {
                    name: 'weight',
                    type: 'number',
                    defaultValue: 1,
                    min: 1,
                    max: 100,
                    label: 'Trọng số',
                },
            ],
        },
        {
            name: 'targetType',
            type: 'select',
            required: true,
            defaultValue: 'custom_url',
            label: 'Loại URL đích',
            options: [
                { label: 'URL tùy chỉnh', value: 'custom_url' },
                { label: 'Sản phẩm', value: 'product' },
                { label: 'Danh mục sản phẩm', value: 'category' },
                { label: 'Thương hiệu', value: 'brand' },
                { label: 'Bài viết', value: 'post' },
                { label: 'Danh mục bài viết', value: 'post_category' },
            ],
        },
        {
            name: 'targetUrl',
            type: 'text',
            required: true,
            label: 'URL đích',
            admin: {
                placeholder: '/products/ten-san-pham',
            },
        },
        {
            name: 'scope',
            type: 'select',
            hasMany: true,
            defaultValue: ['posts'],
            label: 'Áp dụng cho',
            options: [
                { label: 'Bài viết', value: 'posts' },
                { label: 'Sản phẩm', value: 'products' },
                { label: 'Danh mục sản phẩm', value: 'categories' },
                { label: 'Thương hiệu', value: 'brands' },
                { label: 'Danh mục bài viết', value: 'post-categories' },
            ],
        },
        {
            name: 'maxInsertionsPerPage',
            type: 'number',
            defaultValue: 1,
            min: 1,
            max: 10,
            label: 'Tối đa số lần chèn trên một trang',
        },
        {
            name: 'totalInsertions',
            type: 'number',
            defaultValue: 0,
            label: 'Tổng số lần đã chèn',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'lastUsedAt',
            type: 'date',
            label: 'Lần dùng gần nhất',
            admin: {
                readOnly: true,
            },
        },
    ],
}
