import {
    APIError,
    type Access,
    type CollectionBeforeValidateHook,
    type CollectionConfig,
    type Where,
} from 'payload'

type VoucherType =
    | 'fixed'
    | 'percent'

type VoucherStatus =
    | 'active'
    | 'inactive'
    | 'draft'

type EntityID = number

type VoucherData = {
    id: EntityID
    code?: string | null
    title?: string | null
    status?: VoucherStatus | null
    type?: VoucherType | null
    value?: number | null
    minOrderAmount?: number | null
    maxDiscountAmount?: number | null
    startsAt?: string | null
    endsAt?: string | null
    usageLimit?: number | null
    usedCount?: number | null
    usageLimitPerCustomer?: number | null
    isPublic?: boolean | null
}

type FieldValidationContext = Readonly<{
    siblingData?: unknown
}>

const ADMIN_ROLES = new Set<string>([
    'admin',
    'super-admin',
    'administrator',
])

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

/**
 * Điều chỉnh helper này khi Users collection
 * của dự án sử dụng tên role khác.
 *
 * Hiện hỗ trợ:
 * - role: 'admin'
 * - role: 'super-admin'
 * - roles: ['admin']
 * - isAdmin: true
 */
function isAdminUser(
    user: unknown,
): boolean {
    if (!isRecord(user)) {
        return false
    }

    if (user.isAdmin === true) {
        return true
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

function normalizeVoucherCode(
    value: string,
): string {
    return value
        .trim()
        .toUpperCase()
}

function parseDateTimestamp(
    value: unknown,
): number | null {
    if (
        typeof value !== 'string' ||
        value.trim().length === 0
    ) {
        return null
    }

    const timestamp =
        new Date(value).getTime()

    return Number.isFinite(timestamp)
        ? timestamp
        : null
}

function assertNonNegativeNumber(
    value: unknown,
    label: string,
): void {
    if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
    ) {
        throw new APIError(
            `${label} phải là một số hợp lệ.`,
            400,
        )
    }

    if (value < 0) {
        throw new APIError(
            `${label} không được là số âm.`,
            400,
        )
    }
}

function assertOptionalNonNegativeNumber(
    value: unknown,
    label: string,
): void {
    if (
        value === undefined ||
        value === null
    ) {
        return
    }

    assertNonNegativeNumber(
        value,
        label,
    )
}

function assertNonNegativeInteger(
    value: unknown,
    label: string,
): void {
    assertNonNegativeNumber(
        value,
        label,
    )

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value)
    ) {
        throw new APIError(
            `${label} phải là số nguyên.`,
            400,
        )
    }
}

/**
 * Hook chạy trước validation.
 *
 * Nhiệm vụ:
 * 1. Chuẩn hóa code thành chữ hoa.
 * 2. Kiểm tra percent không vượt quá 100%.
 * 3. Chặn các giá trị âm.
 * 4. Kiểm tra usageLimit và usedCount.
 * 5. Kiểm tra endsAt phải lớn hơn startsAt.
 *
 * Hook sử dụng originalDoc để hỗ trợ partial update.
 */
const normalizeAndValidateVoucher:
    CollectionBeforeValidateHook<VoucherData> = ({
        data,
        originalDoc,
    }) => {
        const nextData: Partial<VoucherData> = {
            ...(data ?? {}),
        }

        if (
            typeof nextData.code === 'string'
        ) {
            nextData.code =
                normalizeVoucherCode(
                    nextData.code,
                )
        }

        const mergedData: Partial<VoucherData> = {
            ...(originalDoc ?? {}),
            ...nextData,
        }

        const normalizedCode =
            typeof mergedData.code === 'string'
                ? normalizeVoucherCode(
                    mergedData.code,
                )
                : ''

        if (!normalizedCode) {
            throw new APIError(
                'Mã voucher không được để trống.',
                400,
            )
        }

        nextData.code = normalizedCode

        const voucherType =
            mergedData.type ?? 'fixed'

        if (
            voucherType !== 'fixed' &&
            voucherType !== 'percent'
        ) {
            throw new APIError(
                'Loại voucher không hợp lệ.',
                400,
            )
        }

        assertNonNegativeNumber(
            mergedData.value,
            'Giá trị voucher',
        )

        if (
            voucherType === 'percent' &&
            typeof mergedData.value ===
            'number' &&
            mergedData.value > 100
        ) {
            throw new APIError(
                'Voucher phần trăm không được lớn hơn 100%.',
                400,
            )
        }

        assertOptionalNonNegativeNumber(
            mergedData.minOrderAmount,
            'Giá trị đơn tối thiểu',
        )

        assertOptionalNonNegativeNumber(
            mergedData.maxDiscountAmount,
            'Mức giảm tối đa',
        )

        assertNonNegativeInteger(
            mergedData.usageLimit ?? 0,
            'Giới hạn lượt dùng',
        )

        assertNonNegativeInteger(
            mergedData.usedCount ?? 0,
            'Số lượt đã sử dụng',
        )

        assertNonNegativeInteger(
            mergedData.usageLimitPerCustomer ??
            0,
            'Giới hạn mỗi khách hàng',
        )

        const usageLimit =
            mergedData.usageLimit ?? 0

        const usedCount =
            mergedData.usedCount ?? 0

        const usageLimitPerCustomer =
            mergedData.usageLimitPerCustomer ??
            0

        if (
            usageLimit > 0 &&
            usedCount > usageLimit
        ) {
            throw new APIError(
                'Số lượt đã sử dụng không được lớn hơn giới hạn tổng lượt dùng.',
                400,
            )
        }

        if (
            usageLimit > 0 &&
            usageLimitPerCustomer >
            usageLimit
        ) {
            throw new APIError(
                'Giới hạn mỗi khách hàng không được lớn hơn giới hạn tổng lượt dùng.',
                400,
            )
        }

        const startsAtTimestamp =
            parseDateTimestamp(
                mergedData.startsAt,
            )

        const endsAtTimestamp =
            parseDateTimestamp(
                mergedData.endsAt,
            )

        const hasStartsAt =
            mergedData.startsAt !== undefined &&
            mergedData.startsAt !== null &&
            mergedData.startsAt !== ''

        const hasEndsAt =
            mergedData.endsAt !== undefined &&
            mergedData.endsAt !== null &&
            mergedData.endsAt !== ''

        if (
            hasStartsAt &&
            startsAtTimestamp === null
        ) {
            throw new APIError(
                'Thời gian bắt đầu không hợp lệ.',
                400,
            )
        }

        if (
            hasEndsAt &&
            endsAtTimestamp === null
        ) {
            throw new APIError(
                'Thời gian kết thúc không hợp lệ.',
                400,
            )
        }

        /**
         * Cho phép voucher draft chưa cấu hình thời gian.
         * Nhưng nếu nhập một trong hai mốc thì phải nhập đủ cả hai.
         */
        if (hasStartsAt !== hasEndsAt) {
            throw new APIError(
                'Phải nhập đầy đủ cả thời gian bắt đầu và thời gian kết thúc.',
                400,
            )
        }

        if (
            startsAtTimestamp !== null &&
            endsAtTimestamp !== null &&
            endsAtTimestamp <=
            startsAtTimestamp
        ) {
            throw new APIError(
                'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.',
                400,
            )
        }

        return nextData
    }

const adminOnly: Access = ({ req }) => { return Boolean(req.user) }

/**
 * Admin xem được toàn bộ voucher.
 *
 * Khách hàng và người dùng thông thường
 * chỉ xem được voucher:
 * - status = active
 * - isPublic = true
 * - đã tới thời gian bắt đầu
 * - chưa hết thời gian kết thúc
 */

const readVoucherAccess: Access = ({ req }) => {
    if (req.user) {
        return true
    }

    const now = new Date().toISOString()

    const publicVoucherWhere: Where = {
        and: [
            {
                status: {
                    equals: 'active',
                },
            },
            {
                isPublic: {
                    equals: true,
                },
            },
            {
                startsAt: {
                    less_than_equal: now,
                },
            },
            {
                endsAt: {
                    greater_than_equal: now,
                },
            },
        ],
    }

    return publicVoucherWhere
}


export const Vouchers:
    CollectionConfig = {
    slug: 'vouchers',

    defaultSort: '-createdAt',

    admin: {
        useAsTitle: 'code',

        defaultColumns: [
            'code',
            'title',
            'type',
            'value',
            'status',
            'isPublic',
            'startsAt',
            'endsAt',
            'usedCount',
            'usageLimit',
        ],

        group: 'Kinh doanh',
    },

    access: {
        create: adminOnly,
        read: readVoucherAccess,
        update: adminOnly,
        delete: adminOnly,
    },

    hooks: {
        beforeValidate: [
            normalizeAndValidateVoucher,
        ],
    },

    fields: [
        {
            name: 'code',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            maxLength: 64,
            label: 'Mã voucher',

            admin: {
                description:
                    'VD: FLASH15, MDF50K, FREESHIP. Mã sẽ tự động được trim và chuyển thành chữ in hoa.',
            },

            validate: (
                value: unknown,
            ) => {
                if (
                    typeof value !== 'string'
                ) {
                    return 'Mã voucher không hợp lệ.'
                }

                const normalizedCode =
                    normalizeVoucherCode(value)

                if (!normalizedCode) {
                    return 'Mã voucher không được để trống.'
                }

                if (
                    normalizedCode.length > 64
                ) {
                    return 'Mã voucher không được vượt quá 64 ký tự.'
                }

                return true
            },
        },

        {
            name: 'title',
            type: 'text',
            label: 'Tên chương trình',
            maxLength: 160,
        },

        {
            name: 'status',
            type: 'select',
            required: true,
            index: true,
            label: 'Trạng thái',

            /**
             * Giữ nguyên mặc định cũ.
             */
            defaultValue: 'active',

            options: [
                {
                    label: 'Đang bật',
                    value: 'active',
                },
                {
                    label: 'Bản nháp',
                    value: 'draft',
                },
                {
                    label: 'Tắt',
                    value: 'inactive',
                },
            ],

            admin: {
                position: 'sidebar',
            },
        },

        {
            name: 'isPublic',
            type: 'checkbox',
            required: true,
            defaultValue: false,
            index: true,
            label: 'Công khai voucher',

            admin: {
                position: 'sidebar',
                description:
                    'Chỉ voucher công khai mới được hiển thị cho khách hàng. API checkout nội bộ vẫn có thể xác thực voucher riêng tư bằng overrideAccess.',
            },
        },

        {
            name: 'type',
            type: 'select',
            required: true,
            label: 'Loại giảm giá',
            defaultValue: 'fixed',

            options: [
                {
                    label:
                        'Giảm tiền trực tiếp',
                    value: 'fixed',
                },
                {
                    label:
                        'Giảm theo phần trăm',
                    value: 'percent',
                },
            ],
        },

        {
            name: 'value',
            type: 'number',
            required: true,
            min: 0,
            label: 'Giá trị giảm',

            admin: {
                description:
                    'Nếu fixed: nhập 50000. Nếu percent: nhập 10 tương ứng 10%.',
            },

            validate: (
                value: unknown,
                context: FieldValidationContext,
            ) => {
                const siblingData =
                    context.siblingData

                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value)
                ) {
                    return 'Giá trị voucher phải là một số hợp lệ.'
                }

                if (value < 0) {
                    return 'Giá trị voucher không được là số âm.'
                }

                const voucherType =
                    isRecord(siblingData) &&
                        siblingData.type === 'percent'
                        ? 'percent'
                        : 'fixed'

                if (
                    voucherType === 'percent' &&
                    value > 100
                ) {
                    return 'Voucher phần trăm không được lớn hơn 100%.'
                }

                return true
            },
        },

        {
            name: 'minOrderAmount',
            type: 'number',
            min: 0,
            label: 'Giá trị đơn tối thiểu',
            defaultValue: 0,

            admin: {
                description:
                    'Nhập 0 nếu voucher không yêu cầu giá trị đơn tối thiểu.',
            },

            validate: (
                value: unknown,
            ) => {
                if (
                    value === undefined ||
                    value === null
                ) {
                    return true
                }

                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value) ||
                    value < 0
                ) {
                    return 'Giá trị đơn tối thiểu phải lớn hơn hoặc bằng 0.'
                }

                return true
            },
        },

        {
            name: 'maxDiscountAmount',
            type: 'number',
            min: 0,
            label: 'Giảm tối đa',
            defaultValue: 0,

            admin: {
                description:
                    'Chỉ cần dùng cho voucher phần trăm. Ví dụ giảm 10% tối đa 100.000đ. Nhập 0 nếu không giới hạn.',
            },

            validate: (
                value: unknown,
            ) => {
                if (
                    value === undefined ||
                    value === null
                ) {
                    return true
                }

                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value) ||
                    value < 0
                ) {
                    return 'Mức giảm tối đa phải lớn hơn hoặc bằng 0.'
                }

                return true
            },
        },

        {
            name: 'startsAt',
            type: 'date',
            index: true,
            label: 'Thời gian bắt đầu',

            admin: {
                date: {
                    pickerAppearance:
                        'dayAndTime',
                    displayFormat:
                        'dd/MM/yyyy HH:mm',
                },
            },

            validate: (
                value: unknown,
            ) => {
                if (
                    value === undefined ||
                    value === null ||
                    value === ''
                ) {
                    return true
                }

                return parseDateTimestamp(
                    value,
                ) !== null
                    ? true
                    : 'Thời gian bắt đầu không hợp lệ.'
            },
        },

        {
            name: 'endsAt',
            type: 'date',
            index: true,
            label: 'Thời gian kết thúc',

            admin: {
                date: {
                    pickerAppearance:
                        'dayAndTime',
                    displayFormat:
                        'dd/MM/yyyy HH:mm',
                },
            },

            validate: (
                value: unknown,
                context: FieldValidationContext,
            ) => {
                const siblingData =
                    context.siblingData

                if (
                    value === undefined ||
                    value === null ||
                    value === ''
                ) {
                    return true
                }

                const endsAtTimestamp =
                    parseDateTimestamp(value)

                if (endsAtTimestamp === null) {
                    return 'Thời gian kết thúc không hợp lệ.'
                }

                const startsAt =
                    isRecord(siblingData)
                        ? siblingData.startsAt
                        : undefined

                const startsAtTimestamp =
                    parseDateTimestamp(startsAt)

                if (startsAtTimestamp === null) {
                    return true
                }

                if (
                    endsAtTimestamp <=
                    startsAtTimestamp
                ) {
                    return 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.'
                }

                return true
            },
        },

        {
            name: 'usageLimit',
            type: 'number',
            min: 0,
            label: 'Giới hạn lượt dùng',
            defaultValue: 0,

            admin: {
                step: 1,
                description:
                    'Để 0 nếu không giới hạn tổng lượt dùng.',
            },

            validate: (
                value: unknown,
            ) => {
                if (
                    typeof value !== 'number' ||
                    !Number.isInteger(value) ||
                    value < 0
                ) {
                    return 'Giới hạn lượt dùng phải là số nguyên lớn hơn hoặc bằng 0.'
                }

                return true
            },
        },

        {
            name: 'usageLimitPerCustomer',
            type: 'number',
            min: 0,
            label:
                'Giới hạn mỗi khách hàng',
            defaultValue: 0,

            admin: {
                step: 1,
                description:
                    'Ví dụ nhập 1 để mỗi tài khoản hoặc email chỉ được dùng một lần. Để 0 nếu không giới hạn.',
            },

            validate: (
                value: unknown,
                context: FieldValidationContext,
            ) => {
                const siblingData =
                    context.siblingData

                if (
                    typeof value !== 'number' ||
                    !Number.isInteger(value) ||
                    value < 0
                ) {
                    return 'Giới hạn mỗi khách hàng phải là số nguyên lớn hơn hoặc bằng 0.'
                }

                const usageLimit =
                    isRecord(siblingData) &&
                        typeof siblingData.usageLimit ===
                        'number'
                        ? siblingData.usageLimit
                        : 0

                if (
                    usageLimit > 0 &&
                    value > usageLimit
                ) {
                    return 'Giới hạn mỗi khách hàng không được lớn hơn giới hạn tổng lượt dùng.'
                }

                return true
            },
        },

        {
            name: 'usedCount',
            type: 'number',
            min: 0,
            label: 'Đã sử dụng',
            defaultValue: 0,
            index: true,

            admin: {
                readOnly: true,
                step: 1,
                description:
                    'Chỉ được cập nhật bởi Voucher Service khi redemption chuyển sang completed.',
            },

            /**
             * Không cho client hoặc admin sửa trực tiếp.
             * Voucher Service sử dụng Local API với
             * overrideAccess: true.
             */
            access: {
                create: () => false,
                update: () => false,
            },

            validate: (
                value: unknown,
                context: FieldValidationContext,
            ) => {
                const siblingData =
                    context.siblingData

                if (
                    typeof value !== 'number' ||
                    !Number.isInteger(value) ||
                    value < 0
                ) {
                    return 'Số lượt đã sử dụng phải là số nguyên lớn hơn hoặc bằng 0.'
                }

                const usageLimit =
                    isRecord(siblingData) &&
                        typeof siblingData.usageLimit ===
                        'number'
                        ? siblingData.usageLimit
                        : 0

                if (
                    usageLimit > 0 &&
                    value > usageLimit
                ) {
                    return 'Số lượt đã sử dụng không được lớn hơn giới hạn tổng lượt dùng.'
                }

                return true
            },
        },
    ],
}