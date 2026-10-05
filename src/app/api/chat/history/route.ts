import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

import {
  consumeChatRateLimit,
  getAuthenticatedChatProfile,
  getRequestAddress,
} from '@/utilities/chatAuth'
import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'

export async function GET(req: Request) {
  try {
    if (!consumeChatRateLimit(`chat-history:${getRequestAddress(req)}`, 120, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Bạn yêu cầu quá nhanh. Vui lòng thử lại sau.' },
        { status: 429 },
      )
    }

    const { searchParams } = new URL(req.url)
    const payload = await getPayload({ config: configPromise })

    const chatProfile = await getAuthenticatedChatProfile(payload, req)
    let profileId: string | null = chatProfile?.id ? String(chatProfile.id) : null

    if (!profileId) {
      const adminAuth = await getAuthenticatedAdminPayload(req)

      if ('error' in adminAuth) return adminAuth.error

      const sid = searchParams.get('sid')
      if (!sid) {
        return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
      }

      profileId = sid
    }

    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10)
    const page = Number.isFinite(parsedPage) ? Math.min(Math.max(parsedPage, 1), 100) : 1

    const history = await payload.find({
      collection: 'messages',
      where: { profile: { equals: profileId } },
      sort: '-createdAt',
      limit: 20,
      page,
      overrideAccess: true,
    })

    // Vì ta lấy sort -createdAt (mới nhất lên đầu)
    // nên ở Frontend ta phải đảo ngược lại mảng này để hiện đúng thứ tự thời gian.
    return NextResponse.json({
      docs: history.docs,
      hasNextPage: history.hasNextPage,
      nextPage: history.nextPage,
    })
  } catch (error) {
    console.error('Chat history failed', error)
    return NextResponse.json({ error: 'Không thể tải lịch sử trò chuyện.' }, { status: 500 })
  }
}
