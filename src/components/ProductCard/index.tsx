"use client"
import React from 'react'
import Link from 'next/link'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { useCartStore } from '@/lib/store'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export const ProductCard = ({ product }: { product: any }) => {
  const addItem = useCartStore((state) => state.addItem)
  const router = useRouter()

  // 1. Xử lý ảnh (Ưu tiên bản nén size 'card')
  const mainMedia = product.images?.[0]?.image
  const hoverMedia = product.images?.[1]?.image || mainMedia

  // 2. Logic giá
  const basePrice = product.price?.basePrice || 0
  const salePrice = product.price?.salePrice
  const isSale = salePrice && salePrice < basePrice
  const discountPercent = isSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0

  // 3. Thêm nhanh vào giỏ hàng
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const cartThumbnail = mainMedia?.sizes?.thumbnail?.url || mainMedia?.url || '/placeholder.jpg'

    addItem({
      id: product.id,
      title: product.title,
      price: salePrice || basePrice,
      image: cartThumbnail,
      slug: product.slug,
      quantity: 1
    })

    // HIỂN THỊ TOAST TÙY CHỈNH
    toast.success('Đã thêm vào giỏ hàng', {
      description: product.title,
      duration: 3000,
      action: {
        label: 'XEM GIỎ HÀNG',
        onClick: () => router.push('/cart'), // Nhớ import useRouter từ next/navigation
      },
      // Tùy chỉnh màu sắc nút action cho đúng màu đỏ thương hiệu
      actionButtonStyle: {
        backgroundColor: '#b72828',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        borderRadius: '8px',
      }
    })
  }

  return (
    <div className="group flex flex-col bg-transparent transition-all duration-500">

      {/* KHU VỰC HÌNH ẢNH 1:1 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] bg-white border border-gray-50 shadow-sm">

        {/* Badge giảm giá góc trái */}
        {isSale && (
          <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">
            -{discountPercent}%
          </div>
        )}

        {/* Link vào trang chi tiết & Hiệu ứng đổi ảnh */}
        <Link href={`/products/${product.slug}`} className="block h-full w-full relative">
          <OptimizedImage
            media={mainMedia}
            size="card"
            alt={product.title}
            className="absolute inset-0 w-full h-full group-hover:opacity-0 group-hover:scale-110 transition-all duration-700 ease-in-out"
          />
          <OptimizedImage
            media={hoverMedia}
            size="card"
            alt={product.title}
            className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-in-out"
          />
        </Link>

        {/* Nút mua nhanh xuất hiện khi hover */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm text-black py-3 rounded-2xl 
                     text-[10px] font-black uppercase tracking-[0.1em] shadow-xl 
                     translate-y-12 opacity-0 transition-all duration-500 
                     group-hover:translate-y-0 group-hover:opacity-100
                     flex items-center justify-center gap-2 hover:bg-[#b72828] hover:text-white"
        >
          <ShoppingBag size={14} />
          Mua ngay
        </button>
      </div>

      {/* THÔNG TIN SẢN PHẨM */}
      <div className="mt-4 space-y-1.5 text-center md:text-left px-1">

        {/* Tên thương hiệu - font chữ nhỏ, thưa sang trọng */}
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-800/50 leading-none">
          {product.brand?.name || 'Paris Authentic'}
        </p>

        {/* Tiêu đề sản phẩm */}
        {/* Tiêu đề sản phẩm - Giới hạn 2 dòng, nếu dài hơn sẽ hiện ... */}
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="text-[13px] md:text-sm font-semibold text-gray-800 
                 line-clamp-2 leading-snug 
                 hover:text-[#16423C] transition-colors 
                 h-[36px] md:h-[40px] overflow-hidden font-sans">
            {product.title}
          </h3>
        </Link>

        {/* Khu vực giá tiền */}
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3">
          <span className="text-sm font-black text-[#b72828] tracking-tight">
            {formatPrice(salePrice || basePrice)}₫
          </span>
          {isSale && (
            <span className="text-[11px] text-gray-300 line-through font-medium">
              {formatPrice(basePrice)}₫
            </span>
          )}
        </div>
      </div>
    </div>
  )
}