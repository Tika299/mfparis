import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'
import {
  consumeChatRateLimit,
  getAuthenticatedChatProfile,
  getRequestAddress,
} from '@/utilities/chatAuth'

export async function POST(req: Request) {
  try {
    if (!consumeChatRateLimit(`chat-mark-read:${getRequestAddress(req)}`, 120, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Bạn yêu cầu quá nhanh. Vui lòng thử lại sau.' },
        { status: 429 },
      )
    }

    const { sender, sessionId } = await req.json()

    if (!sender || !['customer', 'admin'].includes(sender)) {
      return NextResponse.json({ error: 'Invalid sender' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    let profileId: string

    if (sender === 'admin') {
      const adminAuth = await getAuthenticatedAdminPayload(req)

      if ('error' in adminAuth) return adminAuth.error
      if (!sessionId) {
        return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
      }

      profileId = String(sessionId)
    } else {
      const chatProfile = await getAuthenticatedChatProfile(payload, req)

      if (!chatProfile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      profileId = String(chatProfile.id)
    }

    await payload.update({
      collection: 'messages',
      data: { isRead: true },
      where: {
        and: [
          { profile: { equals: profileId } },
          { sender: { not_equals: sender } },
          { isRead: { equals: false } },
        ],
      },
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chat mark-read failed', error)
    return NextResponse.json({ error: 'Không thể cập nhật trạng thái đọc.' }, { status: 500 })
  }
}
