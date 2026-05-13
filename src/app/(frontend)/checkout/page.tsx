'use client'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/utilities/formatPrice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react' // Thêm useEffect
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  // 1. Tách riêng các selector để tránh tạo Object mới
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)

  // 2. Tính toán totalPrice trực tiếp trong component (không cho vào selector)
  const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false) // Để xử lý Hydration
  const router = useRouter()

  // 3. Đảm bảo chỉ render khi đã ở phía Client để tránh lỗi Hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (items.length === 0) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const orderData = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      province: formData.get('province'),
      items: items.map((item) => ({
        product: item.id,
        quantity: item.quantity,
        priceAtPurchase: item.price,
      })),
      totalAmount: totalPrice,
      paymentMethod: 'cod',
    }

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Thêm header này
        body: JSON.stringify(orderData),
      })

      if (res.ok) {
        clearCart()
        router.push('/checkout/success')
      } else {
        alert('Có lỗi xảy ra khi tạo đơn hàng!')
      }
    } catch (error) {
      console.error(error)
      alert('Lỗi kết nối!')
    } finally {
      setLoading(false)
    }
  }

  // Nếu đang quá trình Hydration hoặc giỏ hàng trống
  if (!isClient) return <div className="py-40 text-center">Đang tải...</div>
  if (items.length === 0) return <div className="text-center py-40">Giỏ hàng trống</div>

  return (
    <div className="container mx-auto py-20 px-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* THÔNG TIN GIAO HÀNG */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-widest border-b pb-4">
            Thông tin giao hàng
          </h2>
          <div className="space-y-4">
            <Input name="fullName" placeholder="Họ và tên" required className="h-12" />
            <Input name="phone" placeholder="Số điện thoại" required className="h-12" />
            <Input name="province" placeholder="Tỉnh / Thành phố" required className="h-12" />
            <Input
              name="address"
              placeholder="Địa chỉ cụ thể (Số nhà, tên đường...)"
              required
              className="h-12"
            />
          </div>

          <div className="pt-6">
            <h3 className="font-bold mb-4 uppercase text-sm">Phương thức thanh toán</h3>
            <div className="p-4 border rounded bg-gray-50 flex items-center gap-3">
              <input type="radio" checked readOnly />
              <span className="text-sm">Thanh toán khi nhận hàng (COD)</span>
            </div>
          </div>
        </div>

        {/* ĐƠN HÀNG CỦA BẠN */}
        <div className="bg-gray-50 p-8 h-fit border">
          <h2 className="text-xl font-bold uppercase tracking-widest border-b pb-4 mb-6">
            Đơn hàng
          </h2>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.title} <strong className="text-gray-400">x {item.quantity}</strong>
                </span>
                <span>{formatPrice(item.price * item.quantity)}₫</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 flex justify-between text-lg font-bold">
            <span>Tổng cộng:</span>
            <span className="text-red-600">{formatPrice(totalPrice)}₫</span>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-black text-white mt-8 uppercase font-bold tracking-widest"
          >
            {loading ? 'Đang xử lý...' : 'Đặt hàng ngay'}
          </Button>
        </div>
      </form>
    </div>
  )
}
