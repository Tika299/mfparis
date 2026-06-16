import type {
    Access,
    CollectionAfterChangeHook,
    CollectionAfterDeleteHook,
    CollectionBeforeValidateHook,
    CollectionConfig,
    TextFieldValidation,
} from 'payload'

import { revalidateTag } from 'next/cache'

import {
    normalizeRedirectDestination,
    normalizeRedirectSource,
    REDIRECTS_CACHE_TAG,
} from '@/utilities/redirects'

type RedirectType = '301' | '302'

type RedirectData = {
    active?: boolean | null
    from?: string | null
    to?: string | null
    type?: RedirectType | null
}

type RedirectDocument = RedirectData & {
    id: number | string
}

const authenticated: Access = ({
    req: { user },
}): boolean => {
    return Boolean(user)
}

const validateRedirectSource: TextFieldValidation = (
    value,
): true | string => {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        return 'Đường dẫn nguồn là bắt buộc.'
    }

    const normalizedValue = normalizeRedirectSource(value)

    if (!normalizedValue) {
        return 'Đường dẫn nguồn phải là pathname nội bộ hoặc URL thuộc maraisdefrance.vn.'
    }

    return true
}

const validateRedirectDestination: TextFieldValidation = (
    value,
): true | string => {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        return 'Đường dẫn đích là bắt buộc.'
    }

    const normalizedValue =
        normalizeRedirectDestination(value)

    if (!normalizedValue) {
        return 'Đường dẫn đích không hợp lệ. Chỉ chấp nhận pathname hoặc URL HTTP/HTTPS.'
    }

    return true
}

const normalizeRedirectFields: CollectionBeforeValidateHook<
    RedirectDocument
> = ({ data }) => {
    if (!data) {
        return data
    }

    /*
     * Không khai báo normalizedData là RedirectData vì kiểu
     * trả về của CollectionBeforeValidateHook là Partial<RedirectDocument>.
     * Giữ nguyên kiểu suy luận giúp trường id tiếp tục hợp lệ.
     */
    const normalizedData = {
        ...data,
    }

    if (typeof data.from === 'string') {
        const normalizedFrom = normalizeRedirectSource(
            data.from,
        )

        if (normalizedFrom) {
            normalizedData.from = normalizedFrom
        }
    }

    if (typeof data.to === 'string') {
        const normalizedTo = normalizeRedirectDestination(
            data.to,
        )

        if (normalizedTo) {
            normalizedData.to = normalizedTo
        }
    }

    return normalizedData
}

function invalidateRedirectCache(): void {
    try {
        revalidateTag(REDIRECTS_CACHE_TAG, {
            expire: 0,
        })
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : 'Unknown cache invalidation error'

        console.error(
            `[Redirects] Không thể xóa cache redirects: ${message}`,
        )
    }
}

const revalidateRedirectCacheAfterChange: CollectionAfterChangeHook<
    RedirectDocument
> = ({ doc }) => {
    invalidateRedirectCache()

    return doc
}

const revalidateRedirectCacheAfterDelete: CollectionAfterDeleteHook<
    RedirectDocument
> = ({ doc }) => {
    invalidateRedirectCache()

    return doc
}

export const Redirects: CollectionConfig = {
    slug: 'redirects',

    labels: {
        singular: 'Chuyển hướng',
        plural: 'Quản lý chuyển hướng',
    },

    admin: {
        useAsTitle: 'from',
        defaultColumns: [
            'from',
            'to',
            'type',
            'active',
            'updatedAt',
        ],
        description:
            'Quản lý các URL cũ từ WordPress và lịch sử thay đổi slug.',
        group: 'SEO',
    },

    access: {
        create: authenticated,
        read: authenticated,
        update: authenticated,
        delete: authenticated,
    },

    hooks: {
        beforeValidate: [normalizeRedirectFields],
        afterChange: [
            revalidateRedirectCacheAfterChange,
        ],
        afterDelete: [
            revalidateRedirectCacheAfterDelete,
        ],
    },

    fields: [
        {
            name: 'from',
            type: 'text',
            label: 'Đường dẫn cũ',
            required: true,
            unique: true,
            index: true,
            validate: validateRedirectSource,
            admin: {
                description:
                    'Ví dụ: /cua-hang/nuoc-hoa-chanel/. Có thể dán URL đầy đủ của maraisdefrance.vn.',
                placeholder: '/cua-hang/nuoc-hoa-chanel/',
            },
        },
        {
            name: 'to',
            type: 'text',
            label: 'Đường dẫn mới',
            required: true,
            validate: validateRedirectDestination,
            admin: {
                description:
                    'Ví dụ: /products/nuoc-hoa-chanel. URL nội bộ sẽ tự động được loại bỏ domain.',
                placeholder: '/products/nuoc-hoa-chanel',
            },
        },
        {
            name: 'type',
            type: 'select',
            label: 'Loại chuyển hướng',
            required: true,
            defaultValue: '301',
            options: [
                {
                    label: '301 - Permanent',
                    value: '301',
                },
                {
                    label: '302 - Temporary',
                    value: '302',
                },
            ],
            admin: {
                description:
                    'Dùng 301 cho migration hoặc thay đổi slug lâu dài. Dùng 302 cho chuyển hướng tạm thời.',
            },
        },
        {
            name: 'active',
            type: 'checkbox',
            label: 'Đang hoạt động',
            defaultValue: true,
            index: true,
            admin: {
                description:
                    'Tắt để tạm ngừng chuyển hướng mà không xóa bản ghi.',
            },
        },
    ],
}