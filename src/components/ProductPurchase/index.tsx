'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner' // Nếu bạn đã cài sonner

export const ProductPurchase = ({ product }: { product: any }) => {
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price.salePrice || product.price.basePrice,
      image: (product.images?.[0]?.image as any).url,
      slug: product.slug,
      quantity: quantity,
    })
    toast.success('Đã thêm vào giỏ hàng thành công!')
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="inline-flex h-10 shrink-0 items-center rounded-xl border border-gray-200 bg-white sm:h-11">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="grid h-full w-8 place-items-center rounded-l-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 sm:w-9"
          aria-label="Giảm số lượng"
        >
          <Minus size={14} />
        </button>

        <span className="grid h-full min-w-[34px] place-items-center border-x border-gray-200 px-1.5 text-sm font-bold sm:min-w-[40px]">
          {quantity}
        </span>

        <button
          onClick={() => setQuantity(quantity + 1)}
          className="grid h-full w-8 place-items-center rounded-r-xl text-gray-700 hover:bg-gray-100 active:bg-gray-200 sm:w-9"
          aria-label="Tăng số lượng"
        >
          <Plus size={14} />
        </button>
      </div>

      <Button
        onClick={handleAddToCart}
        className="h-10 flex-1 rounded-xl bg-black px-3 text-[10px] font-bold uppercase tracking-[0.06em] text-white hover:bg-red-600 sm:h-11 sm:text-[11px] sm:tracking-[0.1em]"
      >
        <ShoppingBag className="mr-1.5 shrink-0 sm:mr-2" size={16} />
        <span className="whitespace-nowrap sm:hidden">Thêm giỏ</span>
        <span className="hidden whitespace-nowrap sm:inline">Thêm vào giỏ hàng</span>
      </Button>
    </div>
  )
}
