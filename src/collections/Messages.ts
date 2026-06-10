import { CollectionConfig } from 'payload'

export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    group: 'Hỗ trợ khách hàng',
    defaultColumns: ['customerName', 'content', 'sender', 'createdAt'],
  },
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    {
      name: 'profile', // Thay cho sessionId
      type: 'relationship',
      relationTo: 'chat-profiles',
      required: true,
      index: true,
    },
    { name: 'customerName', type: 'text', required: true },
    { name: 'sender', type: 'select', options: ['customer', 'admin'], required: true },
    { name: 'content', type: 'textarea', required: true },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false, // Mặc định là chưa đọc
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          // Lấy ID của profile để làm roomId cho Socket
          const profileId = typeof doc.profile === 'object' ? doc.profile.id : doc.profile;
          try {
            await fetch(`${process.env.SOCKET_SERVER_URL}/broadcast-admin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...doc, sessionId: profileId }),
            })
          } catch (e) { console.error(e) }
        }
      },
    ],
  },
}