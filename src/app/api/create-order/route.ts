import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const data = await req.json()

    // Tạo bản ghi mới trong collection 'orders'
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: null,
        customerInfo: {
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          province: data.province,
        },
        // Chú ý: Vì chúng ta dùng ecommerce plugin,
        // đôi khi trường này cần khớp với schema Orders.ts đã tạo
        items: data.items,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        status: 'pending',
        // Nếu bạn có hệ thống User login, hãy gán customer ID ở đây
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Lỗi tạo đơn hàng:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
