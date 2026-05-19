import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET() {
  const payload = await getPayload({ config: configPromise })

  // Lấy 200 tin nhắn mới nhất
  const messages = await payload.find({
    collection: 'messages',
    sort: '-createdAt',
    limit: 200,
  })

  // Nhóm tin nhắn theo sessionId để tạo danh sách "hộp chat"
  const sessions = []
  const seenIds = new Set()

  for (const msg of messages.docs) {
    if (!seenIds.has(msg.sessionId)) {
      seenIds.add(msg.sessionId)
      sessions.push({
        sessionId: msg.sessionId,
        customerName: msg.customerName,
        lastMessage: msg.content,
        updatedAt: msg.createdAt,
      })
    }
  }

  return Response.json(sessions)
}
