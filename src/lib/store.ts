import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  id: string
  title: string
  price: number
  image: string
  slug: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === newItem.id)
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === newItem.id
                  ? { ...i, quantity: i.quantity + newItem.quantity } // SỬA Ở ĐÂY
                  : i,
              ),
            }
          }
          return { items: [...state.items, { ...newItem, quantity: newItem.quantity }] }
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      updateQuantity: (id, qty) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'mf-paris-cart' }, // Tên key lưu trong LocalStorage
  ),
)
