import type { Access, CollectionConfig } from 'payload'

const STAFF_ROLES = new Set(['admin', 'manager', 'editor'])

const staffOnly: Access = ({ req }) => {
    const user = req.user as { role?: string; roles?: string[] } | null | undefined

    if (!user) return false
    if (typeof user.role === 'string' && STAFF_ROLES.has(user.role)) return true
    if (Array.isArray(user.roles)) {
        return user.roles.some((role) => STAFF_ROLES.has(role))
    }

    return false
}

export const ProductFilterGroups: CollectionConfig = {
    slug: 'product-filter-groups',
    labels: {
        singular: 'Nhóm bộ lọc sản phẩm',
        plural: 'Nhóm bộ lọc sản phẩm',
    },
    admin: {
        useAsTitle: 'label',
        group: 'Kinh doanh',
        defaultColumns: ['label', 'queryKey', 'sourceType', 'displayType', 'enabled', 'sortOrder'],
        description: 'Cấu hình bộ lọc hiển thị ở trang sản phẩm, danh mục và thương hiệu.',
    },
    defaultSort: 'sortOrder',
    access: {
        read: () => true,
        create: staffOnly,
        update: staffOnly,
        delete: staffOnly,
    },
    fields: [
        {
            name: 'label',
            label: 'Tên hiển thị',
            type: 'text',
            required: true,
        },
        {
            name: 'queryKey',
            label: 'Query key trên URL',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            admin: {
                placeholder: 'attribute_phong-cach',
                description: 'Ví dụ: attribute_phong-cach sẽ tạo URL dạng ?attribute_phong-cach=thanh-lich',
            },
        },
        {
            name: 'enabled',
            label: 'Bật bộ lọc',
            type: 'checkbox',
            defaultValue: true,
        },
        {
            name: 'sortOrder',
            label: 'Thứ tự hiển thị',
            type: 'number',
            defaultValue: 100,
            index: true,
        },
        {
            name: 'sourceType',
            label: 'Nguồn dữ liệu',
            type: 'select',
            required: true,
            defaultValue: 'attribute',
            options: [
                { label: 'Thương hiệu', value: 'brand' },
                { label: 'Danh mục', value: 'category' },
                { label: 'Thuộc tính sản phẩm', value: 'attribute' },
                { label: 'Nốt hương', value: 'fragrance-note' },
                { label: 'Khoảng giá', value: 'price' },
            ],
        },
        {
            name: 'attribute',
            label: 'Thuộc tính',
            type: 'relationship',
            relationTo: 'attributes',
            admin: {
                condition: (_, siblingData) => siblingData?.sourceType === 'attribute',
            },
        },
        {
            name: 'displayType',
            label: 'Kiểu hiển thị',
            type: 'select',
            required: true,
            defaultValue: 'checkbox',
            options: [
                { label: 'Checkbox', value: 'checkbox' },
                { label: 'Radio', value: 'radio' },
                { label: 'Dropdown', value: 'select' },
                { label: 'Chip', value: 'chips' },
                { label: 'Khoảng giá', value: 'range' },
            ],
        },
        {
            name: 'showOn',
            label: 'Hiển thị ở',
            type: 'select',
            hasMany: true,
            defaultValue: ['products', 'categories', 'brands'],
            options: [
                { label: 'Trang cửa hàng', value: 'products' },
                { label: 'Trang danh mục', value: 'categories' },
                { label: 'Trang thương hiệu', value: 'brands' },
                { label: 'Trang tìm kiếm', value: 'search' },
            ],
        },
        {
            name: 'maxOptions',
            label: 'Số lựa chọn tối đa',
            type: 'number',
            defaultValue: 50,
        },
        {
            name: 'collapsedByDefault',
            label: 'Thu gọn mặc định',
            type: 'checkbox',
            defaultValue: false,
        },
    ],
}