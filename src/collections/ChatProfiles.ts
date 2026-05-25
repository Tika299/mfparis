import { CollectionConfig } from 'payload'

export const ChatProfiles: CollectionConfig = {
    slug: 'chat-profiles',
    auth: {
        loginWithUsername: true, // Cho phép đăng nhập bằng username
    },
    admin: {
        group: 'Hỗ trợ khách hàng',
        useAsTitle: 'name',
        defaultColumns: ['name', 'username', 'createdAt'],
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'Tên hiển thị khách hàng',
        },
        {
            name: 'username',
            type: 'text',
            required: true,
            unique: true,
            label: 'Tên đăng nhập (Username)',
        },
    ],
}