'use client'
import { useCartStore } from '@/lib/store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Minus } from 'lucide-react'
import Image from 'next/image'

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()

  const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0)

  console.log('Cart Items:', items) // Debug: Kiểm tra dữ liệu giỏ hàng

  if (items.length === 0) {
    return (
      <div className="container mx-auto py-40 text-center">
        <h2 className="text-2xl font-bold mb-4 uppercase">Giỏ hàng của bạn đang trống</h2>
        <Link href="/">
          <Button className="cursor-pointer">Tiếp tục mua sắm</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-20 px-4">
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-10">Giỏ hàng của bạn</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* DANH SÁCH SẢN PHẨM */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 border-b pb-6 items-center">
              <div className="relative w-24 h-32 bg-gray-100">
                <Image
                  src={item.image || '/api/media/file/placeholder.jpg'}
                  alt={item.title}
                  fill
                  sizes="96px"
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-sm uppercase">{item.title}</h3>
                <p className="text-red-600 font-bold mt-1">{item.price.toLocaleString()}₫</p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center border">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className={`p-2 ${item.quantity === 1 ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-200 cursor-pointer'}`}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-4 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-200 cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TỔNG KẾT & THANH TOÁN */}
        <div className="bg-gray-50 p-8 h-fit">
          <h2 className="font-bold uppercase text-sm mb-6 border-b pb-4">Tóm tắt đơn hàng</h2>
          <div className="flex justify-between mb-4">
            <span>Tạm tính:</span>
            <span className="font-bold">{totalPrice.toLocaleString()}₫</span>
          </div>
          <div className="flex justify-between mb-8 text-lg">
            <span>Tổng cộng:</span>
            <span className="font-bold text-red-600 text-xl">{totalPrice.toLocaleString()}₫</span>
          </div>
          <Link href="/checkout">
            <Button className="w-full h-14 bg-black uppercase font-bold tracking-widest">
              Tiến hành thanh toán
            </Button>
          </Link>
          <p className="text-[10px] text-gray-500 mt-4 text-center italic">
            Phí vận chuyển sẽ được tính ở trang thanh toán.
          </p>
        </div>
      </div>
    </div>
  )
}
