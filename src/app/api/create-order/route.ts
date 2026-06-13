import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { validateVoucher } from '@/lib/voucher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_PAYMENT_METHODS = ['cod', 'fundiin']
const MAX_QUANTITY_PER_ITEM = 99

function getFinalPrice(basePrice: number, salePrice: number) {
  return salePrice > 0 ? salePrice : basePrice
}

function cleanText(value: unknown, maxLength = 255) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function cleanPhone(value: unknown) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 15)
}

function getIncomingProductId(item: any) {
  return String(item?.product || item?.productId || item?.id || '').trim()
}

function getIncomingVariantId(item: any) {
  const variantId = item?.variantId

  if (!variantId) return null

  return String(variantId).trim()
}

function getIncomingQuantity(item: any) {
  return Math.floor(Number(item?.quantity || 0))
}

function normalizeItems(rawItems: any[]) {
  const groupedItems = new Map<
    string,
    {
      productId: string
      variantId: string | null
      quantity: number
    }
  >()

  for (const item of rawItems) {
    const productId = getIncomingProductId(item)
    const variantId = getIncomingVariantId(item)
    const quantity = getIncomingQuantity(item)

    if (!productId || quantity <= 0) {
      throw new Error('Dữ liệu sản phẩm không hợp lệ')
    }

    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new Error('Số lượng sản phẩm không hợp lệ')
    }

    const key = `${productId}::${variantId || 'simple'}`

    const current = groupedItems.get(key)

    groupedItems.set(key, {
      productId,
      variantId,
      quantity: (current?.quantity || 0) + quantity,
    })
  }

  return Array.from(groupedItems.values())
}

async function validateAndBuildOrderItem(payload: any, item: any) {
  const { productId, variantId, quantity } = item

  const product: any = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 1,
  })

  if (!product) {
    throw new Error('Không tìm thấy sản phẩm')
  }

  if (product?.status && product.status !== 'published') {
    throw new Error(`${product.title} hiện không còn được bán`)
  }

  const activeVariants = Array.isArray(product?.variants)
    ? product.variants.filter((variant: any) => variant?.isActive !== false)
    : []

  const isVariableProduct = product?.productType === 'variable'

  let latestPrice = 0
  let latestStock = 0
  let variantName: string | null = null

  if (isVariableProduct) {
    if (!variantId) {
      throw new Error(`${product.title} cần chọn phân loại`)
    }

    const variant = activeVariants.find(
      (variant: any) => String(variant.id) === String(variantId),
    )

    if (!variant) {
      throw new Error(`${product.title} - phân loại đã ngừng bán`)
    }

    const basePrice = Number(variant?.basePrice || variant?.price || 0)
    const salePrice = Number(variant?.salePrice || 0)

    latestPrice = getFinalPrice(basePrice, salePrice)
    latestStock = Number(variant?.stock || 0)
    variantName = variant?.name || null
  } else {
    if (variantId) {
      throw new Error(`${product.title} không có phân loại hợp lệ`)
    }

    const basePrice = Number(product?.price?.basePrice || 0)
    const salePrice = Number(product?.price?.salePrice || 0)

    latestPrice = getFinalPrice(basePrice, salePrice)
    latestStock = Number(product?.price?.stock || 0)
  }

  if (latestPrice <= 0) {
    throw new Error(`${product.title}${variantName ? ` - ${variantName}` : ''} cần liên hệ để báo giá`)
  }

  if (latestStock <= 0) {
    throw new Error(`${product.title}${variantName ? ` - ${variantName}` : ''} đã hết hàng`)
  }

  if (quantity > latestStock) {
    throw new Error(`${product.title}${variantName ? ` - ${variantName}` : ''} chỉ còn ${latestStock} sản phẩm`)
  }

  return {
    orderItem: {
      product: product.id,
      variantId: variantId || null,
      variantName,
      quantity,
      priceAtPurchase: latestPrice,
    },
    lineTotal: latestPrice * quantity,
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const data = await req.json()

    const fullName = cleanText(data.fullName, 120)
    const phone = cleanPhone(data.phone)
    const address = cleanText(data.address, 255)
    const province = cleanText(data.province, 120)
    const paymentMethod = cleanText(data.paymentMethod, 30) as
      | 'cod'
      | 'fundiin'
      | 'bank_transfer'
      | null
      | undefined

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: 'Vui lòng nhập họ và tên hợp lệ' },
        { status: 400 },
      )
    }

    if (!phone || phone.length < 9 || phone.length > 15) {
      return NextResponse.json(
        { error: 'Số điện thoại không hợp lệ' },
        { status: 400 },
      )
    }

    if (!province || !address) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ địa chỉ giao hàng' },
        { status: 400 },
      )
    }

    if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Giỏ hàng không hợp lệ' },
        { status: 400 },
      )
    }

    const normalizedItems = normalizeItems(data.items)

    const orderItems = []
    let serverTotalAmount = 0

    for (const item of normalizedItems) {
      const { orderItem, lineTotal } = await validateAndBuildOrderItem(payload, item)

      orderItems.push(orderItem)
      serverTotalAmount += lineTotal
    }

    if (orderItems.length === 0 || serverTotalAmount <= 0) { return NextResponse.json({ error: 'Không có sản phẩm hợp lệ để tạo đơn hàng' }, { status: 400 },) }

    let voucherId: number | null = null
    let appliedVoucherCode: string | null = null
    let discountAmount = 0

    const incomingVoucherCode = cleanText(data.voucherCode, 50)
      .toUpperCase()
      .replace(/\s+/g, '')

    if (incomingVoucherCode) {
      const voucherResult = await validateVoucher({
        payload,
        code: incomingVoucherCode,
        subtotalAmount: serverTotalAmount,
      })

      voucherId = Number(voucherResult.voucher.id)

      if (!Number.isInteger(voucherId) || voucherId <= 0) {
        throw new Error('ID voucher không hợp lệ')
      }
      appliedVoucherCode = String(voucherResult.voucher.code)
      discountAmount = Math.floor(
        Number(voucherResult.discountAmount || 0),
      )
    }

    const subtotalAmount = Math.floor(serverTotalAmount)
    const finalTotalAmount = Math.max(
      0,
      subtotalAmount - discountAmount,
    )

    if (finalTotalAmount <= 0) {
      return NextResponse.json(
        { error: 'Tổng tiền đơn hàng sau giảm giá không hợp lệ' },
        { status: 400 },
      )
    }

    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: null,

        customerInfo: {
          fullName,
          phone,
          address,
          province,
        },

        items: orderItems,

        // Các số tiền đều được server tự tính
        subtotalAmount,
        discountAmount,
        voucherCode: appliedVoucherCode,
        voucherId,
        totalAmount: finalTotalAmount,

        paymentMethod,
        status: 'pending',
      },
    })

    // Tăng lượt sử dụng voucher sau khi tạo đơn thành công
    if (voucherId) {
      try {
        const latestVoucher: any = await payload.findByID({
          collection: 'vouchers',
          id: voucherId,
          depth: 0,
        })

        await payload.update({
          collection: 'vouchers',
          id: voucherId,
          data: {
            usedCount: Number(latestVoucher?.usedCount || 0) + 1,
          },
        })
      } catch (voucherUpdateError) {
        console.error(
          'Không thể cập nhật lượt dùng voucher:',
          voucherUpdateError,
        )
      }
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Lỗi tạo đơn hàng:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Không thể tạo đơn hàng',
      },
      { status: 400 },
    )
  }
}