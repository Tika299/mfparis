'use client'
import React, { useState, useEffect } from 'react'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/utilities/formatPrice'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ChevronLeft, Loader2, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')

  // Lấy dữ liệu từ Zustand Store
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  // Xử lý lỗi Hydration khi sử dụng LocalStorage
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (items.length === 0) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    // 1. Chuẩn bị dữ liệu đơn hàng
    const orderData = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      province: formData.get('province'),
      items: items.map(item => ({
        product: item.id,
        quantity: item.quantity,
        priceAtPurchase: item.price
      })),
      totalAmount: totalPrice,
      paymentMethod: paymentMethod,
    }

    try {
      // 2. Tạo đơn hàng trong hệ thống Payload CMS
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (!res.ok) throw new Error('Không thể tạo đơn hàng')
      const order = await res.json()

      // 3. Xử lý theo phương thức thanh toán
      if (paymentMethod === 'fundiin') {
        // Gọi API khởi tạo Fundiin
        const fundiinRes = await fetch('/api/payments/fundiin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // Sửa lỗi 400 ở đây
          body: JSON.stringify({ orderId: order.id }),
        })

        const fundiinData = await fundiinRes.json()

        if (fundiinRes.ok && fundiinData.paymentUrl) {
          clearCart() // Xóa giỏ hàng trước khi chuyển trang
          window.location.href = fundiinData.paymentUrl
          return
        } else {
          toast.error(fundiinData.error || 'Lỗi kết nối tới Fundiin')
          setLoading(false)
          return
        }
      }

      // 4. Nếu là COD thì hoàn tất đơn hàng
      clearCart()
      toast.success('Đặt hàng thành công!')
      router.push('/checkout/success')

    } catch (error: any) {
      console.error(error)
      toast.error('Có lỗi xảy ra, vui lòng thử lại!')
      setLoading(false)
    }
  }

  if (!isClient) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]"><Loader2 className="animate-spin text-[#b72828]" /></div>
  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF9] space-y-4">
      <h2 className="text-2xl font-serif italic text-gray-800">Giỏ hàng đang trống</h2>
      <Link href="/products" className="text-[#b72828] font-bold border-b border-[#b72828] pb-1 uppercase text-xs tracking-widest">Tiếp tục mua sắm</Link>
    </div>
  )

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20 font-sans antialiased">
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-10">

        {/* Nút quay lại */}
        <Link href="/cart" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10">
          <ChevronLeft size={14} /> Quay lại giỏ hàng
        </Link>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* CỘT TRÁI: THÔNG TIN KHÁCH HÀNG */}
          <div className="lg:col-span-7 space-y-10">
            <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-50">
              <h2 className="text-2xl font-bold font-serif italic text-gray-900 mb-8">Thông tin giao hàng</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Họ và tên</Label>
                  <Input id="fullName" name="fullName" placeholder="Nguyễn Văn A" required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Số điện thoại</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="0901234567" required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="province" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tỉnh / Thành phố</Label>
                  <Input id="province" name="province" placeholder="Hồ Chí Minh" required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Địa chỉ cụ thể</Label>
                  <Input id="address" name="address" placeholder="Số nhà, tên đường, phường..." required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-8">Phương thức thanh toán</h2>
              <RadioGroup defaultValue="cod" onValueChange={setPaymentMethod} className="space-y-4">

                {/* Lựa chọn COD */}
                <Label
                  htmlFor="cod"
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-[#b72828] bg-red-50/30' : 'border-gray-50 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value="cod" id="cod" className="text-[#b72828]" />
                    <div>
                      <p className="font-bold text-sm">Thanh toán khi nhận hàng (COD)</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Bạn chỉ trả tiền khi đã nhận và kiểm tra hàng</p>
                    </div>
                  </div>
                  <Truck size={20} className="text-gray-400" />
                </Label>

                {/* Lựa chọn FUNDIIN */}
                <Label
                  htmlFor="fundiin"
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'fundiin' ? 'border-[#b72828] bg-red-50/30' : 'border-gray-50 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value="fundiin" id="fundiin" className="text-[#b72828]" />
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        Mua trước trả sau với Fundiin
                        <img src="https://fundiin.vn/wp-content/uploads/2022/01/logo-fundiin.png" alt="Fundiin" className="h-4" />
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Trả trước 0đ - Chia 3 kỳ hạn miễn lãi</p>
                    </div>
                  </div>
                  <CreditCard size={20} className="text-gray-400" />
                </Label>

              </RadioGroup>
            </section>
          </div>

          {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG (STICKY) */}
          <div className="lg:col-span-5 sticky top-28">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-gray-50 space-y-8">
              <h2 className="text-xl font-bold font-serif italic border-b pb-6">Đơn hàng của bạn</h2>

              {/* Danh sách sản phẩm rút gọn */}
              <div className="space-y-6 max-h-[300px] overflow-y-auto no-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 relative bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.title} className="object-contain p-2 w-full h-full" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-[13px] font-bold text-gray-800 truncate">{item.title}</h4>
                      <p className="text-[11px] text-gray-400 uppercase font-medium">SL: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-black text-[#16423C]">{formatPrice(item.price * item.quantity)}₫</div>
                  </div>
                ))}
              </div>

              {/* Tính toán tiền */}
              <div className="space-y-4 pt-6 border-t border-dashed">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tạm tính</span>
                  <span className="font-bold text-gray-800">{formatPrice(totalPrice)}₫</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Phí vận chuyển</span>
                  <span className="text-emerald-600 font-bold uppercase text-[10px]">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-black uppercase tracking-widest text-[#b72828]">Tổng cộng</span>
                  <span className="text-2xl font-black text-[#b72828] tracking-tighter">{formatPrice(totalPrice)}₫</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-[#b72828] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-red-100 transition-all active:scale-95"
              >
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={18} /> Đang xử lý...</>
                ) : (
                  'Xác nhận đặt hàng'
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-tighter pt-4">
                <ShieldCheck size={14} className="text-emerald-500" /> Bảo mật thanh toán 100%
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}