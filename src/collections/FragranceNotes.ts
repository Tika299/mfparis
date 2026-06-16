import type {
    CollectionConfig,
    FieldHook,
} from 'payload'

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function createSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/gu, '')
        .replace(/đ/gu, 'd')
        .replace(/Đ/gu, 'd')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, '')
}

const generateSlug: FieldHook = ({
    value,
    siblingData,
}) => {
    const currentSlug =
        typeof value === 'string'
            ? value.trim()
            : ''

    if (currentSlug.length > 0) {
        return createSlug(currentSlug)
    }

    const name =
        isRecord(siblingData) &&
            typeof siblingData.name === 'string'
            ? siblingData.name
            : ''

    return createSlug(name)
}

export const FragranceNotes: CollectionConfig = {
    slug: 'fragrance-notes',

    labels: {
        singular: 'Nốt hương',
        plural: 'Nốt hương',
    },

    admin: {
        useAsTitle: 'name',
        group: 'Nước hoa',
        defaultColumns: [
            'name',
            'slug',
            'isActive',
            'updatedAt',
        ],
        description:
            'Thư viện nốt hương và icon dùng lại cho nhiều sản phẩm nước hoa.',
    },

    access: {
        read: () => true,
    },

    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'Tên nốt hương',
            admin: {
                placeholder:
                    'Ví dụ: Jasmine, Hoa hồng, Tonka Bean',
            },
        },

        {
            name: 'slug',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            label: 'Slug',
            hooks: {
                beforeValidate: [generateSlug],
            },
            admin: {
                description:
                    'Tự tạo từ tên nốt hương. Có thể chỉnh tay.',
            },
        },

        {
            name: 'icon',
            type: 'upload',
            relationTo: 'media',
            required: true,
            label: 'Icon minh họa',
            filterOptions: {
                mimeType: {
                    contains: 'image',
                },
            },
            admin: {
                description:
                    'Ưu tiên PNG nền trong suốt, icon nét đen đơn sắc.',
            },
        },

        {
            name: 'description',
            type: 'textarea',
            label: 'Mô tả ngắn',
            admin: {
                rows: 3,
                description:
                    'Không bắt buộc. Ví dụ: Hương hoa trắng thanh lịch, mềm mại.',
            },
        },

        {
            name: 'isActive',
            type: 'checkbox',
            label: 'Đang sử dụng',
            defaultValue: true,
            admin: {
                position: 'sidebar',
            },
        },
    ],
}