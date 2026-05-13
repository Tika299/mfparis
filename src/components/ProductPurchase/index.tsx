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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center border h-12">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 hover:bg-gray-100 h-full"
          >
            <Minus size={16} />
          </button>
          <span className="px-4 font-bold w-12 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-4 hover:bg-gray-100 h-full"
          >
            <Plus size={16} />
          </button>
        </div>

        <Button
          onClick={handleAddToCart}
          className="flex-grow h-12 bg-black text-white uppercase font-bold tracking-widest hover:bg-red-600"
        >
          <ShoppingBag className="mr-2" size={18} />
          Thêm vào giỏ hàng
        </Button>
      </div>
    </div>
  )
}
