import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.sessionId || !body.sender || !body.content) {
      return Response.json(
        {
          error: 'Missing sessionId, sender or content',
        },
        { status: 400 },
      )
    }

    const adminAuth = body.sender === 'admin' ? await getAuthenticatedAdminPayload(req) : null

    if (adminAuth && 'error' in adminAuth) return adminAuth.error

    const payload =
      adminAuth && !('error' in adminAuth)
        ? adminAuth.payload
        : await getPayload({ config: configPromise })

    const msg = await payload.create({
      collection: 'messages',
      data: {
        profile: body.sessionId,
        customerName: body.customerName || 'Khách hàng',
        sender: body.sender,
        content: body.content,
      } as any,
      depth: 0,
    })

    return Response.json({
      success: true,
      doc: msg,
    })
  } catch (error: any) {
    console.error('❌ CHAT SEND ERROR:', error)
    console.error('❌ CHI TIẾT LỖI VALIDATION:', JSON.stringify(error.data, null, 2))

    return Response.json(
      {
        error: error.message || 'Không thể gửi tin nhắn',
        details: error.data || null,
      },
      { status: 500 },
    )
  }
}
