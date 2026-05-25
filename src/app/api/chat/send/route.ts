import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const body = await req.json() // Lấy dữ liệu từ frontend gửi lên

    // LOG để bạn kiểm tra dữ liệu gửi lên có đúng ID không
    // console.log("Dữ liệu nhận được:", body)

    const msg = await payload.create({
      collection: 'messages',
      data: {
        // QUAN TRỌNG: Đổi sessionId thành profile để khớp với Schema mới
        profile: body.sessionId,
        customerName: body.customerName,
        sender: body.sender,
        content: body.content,
      } as any, // Dùng as any để bypass kiểm tra type nghiêm ngặt của Payload
    })

    return Response.json(msg)
  } catch (error: any) {
    // In ra chi tiết lỗi Validation nếu có
    console.error("❌ CHI TIẾT LỖI VALIDATION:", JSON.stringify(error.data, null, 2))
    return Response.json({ error: error.message }, { status: 500 })
  }
}