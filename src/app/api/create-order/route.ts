import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import {
  getPayload,
  type Payload,
  type Where,
} from 'payload'
import {
  calculateShippingFee,
  isKnownProvince,
  normalizeDeliveryMethod,
  type DeliveryMethod,
} from '@/lib/shipping'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ORDER_LINES = 50
const MAX_QUANTITY_PER_LINE = 99
const MAX_TRANSACTION_RETRIES = 3

type EntityID = number

type PaymentMethod =
  | 'cod'
  | 'bank_transfer'
  | 'fundiin'

type VoucherType =
  | 'fixed'
  | 'percent'

type CheckoutItemInput = Readonly<{
  product: EntityID
  variantId: string | null
  quantity: number
}>

type CreateOrderInput = Readonly<{
  fullName: string
  phone: string
  email: string | null
  address: string
  province: string
  district: string | null
  ward: string | null
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  voucherCode: string | null
  shippingFee: number
  totalAmount: number
  items: CheckoutItemInput[]
}>

type ValidatedOrderItem = Readonly<{
  product: EntityID
  variantId: string | null
  productTitleSnapshot: string
  variantNameSnapshot: string | null
  skuSnapshot: string | null
  quantity: number
  priceAtPurchase: number
  lineTotal: number
}>

type ValidatedVoucher = Readonly<{
  id: EntityID
  code: string
  type: VoucherType
  value: number
  discountAmount: number
  usedCount: number
}>

type TransactionRequest = Readonly<{
  transactionID: string | number
}>

class CheckoutError extends Error {
  readonly status: number
  readonly errorCode: string

  constructor(
    message: string,
    status = 400,
    errorCode = 'CHECKOUT_ERROR',
  ) {
    super(message)

    this.name = 'CheckoutError'
    this.status = status
    this.errorCode = errorCode
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  )
}

function requiredText(
  value: unknown,
  label: string,
  maximumLength: number,
): string {
  if (typeof value !== 'string') {
    throw new CheckoutError(
      `${label} không hợp lệ.`,
      400,
      'INVALID_CUSTOMER_INFO',
    )
  }

  const normalized = value.trim()

  if (!normalized) {
    throw new CheckoutError(
      `Vui lòng nhập ${label.toLowerCase()}.`,
      400,
      'MISSING_CUSTOMER_INFO',
    )
  }

  if (normalized.length > maximumLength) {
    throw new CheckoutError(
      `${label} không được vượt quá ${maximumLength} ký tự.`,
      400,
      'INVALID_CUSTOMER_INFO',
    )
  }

  return normalized
}

function optionalText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  return normalized.slice(
    0,
    maximumLength,
  )
}

function normalizeEmail(
  value: unknown,
): string | null {
  const email = optionalText(value, 254)

  if (!email) {
    return null
  }

  const normalized =
    email.toLowerCase()

  const isValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(
      normalized,
    )

  if (!isValid) {
    throw new CheckoutError(
      'Email không hợp lệ.',
      400,
      'INVALID_EMAIL',
    )
  }

  return normalized
}

function normalizePhone(
  value: unknown,
): string {
  const phone = requiredText(
    value,
    'Số điện thoại',
    30,
  )

  const digits = phone.replace(
    /\D/gu,
    '',
  )

  if (
    digits.length < 9 ||
    digits.length > 15
  ) {
    throw new CheckoutError(
      'Số điện thoại không hợp lệ.',
      400,
      'INVALID_PHONE',
    )
  }

  return phone
}

function normalizeVoucherCode(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null
  }

  if (typeof value !== 'string') {
    throw new CheckoutError(
      'Mã voucher không hợp lệ.',
      400,
      'INVALID_VOUCHER_CODE',
    )
  }

  const normalized =
    value.trim().toUpperCase()

  if (!normalized) {
    return null
  }

  if (normalized.length > 64) {
    throw new CheckoutError(
      'Mã voucher không hợp lệ.',
      400,
      'INVALID_VOUCHER_CODE',
    )
  }

  return normalized
}

function positiveInteger(
  value: unknown,
  label: string,
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' &&
        value.trim()
        ? Number(value)
        : Number.NaN

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new CheckoutError(
      `${label} không hợp lệ.`,
      400,
      'INVALID_NUMBER',
    )
  }

  return parsed
}

function finiteNumber(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function normalizeShippingFee(
  value: unknown,
): number {
  const shippingFee = Math.floor(
    finiteNumber(value, Number.NaN),
  )

  if (
    !Number.isFinite(shippingFee) ||
    shippingFee < 0
  ) {
    throw new CheckoutError(
      'Phí vận chuyển không hợp lệ.',
      400,
      'INVALID_SHIPPING_FEE',
    )
  }

  return shippingFee
}

function normalizeClientTotalAmount(
  value: unknown,
): number {
  const totalAmount = Math.floor(
    finiteNumber(value, Number.NaN),
  )

  if (
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    throw new CheckoutError(
      'Tổng tiền đơn hàng không hợp lệ.',
      400,
      'INVALID_TOTAL_AMOUNT',
    )
  }

  return totalAmount
}

function relationshipID(
  value: unknown,
): EntityID | null {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  return (
    typeof id === 'number' &&
    Number.isInteger(id) &&
    id > 0
  )
    ? id
    : null
}

function parseTimestamp(
  value: unknown,
): number | null {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null
  }

  const timestamp =
    new Date(value).getTime()

  return Number.isFinite(timestamp)
    ? timestamp
    : null
}

function effectivePrice(
  basePrice: unknown,
  salePrice: unknown,
): number {
  const normalizedBasePrice =
    Math.max(
      0,
      finiteNumber(basePrice),
    )

  const normalizedSalePrice =
    Math.max(
      0,
      finiteNumber(salePrice),
    )

  if (
    normalizedSalePrice > 0 &&
    normalizedBasePrice > 0 &&
    normalizedSalePrice <
    normalizedBasePrice
  ) {
    return Math.floor(
      normalizedSalePrice,
    )
  }

  return Math.floor(
    normalizedBasePrice,
  )
}

function jsonError(
  message: string,
  status: number,
  code: string,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code,
      error: message,
    },
    {
      status,
    },
  )
}

async function readCreateOrderInput(
  request: Request,
): Promise<CreateOrderInput> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new CheckoutError(
      'Dữ liệu tạo đơn không hợp lệ.',
      400,
      'INVALID_JSON',
    )
  }

  if (!isRecord(body)) {
    throw new CheckoutError(
      'Dữ liệu tạo đơn không hợp lệ.',
      400,
      'INVALID_BODY',
    )
  }

  if (!Array.isArray(body.items)) {
    throw new CheckoutError(
      'Giỏ hàng không hợp lệ.',
      400,
      'INVALID_CART',
    )
  }

  if (body.items.length === 0) {
    throw new CheckoutError(
      'Giỏ hàng đang trống.',
      400,
      'EMPTY_CART',
    )
  }

  if (
    body.items.length >
    MAX_ORDER_LINES
  ) {
    throw new CheckoutError(
      `Đơn hàng không được vượt quá ${MAX_ORDER_LINES} dòng sản phẩm.`,
      400,
      'TOO_MANY_ORDER_LINES',
    )
  }

  const mergedItems =
    new Map<string, CheckoutItemInput>()

  for (const rawItem of body.items) {
    if (!isRecord(rawItem)) {
      throw new CheckoutError(
        'Dòng sản phẩm không hợp lệ.',
        400,
        'INVALID_CART_ITEM',
      )
    }

    const product = positiveInteger(
      rawItem.product,
      'Sản phẩm',
    )

    const variantId =
      optionalText(
        rawItem.variantId,
        128,
      )

    const quantity = positiveInteger(
      rawItem.quantity,
      'Số lượng',
    )

    if (
      quantity >
      MAX_QUANTITY_PER_LINE
    ) {
      throw new CheckoutError(
        `Số lượng mỗi sản phẩm không được vượt quá ${MAX_QUANTITY_PER_LINE}.`,
        400,
        'QUANTITY_LIMIT_EXCEEDED',
      )
    }

    const itemKey =
      `${product}::${variantId ?? 'simple'} `

    const existing =
      mergedItems.get(itemKey)

    if (existing) {
      const mergedQuantity =
        existing.quantity + quantity

      if (
        mergedQuantity >
        MAX_QUANTITY_PER_LINE
      ) {
        throw new CheckoutError(
          `Tổng số lượng một sản phẩm không được vượt quá ${MAX_QUANTITY_PER_LINE}.`,
          400,
          'QUANTITY_LIMIT_EXCEEDED',
        )
      }

      mergedItems.set(itemKey, {
        ...existing,
        quantity: mergedQuantity,
      })

      continue
    }

    mergedItems.set(itemKey, {
      product,
      variantId,
      quantity,
    })
  }

  const paymentMethod =
    body.paymentMethod === 'cod' ||
      body.paymentMethod ===
      'bank_transfer' ||
      body.paymentMethod === 'fundiin'
      ? body.paymentMethod
      : null

  if (!paymentMethod) {
    throw new CheckoutError(
      'Phương thức thanh toán không hợp lệ.',
      400,
      'INVALID_PAYMENT_METHOD',
    )
  }

  const deliveryMethod = normalizeDeliveryMethod(body.deliveryMethod)

  const province =
    deliveryMethod === 'store_pickup'
      ? 'Nhận tại cửa hàng'
      : requiredText(
        body.province,
        'Tỉnh/Thành phố',
        120,
      )

  if (
    deliveryMethod === 'home_delivery' &&
    !isKnownProvince(province)
  ) {
    throw new CheckoutError(
      'Tỉnh/Thành phố không hợp lệ.',
      400,
      'INVALID_PROVINCE',
    )
  }

  return {
    fullName: requiredText(
      body.fullName,
      'Họ tên người nhận',
      160,
    ),

    phone: normalizePhone(body.phone),

    email: normalizeEmail(body.email),

    address:
      deliveryMethod === 'store_pickup'
        ? 'Nhận tại cửa hàng'
        : requiredText(
          body.address,
          'Địa chỉ',
          300,
        ),

    province,

    district: optionalText(
      body.district,
      120,
    ),

    ward: optionalText(
      body.ward,
      120,
    ),

    deliveryMethod,

    paymentMethod,

    voucherCode:
      normalizeVoucherCode(
        body.voucherCode,
      ),

    items: Array.from(
      mergedItems.values(),
    ),

    shippingFee: normalizeShippingFee(
      body.shippingFee,
    ),

    totalAmount: normalizeClientTotalAmount(
      body.totalAmount,
    ),
  }
}

async function revalidateOrderItems(
  payload: Payload,
  inputItems: CheckoutItemInput[],
  transactionRequest:
    TransactionRequest,
): Promise<ValidatedOrderItem[]> {
  const validatedItems:
    ValidatedOrderItem[] = []

  for (const inputItem of inputItems) {
    let productDocument: unknown

    try {
      productDocument =
        await payload.findByID({
          collection: 'products',
          id: inputItem.product,
          depth: 0,
          overrideAccess: true,
          req: transactionRequest,
        })
    } catch {
      throw new CheckoutError(
        'Một sản phẩm trong giỏ không còn tồn tại.',
        409,
        'PRODUCT_NOT_FOUND',
      )
    }

    if (!isRecord(productDocument)) {
      throw new CheckoutError(
        'Dữ liệu sản phẩm không hợp lệ.',
        409,
        'INVALID_PRODUCT',
      )
    }

    const productTitle =
      optionalText(
        productDocument.title,
        300,
      ) ?? 'Sản phẩm MF PARIS'

    if (
      productDocument.status !==
      'published'
    ) {
      throw new CheckoutError(
        `Sản phẩm "${productTitle}" hiện không được bán.`,
        409,
        'PRODUCT_UNAVAILABLE',
      )
    }

    const productType =
      productDocument.productType ===
        'variable'
        ? 'variable'
        : 'simple'

    let variantId: string | null =
      null

    let variantName: string | null =
      null

    let sku =
      optionalText(
        productDocument.sku,
        160,
      )

    let unitPrice = 0
    let stock = 0

    if (productType === 'variable') {
      if (!inputItem.variantId) {
        throw new CheckoutError(
          `Vui lòng chọn phân loại cho "${productTitle}".`,
          400,
          'VARIANT_REQUIRED',
        )
      }

      const variants =
        Array.isArray(
          productDocument.variants,
        )
          ? productDocument.variants
          : []

      const variant =
        variants.find(
          (candidate) =>
            isRecord(candidate) &&
            String(candidate.id) ===
            inputItem.variantId,
        )

      if (
        !variant ||
        !isRecord(variant)
      ) {
        throw new CheckoutError(
          `Phân loại của "${productTitle}" không còn tồn tại.`,
          409,
          'VARIANT_NOT_FOUND',
        )
      }

      if (
        variant.isActive === false
      ) {
        throw new CheckoutError(
          `Phân loại của "${productTitle}" đã ngừng bán.`,
          409,
          'VARIANT_UNAVAILABLE',
        )
      }

      variantId =
        inputItem.variantId

      variantName =
        optionalText(
          variant.name,
          200,
        )

      sku =
        optionalText(
          variant.sku,
          160,
        ) ?? sku

      unitPrice = effectivePrice(
        variant.basePrice,
        variant.salePrice,
      )

      stock = Math.floor(
        Math.max(
          0,
          finiteNumber(variant.stock),
        ),
      )
    } else {
      if (inputItem.variantId) {
        throw new CheckoutError(
          `Sản phẩm "${productTitle}" không sử dụng phân loại.`,
          400,
          'UNEXPECTED_VARIANT',
        )
      }

      const priceData =
        isRecord(productDocument.price)
          ? productDocument.price
          : {}

      unitPrice = effectivePrice(
        priceData.basePrice,
        priceData.salePrice,
      )

      stock = Math.floor(
        Math.max(
          0,
          finiteNumber(
            priceData.stock,
          ),
        ),
      )
    }

    if (unitPrice <= 0) {
      throw new CheckoutError(
        `Sản phẩm "${productTitle}" cần liên hệ để báo giá.`,
        409,
        'CONTACT_PRICE',
      )
    }

    if (stock <= 0) {
      throw new CheckoutError(
        `Sản phẩm "${productTitle}" đã hết hàng.`,
        409,
        'OUT_OF_STOCK',
      )
    }

    if (
      inputItem.quantity > stock
    ) {
      throw new CheckoutError(
        `Sản phẩm "${productTitle}" chỉ còn ${stock} sản phẩm.`,
        409,
        'INSUFFICIENT_STOCK',
      )
    }

    validatedItems.push({
      product: inputItem.product,
      variantId,
      productTitleSnapshot:
        productTitle,
      variantNameSnapshot:
        variantName,
      skuSnapshot: sku,
      quantity: inputItem.quantity,
      priceAtPurchase: unitPrice,
      lineTotal:
        unitPrice *
        inputItem.quantity,
    })
  }

  return validatedItems
}

async function validateVoucherForOrder(
  payload: Payload,
  code: string,
  subtotalAmount: number,
  customerID: EntityID | null,
  customerEmail: string | null,
  transactionRequest:
    TransactionRequest,
): Promise<ValidatedVoucher> {
  const voucherResult =
    await payload.find({
      collection: 'vouchers',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      req: transactionRequest,
      where: {
        code: {
          equals: code,
        },
      },
    })

  const voucherDocument: unknown =
    voucherResult.docs[0]

  if (!isRecord(voucherDocument)) {
    throw new CheckoutError(
      'Mã voucher không tồn tại.',
      404,
      'VOUCHER_NOT_FOUND',
    )
  }

  const voucherID =
    relationshipID(voucherDocument)

  if (voucherID === null) {
    throw new CheckoutError(
      'Không xác định được voucher.',
      500,
      'INVALID_VOUCHER',
    )
  }

  const normalizedCode =
    normalizeVoucherCode(
      voucherDocument.code,
    )

  if (!normalizedCode) {
    throw new CheckoutError(
      'Mã voucher không hợp lệ.',
      500,
      'INVALID_VOUCHER',
    )
  }

  if (
    voucherDocument.status !==
    'active'
  ) {
    throw new CheckoutError(
      'Mã voucher hiện không hoạt động.',
      409,
      'VOUCHER_INACTIVE',
    )
  }

  const now = Date.now()

  const startsAt =
    parseTimestamp(
      voucherDocument.startsAt,
    )

  const endsAt =
    parseTimestamp(
      voucherDocument.endsAt,
    )

  if (
    startsAt === null ||
    endsAt === null
  ) {
    throw new CheckoutError(
      'Voucher chưa được cấu hình thời gian hợp lệ.',
      409,
      'INVALID_VOUCHER_PERIOD',
    )
  }

  if (now < startsAt) {
    throw new CheckoutError(
      'Voucher chưa đến thời gian sử dụng.',
      409,
      'VOUCHER_NOT_STARTED',
    )
  }

  if (now > endsAt) {
    throw new CheckoutError(
      'Voucher đã hết hạn.',
      409,
      'VOUCHER_EXPIRED',
    )
  }

  const minOrderAmount =
    Math.max(
      0,
      Math.floor(
        finiteNumber(
          voucherDocument.minOrderAmount,
        ),
      ),
    )

  if (
    subtotalAmount <
    minOrderAmount
  ) {
    const missingAmount =
      minOrderAmount -
      subtotalAmount

    throw new CheckoutError(
      `Đơn hàng cần thêm ${missingAmount.toLocaleString(
        'vi-VN',
      )
      }₫ để sử dụng voucher.`,
      409,
      'MINIMUM_ORDER_NOT_REACHED',
    )
  }

  const usageLimit =
    Math.max(
      0,
      Math.floor(
        finiteNumber(
          voucherDocument.usageLimit,
        ),
      ),
    )

  const usedCount =
    Math.max(
      0,
      Math.floor(
        finiteNumber(
          voucherDocument.usedCount,
        ),
      ),
    )

  const activeRedemptions =
    await payload.find({
      collection:
        'voucher-redemptions',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req: transactionRequest,
      where: {
        and: [
          {
            voucher: {
              equals: voucherID,
            },
          },
          {
            or: [
              {
                status: {
                  equals: 'held',
                },
              },
              {
                status: {
                  equals:
                    'completed',
                },
              },
            ],
          },
        ],
      },
    })

  const effectiveUsedCount =
    Math.max(
      usedCount,
      activeRedemptions.totalDocs,
    )

  if (
    usageLimit > 0 &&
    effectiveUsedCount >= usageLimit
  ) {
    throw new CheckoutError(
      'Voucher đã hết lượt sử dụng.',
      409,
      'VOUCHER_USAGE_LIMIT_REACHED',
    )
  }

  const usageLimitPerCustomer =
    Math.max(
      0,
      Math.floor(
        finiteNumber(
          voucherDocument
            .usageLimitPerCustomer,
        ),
      ),
    )

  if (
    usageLimitPerCustomer > 0
  ) {
    if (
      customerID === null &&
      customerEmail === null
    ) {
      throw new CheckoutError(
        'Vui lòng đăng nhập hoặc nhập email để sử dụng voucher này.',
        400,
        'CUSTOMER_IDENTITY_REQUIRED',
      )
    }

    let customerCondition: Where

    if (customerID !== null) {
      customerCondition = {
        customer: {
          equals: customerID,
        },
      }
    } else {
      if (!customerEmail) {
        throw new CheckoutError(
          'Vui lòng đăng nhập hoặc nhập email để sử dụng voucher này.',
          400,
          'CUSTOMER_IDENTITY_REQUIRED',
        )
      }

      customerCondition = {
        email: {
          equals: customerEmail,
        },
      }
    }

    const customerRedemptions =
      await payload.find({
        collection:
          'voucher-redemptions',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        req: transactionRequest,
        where: {
          and: [
            {
              voucher: {
                equals: voucherID,
              },
            },
            customerCondition,
            {
              or: [
                {
                  status: {
                    equals: 'held',
                  },
                },
                {
                  status: {
                    equals:
                      'completed',
                  },
                },
              ],
            },
          ],
        },
      })

    if (
      customerRedemptions.totalDocs >=
      usageLimitPerCustomer
    ) {
      throw new CheckoutError(
        'Bạn đã sử dụng hết số lượt cho phép của voucher này.',
        409,
        'CUSTOMER_VOUCHER_LIMIT_REACHED',
      )
    }
  }

  const voucherType:
    VoucherType | null =
    voucherDocument.type ===
      'fixed' ||
      voucherDocument.type ===
      'percent'
      ? voucherDocument.type
      : null

  if (!voucherType) {
    throw new CheckoutError(
      'Loại voucher không hợp lệ.',
      500,
      'INVALID_VOUCHER_TYPE',
    )
  }

  const voucherValue =
    finiteNumber(
      voucherDocument.value,
      Number.NaN,
    )

  if (
    !Number.isFinite(voucherValue) ||
    voucherValue < 0
  ) {
    throw new CheckoutError(
      'Giá trị voucher không hợp lệ.',
      500,
      'INVALID_VOUCHER_VALUE',
    )
  }

  if (
    voucherType === 'percent' &&
    voucherValue > 100
  ) {
    throw new CheckoutError(
      'Phần trăm giảm giá không hợp lệ.',
      500,
      'INVALID_VOUCHER_VALUE',
    )
  }

  let discountAmount = 0

  if (voucherType === 'percent') {
    discountAmount = Math.floor(
      subtotalAmount *
      (voucherValue / 100),
    )

    const maxDiscountAmount =
      Math.max(
        0,
        Math.floor(
          finiteNumber(
            voucherDocument
              .maxDiscountAmount,
          ),
        ),
      )

    if (
      maxDiscountAmount > 0
    ) {
      discountAmount = Math.min(
        discountAmount,
        maxDiscountAmount,
      )
    }
  } else {
    discountAmount =
      Math.floor(voucherValue)
  }

  discountAmount = Math.min(
    subtotalAmount,
    Math.max(
      0,
      discountAmount,
    ),
  )

  if (discountAmount <= 0) {
    throw new CheckoutError(
      'Voucher không tạo ra giá trị giảm hợp lệ.',
      409,
      'INVALID_DISCOUNT_AMOUNT',
    )
  }

  return {
    id: voucherID,
    code: normalizedCode,
    type: voucherType,
    value: voucherValue,
    discountAmount,
    usedCount:
      effectiveUsedCount,
  }
}

function errorCodeFromUnknown(
  error: unknown,
): string | null {
  if (!isRecord(error)) {
    return null
  }

  if (
    typeof error.code === 'string'
  ) {
    return error.code
  }

  if (isRecord(error.cause)) {
    return errorCodeFromUnknown(
      error.cause,
    )
  }

  return null
}

function isRetryableTransactionError(
  error: unknown,
): boolean {
  const code =
    errorCodeFromUnknown(error)

  return (
    code === '40001' ||
    code === '40P01'
  )
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  let input: CreateOrderInput

  try {
    input =
      await readCreateOrderInput(
        request,
      )
  } catch (error: unknown) {
    if (error instanceof CheckoutError) {
      return jsonError(
        error.message,
        error.status,
        error.errorCode,
      )
    }

    return jsonError(
      'Dữ liệu tạo đơn không hợp lệ.',
      400,
      'INVALID_ORDER_DATA',
    )
  }

  const payload = await getPayload({
    config: configPromise,
  })

  const authentication =
    await payload.auth({
      headers: request.headers,
    })

  const customerID =
    relationshipID(
      authentication.user,
    )

  const authenticatedEmail =
    isRecord(authentication.user)
      ? normalizeEmail(
        authentication.user.email,
      )
      : null

  const customerEmail =
    input.email ??
    authenticatedEmail

  if (input.paymentMethod === 'cod' && input.voucherCode) {
    return jsonError(
      'Voucher không áp dụng cho phương thức thanh toán khi nhận hàng (COD).',
      400,
      'COD_VOUCHER_NOT_ALLOWED',
    )
  }

  let lastTransactionError:
    unknown = null

  for (
    let attempt = 1;
    attempt <=
    MAX_TRANSACTION_RETRIES;
    attempt += 1
  ) {
    const transactionID =
      await payload.db
        .beginTransaction()

    if (!transactionID) {
      return jsonError(
        'Không thể khởi tạo giao dịch cơ sở dữ liệu.',
        500,
        'TRANSACTION_UNAVAILABLE',
      )
    }

    const transactionRequest:
      TransactionRequest = {
      transactionID,
    }

    try {
      /*
       * Không sử dụng priceAtPurchase hoặc
       * totalAmount do frontend gửi lên.
       */
      const validatedItems =
        await revalidateOrderItems(
          payload,
          input.items,
          transactionRequest,
        )

      const subtotalAmount =
        validatedItems.reduce(
          (total, item) =>
            total + item.lineTotal,
          0,
        )

      if (subtotalAmount <= 0) {
        throw new CheckoutError(
          'Tổng giá trị đơn hàng không hợp lệ.',
          400,
          'INVALID_SUBTOTAL',
        )
      }

      const validatedVoucher =
        input.voucherCode
          ? await validateVoucherForOrder(
            payload,
            input.voucherCode,
            subtotalAmount,
            customerID,
            customerEmail,
            transactionRequest,
          )
          : null

      const discountAmount =
        validatedVoucher
          ?.discountAmount ?? 0

      const expectedShippingFee =
        calculateShippingFee({
          subtotalAmount,
          province: input.province,
          deliveryMethod: input.deliveryMethod,
        })

      if (input.shippingFee !== expectedShippingFee) {
        throw new CheckoutError(
          'Phí vận chuyển đã thay đổi. Vui lòng kiểm tra lại đơn hàng.',
          409,
          'SHIPPING_FEE_MISMATCH',
        )
      }

      const totalAmount = Math.max(
        0,
        subtotalAmount - discountAmount + expectedShippingFee,
      )

      if (input.totalAmount !== totalAmount) {
        throw new CheckoutError(
          'Tổng tiền đơn hàng không khớp. Vui lòng kiểm tra lại giỏ hàng.',
          409,
          'TOTAL_AMOUNT_MISMATCH',
        )
      }

      const order =
        await payload.create({
          collection: 'orders',
          depth: 0,
          overrideAccess: true,
          req: transactionRequest,

          data: {
            customer:
              customerID ?? null,

            customerInfo: {
              fullName:
                input.fullName,
              phone: input.phone,
              email:
                customerEmail,
              address:
                input.address,
              province:
                input.province,
              district:
                input.district,
              ward: input.ward,
            },

            items: validatedItems.map(
              (item) => ({
                product:
                  item.product,

                variantId:
                  item.variantId,

                productTitleSnapshot:
                  item
                    .productTitleSnapshot,

                variantNameSnapshot:
                  item
                    .variantNameSnapshot,

                skuSnapshot:
                  item.skuSnapshot,

                quantity:
                  item.quantity,

                priceAtPurchase:
                  item.priceAtPurchase,
              }),
            ),

            subtotalAmount,
            discountAmount,
            shippingFee: expectedShippingFee,
            totalAmount,

            paymentMethod:
              input.paymentMethod,

            deliveryMethod:
              input.deliveryMethod,

            paymentStatus:
              input.paymentMethod === 'fundiin'
                ? 'pending'
                : 'unpaid',

            status: 'pending',

            voucherCode:
              validatedVoucher
                ?.code ?? null,

            voucherId:
              validatedVoucher
                ?.id ?? null,
          },
        })

      if (validatedVoucher) {
        /*
         * Tạo ledger giữ lượt.
         * VoucherRedemptions yêu cầu
         * customer hoặc email.
         */
        if (
          customerID === null &&
          customerEmail === null
        ) {
          throw new CheckoutError(
            'Vui lòng nhập email để sử dụng voucher.',
            400,
            'CUSTOMER_IDENTITY_REQUIRED',
          )
        }

        await payload.create({
          collection:
            'voucher-redemptions',
          depth: 0,
          overrideAccess: true,
          req: transactionRequest,

          data: {
            voucher:
              validatedVoucher.id,

            order: order.id,

            customer:
              customerID ?? null,

            email:
              customerEmail,

            discountAmount:
              validatedVoucher
                .discountAmount,

            status: 'held',
          },
        })

        /*
         * usedCount bao gồm cả held và completed.
         * Khi cancelled phải giảm lại 1.
         *
         * Vì transaction sử dụng SERIALIZABLE,
         * hai checkout đồng thời không thể cùng
         * ghi thành công từ một giá trị cũ.
         */
        await payload.update({
          collection: 'vouchers',
          id: validatedVoucher.id,
          depth: 0,
          overrideAccess: true,
          req: transactionRequest,

          data: {
            usedCount:
              validatedVoucher
                .usedCount + 1,
          },
        })
      }

      await payload.db
        .commitTransaction(
          transactionID,
        )

      /*
       * Giữ response tương thích với frontend:
       * const order = await res.json()
       * order.id vẫn sử dụng được.
       */
      return NextResponse.json(
        {
          ...order,

          subtotalAmount,
          discountAmount,
          totalAmount,

          voucher: validatedVoucher
            ? {
              id:
                validatedVoucher.id,
              code:
                validatedVoucher.code,
              type:
                validatedVoucher.type,
              value:
                validatedVoucher.value,
            }
            : null,
        },
        {
          status: 201,
        },
      )
    } catch (error: unknown) {
      try {
        await payload.db
          .rollbackTransaction(
            transactionID,
          )
      } catch (
      rollbackError: unknown
      ) {
        console.error(
          '[create-order] Rollback failed:',
          rollbackError,
        )
      }

      if (
        isRetryableTransactionError(
          error,
        ) &&
        attempt <
        MAX_TRANSACTION_RETRIES
      ) {
        lastTransactionError = error
        continue
      }

      if (
        error instanceof
        CheckoutError
      ) {
        return jsonError(
          error.message,
          error.status,
          error.errorCode,
        )
      }

      console.error(
        '[POST /api/create-order] Error:',
        error,
      )

      return jsonError(
        'Không thể tạo đơn hàng vào lúc này. Vui lòng thử lại.',
        500,
        'CREATE_ORDER_FAILED',
      )
    }
  }

  console.error(
    '[create-order] Transaction retries exhausted:',
    lastTransactionError,
  )

  return jsonError(
    'Hệ thống đang có nhiều giao dịch đồng thời. Vui lòng thử đặt hàng lại.',
    409,
    'TRANSACTION_CONFLICT',
  )
}