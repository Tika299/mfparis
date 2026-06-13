import { CollectionConfig } from 'payload'

export const Vouchers: CollectionConfig = {
    slug: 'vouchers',

    admin: {
        useAsTitle: 'code',
        defaultColumns: ['code', 'type', 'value', 'status', 'startsAt', 'endsAt', 'usedCount'],
        group: 'Kinh doanh',
    },

    access: {
        read: () => true,
    },

    fields: [
        {
            name: 'code',
            type: 'text',
            required: true,
            unique: true,
            label: 'Mã voucher',
            admin: {
                description: 'VD: FLASH15, MDF50K, FREESHIP',
            },
        },
        {
            name: 'title',
            type: 'text',
            label: 'Tên chương trình',
        },
        {
            name: 'status',
            type: 'select',
            label: 'Trạng thái',
            defaultValue: 'active',
            options: [
                {
                    label: 'Đang bật',
                    value: 'active',
                },
                {
                    label: 'Tắt',
                    value: 'inactive',
                },
            ],
        },
        {
            name: 'type',
            type: 'select',
            required: true,
            label: 'Loại giảm giá',
            defaultValue: 'fixed',
            options: [
                {
                    label: 'Giảm tiền trực tiếp',
                    value: 'fixed',
                },
                {
                    label: 'Giảm theo phần trăm',
                    value: 'percent',
                },
            ],
        },
        {
            name: 'value',
            type: 'number',
            required: true,
            label: 'Giá trị giảm',
            admin: {
                description: 'Nếu fixed: nhập 50000. Nếu percent: nhập 10 tương ứng 10%.',
            },
        },
        {
            name: 'minOrderAmount',
            type: 'number',
            label: 'Giá trị đơn tối thiểu',
            defaultValue: 0,
        },
        {
            name: 'maxDiscountAmount',
            type: 'number',
            label: 'Giảm tối đa',
            admin: {
                description: 'Chỉ cần dùng cho voucher phần trăm. VD: giảm 10% tối đa 100.000đ.',
            },
        },
        {
            name: 'startsAt',
            type: 'date',
            label: 'Thời gian bắt đầu',
            admin: {
                date: {
                    pickerAppearance: 'dayAndTime',
                    displayFormat: 'dd/MM/yyyy HH:mm',
                },
            },
        },
        {
            name: 'endsAt',
            type: 'date',
            label: 'Thời gian kết thúc',
            admin: {
                date: {
                    pickerAppearance: 'dayAndTime',
                    displayFormat: 'dd/MM/yyyy HH:mm',
                },
            },
        },
        {
            name: 'usageLimit',
            type: 'number',
            label: 'Giới hạn lượt dùng',
            admin: {
                description: 'Để trống hoặc 0 nếu không giới hạn.',
            },
        },
        {
            name: 'usedCount',
            type: 'number',
            label: 'Đã sử dụng',
            defaultValue: 0,
            admin: {
                readOnly: true,
            },
        },
    ],
}