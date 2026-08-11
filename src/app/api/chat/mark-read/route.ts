import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'

export async function POST(req: Request) {
  try {
    const { sender, sessionId } = await req.json()

    if (!sessionId || !sender) {
      return NextResponse.json({ error: 'Missing sessionId or sender' }, { status: 400 })
    }

    const adminAuth = sender === 'admin' ? await getAuthenticatedAdminPayload(req) : null

    if (adminAuth && 'error' in adminAuth) return adminAuth.error

    const payload =
      adminAuth && !('error' in adminAuth)
        ? adminAuth.payload
        : await getPayload({ config: configPromise })

    await payload.update({
      collection: 'messages',
      data: { isRead: true },
      where: {
        and: [
          { profile: { equals: sessionId } },
          { sender: { not_equals: sender } },
          { isRead: { equals: false } },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Không thể cập nhật trạng thái đọc.' }, { status: 500 })
  }
}
