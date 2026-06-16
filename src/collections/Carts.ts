import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type Payload,
} from 'payload'

type EntityID = number
type RelationshipValue = EntityID | { id: EntityID }

type CartStatus =
  | 'active'
  | 'abandoned'
  | 'converted'
  | 'merged'
  | 'expired'

type CartItemInput = {
  product?: RelationshipValue | null
  variantId?: string | null
  quantity?: number | null
}

type CartDocument = {
  id: EntityID
  user?: RelationshipValue | null
  guestId?: string | null
  status?: CartStatus | null
  items?: CartItemInput[] | null
  voucher?: RelationshipValue | null
  subtotalAmount?: number | null
  discountAmount?: number | null
  totalAmount?: number | null
  lastActivityAt?: string | null
  expiresAt?: string | null
  convertedOrder?: RelationshipValue | null
  mergedIntoCart?: RelationshipValue | null
}

type ProductVariant = {
  id?: EntityID | null
  name?: string | null
  sku?: string | null
  basePrice?: number | null
  salePrice?: number | null
  stock?: number | null
  isActive?: boolean | null
}

type ProductSnapshot = {
  id: EntityID
  title: string
  sku?: string
  status: 'draft' | 'published'
  productType: 'simple' | 'variable'
  price: {
    basePrice: number
    salePrice?: number
    stock: number
  }
  variants: ProductVariant[]
}

type NormalizedCartItem = {
  product: EntityID
  variantId?: string
  quantity: number
  productTitleSnapshot: string
  variantNameSnapshot?: string
  skuSnapshot?: string
  unitPriceSnapshot: number
  stockSnapshot: number
  lineTotal: number
}

type MergeGuestCartArgs = {
  payload: Payload
  userId: EntityID
  guestId: string
}

const adminOnly: Access = ({ req }) => {
  return Boolean(req.user)
}

const MAX_QUANTITY_PER_ITEM = 99
const GUEST_CART_LIFETIME_DAYS = 30
const USER_CART_LIFETIME_DAYS = 90

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function relationshipID(
  value: unknown,
): EntityID | undefined {
  if (typeof value === 'number') {
    return value
  }

  if (!isRecord(value)) {
    return undefined
  }

  const id = value.id

  return typeof id === 'number'
    ? id
    : undefined
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : undefined
}

function normalizeGuestId(value: unknown): string | undefined {
  const guestId = optionalText(value)

  if (!guestId) {
    return undefined
  }

  if (guestId.length < 16 || guestId.length > 128) {
    throw new APIError(
      'guestId phải có độ dài từ 16 đến 128 ký tự.',
      400,
    )
  }

  return guestId
}

function effectivePrice(basePrice: number, salePrice?: number): number {
  return salePrice && salePrice > 0 && salePrice < basePrice
    ? salePrice
    : Math.max(0, basePrice)
}

function addDays(date: Date, days: number): string {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)

  return result.toISOString()
}

function toProductSnapshot(value: unknown): ProductSnapshot {
  if (!isRecord(value)) {
    throw new APIError('Dữ liệu sản phẩm không hợp lệ.', 500)
  }

  const id = relationshipID(value)

  if (id === undefined) {
    throw new APIError('Không xác định được ID sản phẩm.', 500)
  }

  const price = isRecord(value.price) ? value.price : {}
  const rawVariants = Array.isArray(value.variants)
    ? value.variants
    : []

  const variants = rawVariants
    .filter(isRecord)
    .map(
      (variant): ProductVariant => ({
        id: relationshipID(variant),
        name: optionalText(variant.name),
        sku: optionalText(variant.sku),
        basePrice: finiteNumber(variant.basePrice),
        salePrice: finiteNumber(variant.salePrice),
        stock: finiteNumber(variant.stock),
        isActive:
          typeof variant.isActive === 'boolean'
            ? variant.isActive
            : true,
      }),
    )

  return {
    id,
    title: optionalText(value.title) ?? 'Sản phẩm MF PARIS',
    sku: optionalText(value.sku),
    status:
      value.status === 'published' ? 'published' : 'draft',
    productType:
      value.productType === 'variable' ? 'variable' : 'simple',
    price: {
      basePrice: finiteNumber(price.basePrice),
      salePrice: finiteNumber(price.salePrice),
      stock: finiteNumber(price.stock),
    },
    variants,
  }
}

async function normalizeItems(
  payload: Payload,
  rawItems: unknown,
): Promise<NormalizedCartItem[]> {
  if (!Array.isArray(rawItems)) {
    return []
  }

  const productCache = new Map<string, ProductSnapshot>()
  const merged = new Map<string, NormalizedCartItem>()

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      throw new APIError(
        'Dòng sản phẩm trong giỏ hàng không hợp lệ.',
        400,
      )
    }

    const productId = relationshipID(rawItem.product)
    const variantId = optionalText(rawItem.variantId)
    const quantity = finiteNumber(rawItem.quantity, Number.NaN)

    if (productId === undefined) {
      throw new APIError(
        'Mỗi dòng giỏ hàng phải có product.',
        400,
      )
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      throw new APIError(
        `Số lượng phải là số nguyên từ 1 đến ${MAX_QUANTITY_PER_ITEM}.`,
        400,
      )
    }

    const cacheKey = String(productId)
    let product = productCache.get(cacheKey)

    if (!product) {
      const document = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        overrideAccess: true,
      })

      product = toProductSnapshot(document)
      productCache.set(cacheKey, product)
    }

    if (product.status !== 'published') {
      throw new APIError(
        `Sản phẩm "${product.title}" hiện không được bán.`,
        409,
      )
    }

    let variantNameSnapshot: string | undefined
    let skuSnapshot = product.sku
    let unitPriceSnapshot = effectivePrice(
      product.price.basePrice,
      product.price.salePrice,
    )
    let stockSnapshot = product.price.stock

    if (product.productType === 'variable') {
      if (!variantId) {
        throw new APIError(
          `Sản phẩm "${product.title}" yêu cầu chọn biến thể.`,
          400,
        )
      }

      const variant = product.variants.find(
        (candidate) =>
          candidate.id !== undefined &&
          String(candidate.id) === variantId,
      )

      if (!variant || variant.isActive === false) {
        throw new APIError(
          `Biến thể của "${product.title}" không tồn tại hoặc đã ngừng bán.`,
          409,
        )
      }

      variantNameSnapshot = variant.name ?? undefined
      skuSnapshot = variant.sku ?? product.sku
      unitPriceSnapshot = effectivePrice(
        finiteNumber(variant.basePrice),
        finiteNumber(variant.salePrice),
      )
      stockSnapshot = finiteNumber(variant.stock)
    } else if (variantId) {
      throw new APIError(
        `Sản phẩm "${product.title}" không sử dụng biến thể.`,
        400,
      )
    }

    const lineKey = `${String(productId)}::${variantId ?? 'simple'}`
    const existing = merged.get(lineKey)

    if (existing) {
      const mergedQuantity = existing.quantity + quantity

      if (mergedQuantity > MAX_QUANTITY_PER_ITEM) {
        throw new APIError(
          `Tổng số lượng một sản phẩm/biến thể không được vượt quá ${MAX_QUANTITY_PER_ITEM}.`,
          400,
        )
      }

      existing.quantity = mergedQuantity
      existing.lineTotal =
        existing.unitPriceSnapshot * mergedQuantity
      continue
    }

    merged.set(lineKey, {
      product: productId,
      variantId,
      quantity,
      productTitleSnapshot: product.title,
      variantNameSnapshot,
      skuSnapshot,
      unitPriceSnapshot,
      stockSnapshot: Math.max(0, stockSnapshot),
      lineTotal: unitPriceSnapshot * quantity,
    })
  }

  return Array.from(merged.values())
}

const prepareOwner: CollectionBeforeValidateHook<CartDocument> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const nextData: Partial<CartDocument> = { ...(data ?? {}) }

  const userId =
    relationshipID(nextData.user) ??
    relationshipID(originalDoc?.user) ??
    relationshipID(req.user)

  const guestId = normalizeGuestId(
    nextData.guestId ?? originalDoc?.guestId,
  )

  if (userId !== undefined) {
    nextData.user = userId
    nextData.guestId = null
  } else if (guestId) {
    nextData.user = null
    nextData.guestId = guestId
  } else {
    throw new APIError(
      'Giỏ hàng phải có user hoặc guestId.',
      400,
    )
  }

  if (operation === 'create') {
    nextData.status = nextData.status ?? 'active'
  }

  const status =
    nextData.status ?? originalDoc?.status ?? 'active'

  if (
    status === 'converted' &&
    relationshipID(
      nextData.convertedOrder ?? originalDoc?.convertedOrder,
    ) === undefined
  ) {
    throw new APIError(
      'Cart converted phải có convertedOrder.',
      400,
    )
  }

  if (
    status === 'merged' &&
    relationshipID(
      nextData.mergedIntoCart ?? originalDoc?.mergedIntoCart,
    ) === undefined
  ) {
    throw new APIError(
      'Cart merged phải có mergedIntoCart.',
      400,
    )
  }

  return nextData
}

const calculateCart: CollectionBeforeChangeHook<CartDocument> =
  async ({ data, originalDoc, req }) => {
    const nextData: Partial<CartDocument> = { ...(data ?? {}) }

    const normalizedItems = await normalizeItems(
      req.payload,
      nextData.items ?? originalDoc?.items,
    )

    const subtotalAmount = normalizedItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    )

    const itemsChanged = Object.prototype.hasOwnProperty.call(
      nextData,
      'items',
    )
    const voucherChanged = Object.prototype.hasOwnProperty.call(
      nextData,
      'voucher',
    )

    // Khi thay đổi item hoặc voucher, discount cũ phải được tính lại
    // bởi Voucher Service. Collection không tin discount từ client.
    const discountAmount =
      itemsChanged || voucherChanged
        ? 0
        : Math.min(
          subtotalAmount,
          Math.max(
            0,
            finiteNumber(originalDoc?.discountAmount),
          ),
        )

    const userId = relationshipID(
      nextData.user ?? originalDoc?.user,
    )
    const now = new Date()

    nextData.items = normalizedItems
    nextData.subtotalAmount = subtotalAmount
    nextData.discountAmount = discountAmount
    nextData.totalAmount = Math.max(
      0,
      subtotalAmount - discountAmount,
    )
    nextData.lastActivityAt = now.toISOString()
    nextData.expiresAt =
      nextData.expiresAt ??
      originalDoc?.expiresAt ??
      addDays(
        now,
        userId === undefined
          ? GUEST_CART_LIFETIME_DAYS
          : USER_CART_LIFETIME_DAYS,
      )

    return nextData
  }

const ownCart: Access = ({ req }) => {
  const userId = relationshipID(req.user)

  if (userId === undefined) {
    return false
  }

  return {
    user: {
      equals: userId,
    },
  }
}

/**
 * Gọi sau khi đăng nhập.
 *
 * Guest cart không được đọc trực tiếp bằng REST public.
 * Route Handler lấy guestId từ cookie HttpOnly, sau đó gọi hàm này.
 */
export async function mergeGuestCartIntoUserCart({
  payload,
  userId,
  guestId: rawGuestId,
}: MergeGuestCartArgs): Promise<EntityID | null> {
  const guestId = normalizeGuestId(rawGuestId)

  if (!guestId) {
    return null
  }

  const [userResult, guestResult] = await Promise.all([
    payload.find({
      collection: 'carts',
      depth: 0,
      limit: 1,
      sort: '-updatedAt',
      overrideAccess: true,
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: 'active' } },
        ],
      },
    }),
    payload.find({
      collection: 'carts',
      depth: 0,
      limit: 1,
      sort: '-updatedAt',
      overrideAccess: true,
      where: {
        and: [
          { guestId: { equals: guestId } },
          { status: { equals: 'active' } },
        ],
      },
    }),
  ])

  const userCart = userResult.docs[0]
  const guestCart = guestResult.docs[0]

  if (!guestCart) {
    return relationshipID(userCart) ?? null
  }

  const guestCartId = relationshipID(guestCart)

  if (guestCartId === undefined) {
    throw new APIError('Không xác định được guest cart.', 500)
  }

  if (!userCart) {
    const claimed = await payload.update({
      collection: 'carts',
      id: guestCartId,
      overrideAccess: true,
      data: {
        user: userId,
        guestId: null,
        status: 'active',
      },
    })

    return relationshipID(claimed) ?? guestCartId
  }

  const userCartId = relationshipID(userCart)

  if (userCartId === undefined) {
    throw new APIError('Không xác định được user cart.', 500)
  }

  const userItems =
    isRecord(userCart) && Array.isArray(userCart.items)
      ? userCart.items
      : []

  const guestItems =
    isRecord(guestCart) && Array.isArray(guestCart.items)
      ? guestCart.items
      : []

  // Hook calculateCart sẽ tự gộp item trùng và chụp lại giá.
  await payload.update({
    collection: 'carts',
    id: userCartId,
    overrideAccess: true,
    data: {
      items: [...userItems, ...guestItems],
      status: 'active',
    },
  })

  await payload.update({
    collection: 'carts',
    id: guestCartId,
    overrideAccess: true,
    data: {
      guestId: null,
      status: 'merged',
      mergedIntoCart: userCartId,
    },
  })

  return userCartId
}

export const Carts: CollectionConfig = {
  slug: 'carts',

  defaultSort: '-updatedAt',

  admin: {
    useAsTitle: 'id',
    group: 'Kinh doanh',
    defaultColumns: [
      'user',
      'guestId',
      'status',
      'subtotalAmount',
      'lastActivityAt',
      'updatedAt',
    ],
  },

  access: {
    create: () => false,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },

  hooks: {
    beforeValidate: [prepareOwner],
    beforeChange: [calculateCart],
  },

  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Khách hàng',
      admin: { position: 'sidebar' },
    },
    {
      name: 'guestId',
      type: 'text',
      index: true,
      maxLength: 128,
      label: 'Guest ID',
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      label: 'Trạng thái',
      options: [
        { label: 'Đang hoạt động', value: 'active' },
        { label: 'Bị bỏ quên', value: 'abandoned' },
        { label: 'Đã chuyển thành đơn', value: 'converted' },
        { label: 'Đã hợp nhất', value: 'merged' },
        { label: 'Đã hết hạn', value: 'expired' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Sản phẩm trong giỏ',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'product',
              type: 'relationship',
              relationTo: 'products',
              required: true,
              label: 'Sản phẩm',
              admin: { width: '60%' },
              filterOptions: {
                status: { equals: 'published' },
              },
            },
            {
              name: 'variantId',
              type: 'text',
              label: 'Variant ID',
              admin: {
                width: '40%',
                description:
                  'ID row trong products.variants; bắt buộc với variable product.',
              },
            },
          ],
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          max: MAX_QUANTITY_PER_ITEM,
          defaultValue: 1,
          label: 'Số lượng',
          admin: { step: 1 },
          validate: (value: unknown) => {
            if (
              typeof value !== 'number' ||
              !Number.isInteger(value) ||
              value <= 0
            ) {
              return 'Số lượng phải là số nguyên lớn hơn 0.'
            }

            return value <= MAX_QUANTITY_PER_ITEM
              ? true
              : `Số lượng không được vượt quá ${MAX_QUANTITY_PER_ITEM}.`
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'productTitleSnapshot',
              type: 'text',
              label: 'Tên sản phẩm',
              admin: { width: '40%', readOnly: true },
            },
            {
              name: 'variantNameSnapshot',
              type: 'text',
              label: 'Tên biến thể',
              admin: { width: '30%', readOnly: true },
            },
            {
              name: 'skuSnapshot',
              type: 'text',
              label: 'SKU',
              admin: { width: '30%', readOnly: true },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'unitPriceSnapshot',
              type: 'number',
              min: 0,
              label: 'Đơn giá',
              admin: { width: '33.33%', readOnly: true },
            },
            {
              name: 'stockSnapshot',
              type: 'number',
              min: 0,
              label: 'Tồn kho ghi nhận',
              admin: { width: '33.33%', readOnly: true },
            },
            {
              name: 'lineTotal',
              type: 'number',
              min: 0,
              label: 'Thành tiền',
              admin: { width: '33.33%', readOnly: true },
            },
          ],
        },
      ],
    },
    {
      name: 'voucher',
      type: 'relationship',
      relationTo: 'vouchers',
      label: 'Voucher đang chọn',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'subtotalAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: 'Tạm tính',
          admin: { width: '33.33%', readOnly: true },
        },
        {
          name: 'discountAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: 'Giảm giá',
          admin: { width: '33.33%', readOnly: true },
        },
        {
          name: 'totalAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: 'Tổng dự kiến',
          admin: { width: '33.33%', readOnly: true },
        },
      ],
    },
    {
      name: 'lastActivityAt',
      type: 'date',
      index: true,
      label: 'Hoạt động gần nhất',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm',
        },
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      index: true,
      label: 'Hết hạn',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm',
        },
      },
    },
    {
      name: 'convertedOrder',
      type: 'relationship',
      relationTo: 'orders',
      label: 'Đơn hàng đã tạo',
      admin: {
        position: 'sidebar',
        condition: (_, siblingData) =>
          siblingData?.status === 'converted',
      },
    },
    {
      name: 'mergedIntoCart',
      type: 'relationship',
      relationTo: 'carts',
      label: 'Giỏ đích',
      admin: {
        position: 'sidebar',
        condition: (_, siblingData) =>
          siblingData?.status === 'merged',
      },
    },
  ],
}
