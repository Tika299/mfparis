import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartVariant = {
  id: string
  name: string
  sku?: string
  basePrice?: number
  salePrice?: number
  price: number
  stock?: number
  image?: string
}

export type CartItem = {
  id: string

  productId?: string
  variantId?: string
  variantName?: string

  baseTitle?: string
  title: string

  price: number
  image: string
  slug: string
  quantity: number

  sku?: string
  stock?: number

  variants?: CartVariant[]

  // Dữ liệu cập nhật từ API /api/cart/validate
  latestStock?: number
  latestPrice?: number
  isAvailable?: boolean
  isOutOfStock?: boolean
  isOverStock?: boolean
  reason?: string | null
}

interface CartState {
  items: CartItem[]

  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  changeVariant: (oldItemId: string, nextItem: CartItem) => void
  syncItems: (items: CartItem[]) => void
  clearCart: () => void
}

const isKnownOutOfStock = (stock?: number) => {
  return typeof stock === 'number' && stock <= 0
}

const clampQuantity = (qty: number, stock?: number) => {
  const safeQty = Math.max(1, Number(qty || 1))

  if (typeof stock === 'number' && stock > 0) {
    return Math.min(safeQty, stock)
  }

  return safeQty
}

const normalizeCartItem = (item: CartItem): CartItem => {
  const stock = typeof item.stock === 'number' ? item.stock : item.latestStock

  return {
    ...item,
    stock,
    quantity: clampQuantity(item.quantity, stock),
    isOutOfStock: typeof stock === 'number' ? stock <= 0 : item.isOutOfStock,
    isOverStock:
      typeof stock === 'number' && stock > 0
        ? Number(item.quantity || 1) > stock
        : item.isOverStock,
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          // Nếu biết chắc stock = 0 thì không thêm vào giỏ
          if (isKnownOutOfStock(newItem.stock)) {
            return state
          }

          const existingItem = state.items.find((item) => item.id === newItem.id)

          if (existingItem) {
            const latestStock = newItem.stock ?? existingItem.stock

            // Nếu item cũ giờ đã hết hàng thì không cộng thêm
            if (isKnownOutOfStock(latestStock)) {
              return state
            }

            const nextQuantity = clampQuantity(
              existingItem.quantity + newItem.quantity,
              latestStock,
            )

            return {
              items: state.items.map((item) =>
                item.id === newItem.id
                  ? normalizeCartItem({
                    ...item,
                    ...newItem,
                    stock: latestStock,
                    quantity: nextQuantity,
                  })
                  : item,
              ),
            }
          }

          return {
            items: [
              ...state.items,
              normalizeCartItem({
                ...newItem,
                quantity: clampQuantity(newItem.quantity, newItem.stock),
              }),
            ],
          }
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item

            // Nếu hết hàng thì vẫn giữ trong giỏ để báo khách, nhưng không cho tăng/giảm tùy tiện
            if (isKnownOutOfStock(item.stock)) {
              return {
                ...item,
                quantity: Math.max(1, Number(item.quantity || 1)),
                isOutOfStock: true,
                isAvailable: false,
              }
            }

            return normalizeCartItem({
              ...item,
              quantity: clampQuantity(qty, item.stock),
            })
          }),
        })),

      changeVariant: (oldItemId, nextItem) =>
        set((state) => {
          const currentItem = state.items.find((item) => item.id === oldItemId)

          if (!currentItem) return state

          const nextStock = nextItem.stock

          if (typeof nextStock === 'number' && nextStock <= 0) {
            return state
          }

          const targetQuantity = clampQuantity(
            nextItem.quantity || 1,
            nextItem.stock,
          )

          const existingSameVariant = state.items.find(
            (item) => item.id === nextItem.id && item.id !== oldItemId,
          )

          // Nếu đổi sang biến thể đã có trong giỏ:
          // xóa dòng cũ, cập nhật dòng biến thể đích theo dữ liệu mới nhất,
          // KHÔNG giữ quantity cũ, KHÔNG cộng dồn.
          if (existingSameVariant) {
            return {
              items: state.items
                .filter((item) => item.id !== oldItemId)
                .map((item) => {
                  if (item.id !== nextItem.id) return item

                  return normalizeCartItem({
                    ...item,
                    ...nextItem,
                    quantity: targetQuantity,
                  })
                }),
            }
          }

          return {
            items: state.items.map((item) =>
              item.id === oldItemId
                ? normalizeCartItem({
                  ...item,
                  ...nextItem,
                  quantity: targetQuantity,
                })
                : item,
            ),
          }
        }),

      syncItems: (newItems) =>
        set(() => ({
          // Không tự xóa item hết hàng.
          // Vẫn giữ lại để CartPage hiển thị cảnh báo cho khách.
          items: Array.isArray(newItems)
            ? newItems
              .filter((item) => item && item.id)
              .map((item) => normalizeCartItem(item))
            : [],
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'mf-paris-cart',
    },
  ),
)

export type WishlistProductId =
  | string
  | number

interface WishlistState {
  productIds: string[]
  hasHydrated: boolean

  toggleWishlist: (
    productId: WishlistProductId,
  ) => boolean

  isInWishlist: (
    productId: WishlistProductId,
  ) => boolean

  clearWishlist: () => void

  setHasHydrated: (
    hasHydrated: boolean,
  ) => void
}

const normalizeWishlistProductId = (
  productId: WishlistProductId,
): string => {
  return String(productId).trim()
}

export const useWishlistStore =
  create<WishlistState>()(
    persist(
      (set, get) => ({
        productIds: [],
        hasHydrated: false,

        toggleWishlist: (productId) => {
          const normalizedProductId =
            normalizeWishlistProductId(
              productId,
            )

          if (!normalizedProductId) {
            return false
          }

          const isExisting =
            get().productIds.includes(
              normalizedProductId,
            )

          set((state) => ({
            productIds: isExisting
              ? state.productIds.filter(
                (id) =>
                  id !==
                  normalizedProductId,
              )
              : [
                ...state.productIds,
                normalizedProductId,
              ],
          }))

          return !isExisting
        },

        isInWishlist: (productId) => {
          const normalizedProductId =
            normalizeWishlistProductId(
              productId,
            )

          if (!normalizedProductId) {
            return false
          }

          return get().productIds.includes(
            normalizedProductId,
          )
        },

        clearWishlist: () => {
          set({
            productIds: [],
          })
        },

        setHasHydrated: (
          hasHydrated,
        ) => {
          set({
            hasHydrated,
          })
        },
      }),

      {
        name: 'mf-paris-wishlist',

        /**
         * Quan trọng:
         * Không đọc localStorage trong lần render
         * đầu tiên để tránh hydration mismatch.
         */
        skipHydration: true,

        /**
         * Chỉ lưu danh sách ID.
         * Không lưu hasHydrated vào localStorage.
         */
        partialize: (state) => ({
          productIds:
            state.productIds,
        }),

        onRehydrateStorage:
          () => (state) => {
            state?.setHasHydrated(true)
          },
      },
    ),
  )