import { CollectionConfig } from 'payload'

export const ChatProfiles: CollectionConfig = {
  slug: 'chat-profiles',
  auth: {
    loginWithUsername: true, // Cho phép đăng nhập bằng username
  },
  access: {
    // Customer profiles are accessed through the dedicated chat API only.
    read: ({ req }) => req.user?.collection === 'users',
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => req.user?.collection === 'users',
    delete: ({ req }) => req.user?.collection === 'users',
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
