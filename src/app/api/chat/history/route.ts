import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sid = searchParams.get('sid')
    const page = searchParams.get('page') || '1' // Mặc định lấy trang 1

    if (!sid) return NextResponse.json([])

    const payload = await getPayload({ config: configPromise })

    const history = await payload.find({
      collection: 'messages',
      where: { profile: { equals: sid } },
      sort: '-createdAt', // Lấy tin MỚI NHẤT trước để phân trang đúng
      limit: 20,          // Mỗi lần lấy 20 tin
      page: parseInt(page),
    })

    // Vì ta lấy sort -createdAt (mới nhất lên đầu) 
    // nên ở Frontend ta phải đảo ngược lại mảng này để hiện đúng thứ tự thời gian.
    return NextResponse.json({
      docs: history.docs,
      hasNextPage: history.hasNextPage,
      nextPage: history.nextPage
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}