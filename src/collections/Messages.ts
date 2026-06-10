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
        if (operation !== 'create') return

        const socketServerUrl = process.env.SOCKET_SERVER_URL?.replace(/\/$/, '')
        const socketToken = process.env.SOCKET_INTERNAL_TOKEN

        const profileId =
          typeof doc.profile === 'object'
            ? doc.profile.id
            : doc.profile

        if (!socketServerUrl) {
          console.warn('⚠️ Missing SOCKET_SERVER_URL, skip socket broadcast')
          return
        }

        if (!profileId) {
          console.warn('⚠️ Missing profileId, skip socket broadcast', {
            messageId: doc.id,
            profile: doc.profile,
          })
          return
        }

        try {
          const res = await fetch(`${socketServerUrl}/broadcast-admin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-socket-token': socketToken || '',
            },
            body: JSON.stringify({
              ...doc,
              sessionId: String(profileId),
            }),
            cache: 'no-store',
          })

          const text = await res.text()

          console.log('🔌 Socket broadcast response:', {
            status: res.status,
            text,
            messageId: doc.id,
            sessionId: String(profileId),
            sender: doc.sender,
          })

          if (!res.ok) {
            console.error('❌ Socket broadcast failed:', {
              status: res.status,
              text,
            })
          }
        } catch (error: any) {
          console.error('❌ Socket broadcast fetch error:', {
            message: error?.message,
            cause: error?.cause,
          })
        }
      },
    ],
  },
}