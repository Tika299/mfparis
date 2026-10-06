import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'
import {
  consumeChatRateLimit,
  getAuthenticatedChatProfile,
  getRequestAddress,
} from '@/utilities/chatAuth'
import { createSocketTicket } from '@/utilities/socketTicket'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    if (!consumeChatRateLimit(`chat-socket-ticket:${getRequestAddress(req)}`, 60, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Bạn yêu cầu quá nhanh. Vui lòng thử lại sau.' },
        { status: 429 },
      )
    }

    const secret = process.env.SOCKET_TICKET_SECRET
    if (!secret) {
      console.error('SOCKET_TICKET_SECRET is not configured')
      return NextResponse.json(
        { error: 'Socket authentication is not configured.' },
        { status: 503 },
      )
    }

    const payload = await getPayload({ config: configPromise })
    const adminAuth = await getAuthenticatedAdminPayload(req)

    if (!('error' in adminAuth)) {
      return NextResponse.json({
        ticket: createSocketTicket({ role: 'admin' }, secret),
      })
    }

    const chatProfile = await getAuthenticatedChatProfile(payload, req)
    if (!chatProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      ticket: createSocketTicket(
        {
          role: 'customer',
          profileId: String(chatProfile.id),
        },
        secret,
      ),
    })
  } catch (error) {
    console.error('Socket ticket creation failed', error)
    return NextResponse.json({ error: 'Không thể xác thực kết nối realtime.' }, { status: 500 })
  }
}
