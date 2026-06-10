import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const data = await req.json()

    for (const item of data.items) {
      const productId = item.product
      const variantId = item.variantId
      const quantity = Number(item.quantity || 0)

      if (!productId || quantity <= 0) {
        return NextResponse.json(
          { error: 'Dữ liệu sản phẩm không hợp lệ' },
          { status: 400 },
        )
      }

      const product: any = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
      })

      if (!product) {
        return NextResponse.json(
          { error: 'Không tìm thấy sản phẩm' },
          { status: 404 },
        )
      }

      if (variantId) {
        const variant = product.variants?.find(
          (variant: any) => String(variant.id) === String(variantId),
        )

        const stock = Number(variant?.stock || 0)

        if (!variant || stock <= 0) {
          return NextResponse.json(
            { error: `${product.title} - phân loại đã hết hàng` },
            { status: 400 },
          )
        }

        if (quantity > stock) {
          return NextResponse.json(
            { error: `${product.title} chỉ còn ${stock} sản phẩm` },
            { status: 400 },
          )
        }
      } else {
        const stock = Number(product?.price?.stock || 0)

        if (stock <= 0) {
          return NextResponse.json(
            { error: `${product.title} đã hết hàng` },
            { status: 400 },
          )
        }

        if (quantity > stock) {
          return NextResponse.json(
            { error: `${product.title} chỉ còn ${stock} sản phẩm` },
            { status: 400 },
          )
        }
      }
    }

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
