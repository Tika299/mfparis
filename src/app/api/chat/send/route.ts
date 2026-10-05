import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'
import {
  consumeChatRateLimit,
  getAuthenticatedChatProfile,
  getRequestAddress,
} from '@/utilities/chatAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (!consumeChatRateLimit(`chat-send:${getRequestAddress(req)}`, 30, 60 * 1000)) {
      return Response.json(
        { error: 'Bạn gửi tin quá nhanh. Vui lòng thử lại sau.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const sender = body?.sender
    const content = typeof body?.content === 'string' ? body.content.trim() : ''

    if (!sender || !content) {
      return Response.json(
        {
          error: 'Missing sender or content',
        },
        { status: 400 },
      )
    }

    if (!['customer', 'admin'].includes(sender)) {
      return Response.json({ error: 'Invalid sender' }, { status: 400 })
    }

    if (content.length > 2000) {
      return Response.json({ error: 'Tin nhắn không được vượt quá 2000 ký tự.' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    let profileId: number
    let customerName = 'Khách hàng'

    if (sender === 'admin') {
      const adminAuth = await getAuthenticatedAdminPayload(req)

      if ('error' in adminAuth) return adminAuth.error

      if (!body?.sessionId) {
        return Response.json({ error: 'Missing sessionId' }, { status: 400 })
      }

      profileId = Number(body.sessionId)
      customerName =
        typeof body.customerName === 'string' && body.customerName.trim()
          ? body.customerName.trim().slice(0, 100)
          : customerName
    } else {
      const chatProfile = await getAuthenticatedChatProfile(payload, req)

      if (!chatProfile) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      profileId = Number(chatProfile.id)
      customerName =
        typeof chatProfile.name === 'string' && chatProfile.name.trim()
          ? chatProfile.name.trim().slice(0, 100)
          : customerName
    }

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return Response.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const msg = await payload.create({
      collection: 'messages',
      data: {
        profile: profileId,
        customerName,
        sender,
        content,
      },
      depth: 0,
      overrideAccess: true,
    })

    return Response.json({
      success: true,
      doc: msg,
    })
  } catch (error) {
    console.error('Chat send failed', error)

    return Response.json(
      {
        error: 'Không thể gửi tin nhắn',
      },
      { status: 500 },
    )
  }
}
