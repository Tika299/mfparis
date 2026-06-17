import {
    APIError,
    type Access,
    type CollectionBeforeChangeHook,
    type CollectionBeforeValidateHook,
    type CollectionConfig,
} from 'payload'

type EntityID = number

type RelationshipValue =
    | EntityID
    | {
        id: EntityID
    }

type RedemptionStatus =
    | 'held'
    | 'completed'
    | 'cancelled'

type VoucherRedemptionDocument = {
    id: EntityID
    voucher?: RelationshipValue | null
    order?: RelationshipValue | null
    customer?: RelationshipValue | null
    email?: string | null
    discountAmount?: number | null
    status?: RedemptionStatus | null
    heldAt?: string | null
    completedAt?: string | null
    cancelledAt?: string | null
}

const ADMIN_ROLES = new Set([
    'admin',
    'super-admin',
])

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function isAdminUser(
    user: unknown,
): boolean {
    if (!isRecord(user)) {
        return false
    }

    if (
        typeof user.role === 'string' &&
        ADMIN_ROLES.has(user.role)
    ) {
        return true
    }

    if (Array.isArray(user.roles)) {
        return user.roles.some(
            (role) =>
                typeof role === 'string' &&
                ADMIN_ROLES.has(role),
        )
    }

    return false
}

function relationshipID(
    value: unknown,
): EntityID | undefined {
    if (typeof value === 'number') {
        return value
    }

    if (!isRecord(value)) {
        return undefined
    }

    return typeof value.id === 'number'
        ? value.id
        : undefined
}

function normalizeEmail(
    value: unknown,
): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const normalized =
        value.trim().toLowerCase()

    return normalized || undefined
}

function isValidEmail(
    value: string,
): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(
        value,
    )
}

const adminOnly: Access = ({ req }) => {
    return isAdminUser(req.user)
}

/**
 * Redemption chỉ được tạo/sửa bởi business service
 * thông qua Payload Local API với overrideAccess: true.
 */
const denyDirectMutation: Access = () => {
    return false
}

const validateRedemption:
    CollectionBeforeValidateHook<VoucherRedemptionDocument> =
    ({
        data,
        originalDoc,
        operation,
    }) => {
        const nextData:
            Partial<VoucherRedemptionDocument> = {
            ...(data ?? {}),
        }

        if (
            Object.prototype.hasOwnProperty.call(
                nextData,
                'email',
            )
        ) {
            nextData.email =
                normalizeEmail(nextData.email) ??
                null
        }

        if (
            operation === 'create' &&
            !nextData.status
        ) {
            nextData.status = 'held'
        }

        const mergedData:
            Partial<VoucherRedemptionDocument> = {
            ...(originalDoc ?? {}),
            ...nextData,
        }

        const customerId =
            relationshipID(
                mergedData.customer,
            )

        const email =
            normalizeEmail(mergedData.email)

        if (
            customerId === undefined &&
            !email
        ) {
            throw new APIError(
                'Redemption phải có customer hoặc email.',
                400,
            )
        }

        if (
            email &&
            !isValidEmail(email)
        ) {
            throw new APIError(
                'Email khách hàng không hợp lệ.',
                400,
            )
        }

        const discountAmount =
            mergedData.discountAmount

        if (
            typeof discountAmount !== 'number' ||
            !Number.isFinite(discountAmount) ||
            discountAmount < 0
        ) {
            throw new APIError(
                'Số tiền giảm phải là số lớn hơn hoặc bằng 0.',
                400,
            )
        }

        const status =
            mergedData.status

        if (
            status !== 'held' &&
            status !== 'completed' &&
            status !== 'cancelled'
        ) {
            throw new APIError(
                'Trạng thái redemption không hợp lệ.',
                400,
            )
        }

        return nextData
    }

/**
 * Tự động ghi nhận thời gian thay đổi trạng thái.
 *
 * Payload vẫn tự tạo createdAt và updatedAt.
 * Các field bên dưới giúp audit rõ thời điểm giữ,
 * hoàn tất hoặc hủy lượt voucher.
 */
const setRedemptionTimestamps:
    CollectionBeforeChangeHook<VoucherRedemptionDocument> =
    ({
        data,
        originalDoc,
        operation,
    }) => {
        const nextData:
            Partial<VoucherRedemptionDocument> = {
            ...(data ?? {}),
        }

        const now = new Date().toISOString()

        const previousStatus =
            originalDoc?.status

        const nextStatus =
            nextData.status ??
            previousStatus ??
            'held'

        if (
            operation === 'create' &&
            !nextData.heldAt
        ) {
            nextData.heldAt = now
        }

        if (
            nextStatus === 'completed' &&
            previousStatus !== 'completed'
        ) {
            nextData.completedAt =
                nextData.completedAt ?? now
        }

        if (
            nextStatus === 'cancelled' &&
            previousStatus !== 'cancelled'
        ) {
            nextData.cancelledAt =
                nextData.cancelledAt ?? now
        }

        return nextData
    }

export const VoucherRedemptions:
    CollectionConfig = {
    slug: 'voucher-redemptions',

    defaultSort: '-createdAt',

    admin: {
        useAsTitle: 'id',
        group: 'Kinh doanh',
        defaultColumns: [
            'voucher',
            'order',
            'customer',
            'email',
            'discountAmount',
            'status',
            'heldAt',
            'completedAt',
            'cancelledAt',
        ],
        description:
            'Sổ lịch sử giữ lượt, hoàn tất và hủy voucher. Không chỉnh sửa thủ công.',
    },

    access: {
        create: denyDirectMutation,
        read: adminOnly,
        update: denyDirectMutation,
        delete: denyDirectMutation,
    },

    hooks: {
        beforeValidate: [
            validateRedemption,
        ],
        beforeChange: [
            setRedemptionTimestamps,
        ],
    },

    fields: [
        {
            name: 'voucher',
            type: 'relationship',
            relationTo: 'vouchers',
            required: true,
            index: true,
            label: 'Voucher',
            admin: {
                position: 'sidebar',
            },
        },

        {
            name: 'order',
            type: 'relationship',
            relationTo: 'orders',
            required: true,
            index: true,
            label: 'Đơn hàng',
            admin: {
                position: 'sidebar',
            },
        },

        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'users',
            required: false,
            index: true,
            label: 'Khách hàng có tài khoản',
            admin: {
                position: 'sidebar',
                description:
                    'Có thể để trống nếu khách mua hàng không đăng nhập.',
            },
        },

        {
            name: 'email',
            type: 'text',
            required: false,
            index: true,
            maxLength: 254,
            label: 'Email khách hàng',
            admin: {
                position: 'sidebar',
                description:
                    'Bắt buộc khi redemption không có customer.',
            },
            hooks: {
                beforeValidate: [
                    ({ value }) =>
                        normalizeEmail(value) ?? null,
                ],
            },
            validate: (value: unknown) => {
                if (
                    value === undefined ||
                    value === null ||
                    value === ''
                ) {
                    return true
                }

                if (typeof value !== 'string') {
                    return 'Email không hợp lệ.'
                }

                const normalized =
                    normalizeEmail(value)

                if (
                    !normalized ||
                    !isValidEmail(normalized)
                ) {
                    return 'Email không hợp lệ.'
                }

                return true
            },
        },

        {
            name: 'discountAmount',
            type: 'number',
            required: true,
            min: 0,
            label: 'Số tiền được giảm',
            admin: {
                readOnly: true,
            },
            validate: (value: unknown) => {
                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value) ||
                    value < 0
                ) {
                    return 'Số tiền giảm phải lớn hơn hoặc bằng 0.'
                }

                return true
            },
        },

        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'held',
            index: true,
            label: 'Trạng thái',
            options: [
                {
                    label: 'Đang giữ lượt',
                    value: 'held',
                },
                {
                    label: 'Đã sử dụng thành công',
                    value: 'completed',
                },
                {
                    label: 'Đã hủy / hoàn lượt',
                    value: 'cancelled',
                },
            ],
            admin: {
                position: 'sidebar',
                readOnly: true,
            },
        },

        {
            name: 'heldAt',
            type: 'date',
            index: true,
            label: 'Thời gian giữ lượt',
            admin: {
                readOnly: true,
                date: {
                    pickerAppearance:
                        'dayAndTime',
                    displayFormat:
                        'dd/MM/yyyy HH:mm',
                },
            },
        },

        {
            name: 'completedAt',
            type: 'date',
            index: true,
            label: 'Thời gian hoàn tất',
            admin: {
                readOnly: true,
                condition: (_, siblingData) =>
                    siblingData?.status ===
                    'completed',
                date: {
                    pickerAppearance:
                        'dayAndTime',
                    displayFormat:
                        'dd/MM/yyyy HH:mm',
                },
            },
        },

        {
            name: 'cancelledAt',
            type: 'date',
            index: true,
            label: 'Thời gian hủy / hoàn lượt',
            admin: {
                readOnly: true,
                condition: (_, siblingData) =>
                    siblingData?.status ===
                    'cancelled',
                date: {
                    pickerAppearance:
                        'dayAndTime',
                    displayFormat:
                        'dd/MM/yyyy HH:mm',
                },
            },
        },
    ],
}