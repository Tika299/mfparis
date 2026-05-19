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
    { name: 'sessionId', type: 'text', required: true, index: true },
    { name: 'customerName', type: 'text', required: true },
    { name: 'sender', type: 'select', options: ['customer', 'admin'], required: true },
    { name: 'content', type: 'textarea', required: true },
  ],
  hooks: {
    // Khi Admin bấm lưu tin nhắn trong trang Quản trị,
    // tự động bắn tin nhắn đó sang Server Socket để khách nhận được ngay
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create' && doc.sender === 'admin') {
          await fetch('http://localhost:3001/broadcast-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc),
          })
        }
      },
    ],
  },
}
