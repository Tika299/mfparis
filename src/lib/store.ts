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
}

interface CartState {
  items: CartItem[]

  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  changeVariant: (oldItemId: string, nextItem: CartItem) => void
  clearCart: () => void
}

const clampQuantity = (qty: number, stock?: number) => {
  const safeQty = Math.max(1, Number(qty || 1))

  if (typeof stock === 'number' && stock > 0) {
    return Math.min(safeQty, stock)
  }

  return safeQty
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.id === newItem.id)

          if (existingItem) {
            const nextQuantity = clampQuantity(
              existingItem.quantity + newItem.quantity,
              newItem.stock ?? existingItem.stock,
            )

            return {
              items: state.items.map((item) =>
                item.id === newItem.id
                  ? {
                    ...item,
                    ...newItem,
                    quantity: nextQuantity,
                  }
                  : item,
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity: clampQuantity(newItem.quantity, newItem.stock),
              },
            ],
          }
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                ...item,
                quantity: clampQuantity(qty, item.stock),
              }
              : item,
          ),
        })),

      changeVariant: (oldItemId, nextItem) =>
        set((state) => {
          const currentItem = state.items.find((item) => item.id === oldItemId)

          if (!currentItem) return state

          const existingSameVariant = state.items.find(
            (item) => item.id === nextItem.id && item.id !== oldItemId,
          )

          if (existingSameVariant) {
            return {
              items: state.items
                .filter((item) => item.id !== oldItemId)
                .map((item) => {
                  if (item.id !== nextItem.id) return item

                  return {
                    ...item,
                    ...nextItem,
                    quantity: clampQuantity(
                      item.quantity + currentItem.quantity,
                      nextItem.stock ?? item.stock,
                    ),
                  }
                }),
            }
          }

          return {
            items: state.items.map((item) =>
              item.id === oldItemId
                ? {
                  ...item,
                  ...nextItem,
                  quantity: clampQuantity(
                    currentItem.quantity,
                    nextItem.stock,
                  ),
                }
                : item,
            ),
          }
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'mf-paris-cart',
    },
  ),
)