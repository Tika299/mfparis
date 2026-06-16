import type {
    Field,
    RelationshipFieldSingleValidation,
} from 'payload'

export const PRODUCT_SEO_STATUSES = [
    'active',
    'temporarily_out_of_stock',
    'discontinued_keep_page',
    'discontinued_redirect',
] as const

export type ProductSeoStatus =
    (typeof PRODUCT_SEO_STATUSES)[number]

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isProductSeoStatus(
    value: unknown,
): value is ProductSeoStatus {
    return (
        value === 'active' ||
        value === 'temporarily_out_of_stock' ||
        value === 'discontinued_keep_page' ||
        value === 'discontinued_redirect'
    )
}

function getSeoStatusFromSiblingData(
    siblingData: unknown,
): ProductSeoStatus | null {
    if (!isRecord(siblingData)) {
        return null
    }

    const seoStatus = siblingData.seoStatus

    return isProductSeoStatus(seoStatus)
        ? seoStatus
        : null
}

function hasRelationshipValue(
    value: unknown,
): boolean {
    if (typeof value === 'string') {
        return value.trim().length > 0
    }

    if (typeof value === 'number') {
        return Number.isFinite(value)
    }

    if (!isRecord(value)) {
        return false
    }

    const id = value.id

    if (
        typeof id === 'string' &&
        id.trim().length > 0
    ) {
        return true
    }

    if (
        typeof id === 'number' &&
        Number.isFinite(id)
    ) {
        return true
    }

    /*
     * Hỗ trợ cấu trúc relationship đa hình của Payload:
     * { relationTo: 'products', value: id }
     */
    const relationshipValue = value.value

    if (
        typeof relationshipValue === 'string' &&
        relationshipValue.trim().length > 0
    ) {
        return true
    }

    return (
        typeof relationshipValue === 'number' &&
        Number.isFinite(relationshipValue)
    )
}

const validateRelatedProduct: RelationshipFieldSingleValidation =
    (value, { siblingData }): true | string => {
        const seoStatus =
            getSeoStatusFromSiblingData(siblingData)

        if (
            seoStatus === 'discontinued_redirect' &&
            !hasRelationshipValue(value)
        ) {
            return 'Bắt buộc chọn sản phẩm thay thế khi trạng thái là discontinued_redirect.'
        }

        return true
    }

export const productSeoLifecycleFields: Field[] = [
    {
        name: 'seoStatus',
        type: 'select',
        label: 'Trạng thái vòng đời SEO',
        required: true,
        defaultValue: 'active',
        index: true,
        options: [
            {
                label:
                    'Active - Sản phẩm đang bán bình thường',
                value: 'active',
            },
            {
                label: 'Hết hàng tạm thời',
                value: 'temporarily_out_of_stock',
            },
            {
                label: 'Ngừng bán - Giữ lại trang',
                value: 'discontinued_keep_page',
            },
            {
                label:
                    'Ngừng bán - Chuyển sang sản phẩm thay thế',
                value: 'discontinued_redirect',
            },
        ],
        admin: {
            description:
                'Quyết định cách trang chi tiết sản phẩm được render, index và chuyển hướng.',
            position: 'sidebar',
        },
    },
    {
        name: 'relatedProduct',
        type: 'relationship',
        relationTo: 'products',
        label: 'Sản phẩm thay thế',
        index: true,
        validate: validateRelatedProduct,
        filterOptions: {
            and: [
                {
                    status: {
                        equals: 'published',
                    },
                },
                {
                    seoStatus: {
                        in: [
                            'active',
                            'temporarily_out_of_stock',
                        ],
                    },
                },
            ],
        },
        admin: {
            description:
                'Sản phẩm được chuyển hướng đến khi trạng thái là discontinued_redirect.',
            position: 'sidebar',
            condition: (
                _data: unknown,
                siblingData: unknown,
            ): boolean => {
                return (
                    getSeoStatusFromSiblingData(
                        siblingData,
                    ) === 'discontinued_redirect'
                )
            },
        },
    },
]