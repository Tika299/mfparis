import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const body = await req.json()

    if (!body.sessionId || !body.sender || !body.content) {
      return Response.json(
        {
          error: 'Missing sessionId, sender or content',
        },
        { status: 400 },
      )
    }

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