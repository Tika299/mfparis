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
  const sessionMap = new Map<string, any>()

  function getProfileId(profile: any): string | null {
    if (!profile) return null
    if (typeof profile === 'object') {
      // payload may store profile as { id: '...' } or { _id: '...' }
      return profile.id || profile._id || null
    }
    return String(profile)
  }

  for (const msg of messages.docs) {

    const profileId = getProfileId(msg.profile)
    if (!profileId) continue
    const current = sessionMap.get(profileId)
    const unreadIncrement = (msg.sender === 'customer' && !msg.isRead) ? 1 : 0
    if (!current) {
      sessionMap.set(profileId, {
        sessionId: profileId,
        customerName: msg.customerName || 'Khách hàng',
        lastMessage: msg.content || '',
        updatedAt: msg.createdAt || '',
        unreadCount: unreadIncrement, // Khởi tạo số tin chưa đọc
      })
      continue
    }

    if (unreadIncrement > 0) {
      current.unreadCount += 1
    }

    const pId = typeof msg.profile === 'object' ? msg.profile.id : msg.profile
    if (!seenIds.has(pId)) {
      seenIds.add(pId)
      sessions.push({
        sessionId: pId,
        customerName: msg.customerName,
        lastMessage: msg.content,
        updatedAt: msg.createdAt,
      })
    }
  }

  return Response.json(sessions)
}
