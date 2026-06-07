import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { sessionId, sender } = await req.json() // sender là người ĐANG ĐỌC
        const payload = await getPayload({ config: configPromise })

        await payload.update({
            collection: 'messages',
            where: {
                and: [
                    { profile: { equals: sessionId } },
                    { sender: { not_equals: sender } }, // Đọc tin của ĐỐI PHƯƠNG
                    { isRead: { equals: false } }
                ]
            },
            data: { isRead: true },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Lỗi cập nhật trạng thái' }, { status: 500 })
    }
}