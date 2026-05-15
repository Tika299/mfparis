'use client'
import React from 'react'
import Link from 'next/link'
import { formatPrice } from '@/utilities/formatPrice'
import { useCartStore } from '@/lib/store'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'
import { OptimizedImage } from '../OptimizedImage'

export const ProductCard = ({ product }: { product: any }) => {
  const addItem = useCartStore((state) => state.addItem)

  // 1. Lấy ảnh chính và ảnh hover (Sử dụng size 'card' đã cấu hình trong Media.ts)
  // Ưu tiên bản nén 600x600 để web nhẹ nhất
  const mainImageData = product.images?.[0]?.image
  const hoverImageData = product.images?.[1]?.image || mainImageData

  // 2. Tính toán giá và % giảm giá
  const basePrice = product.price?.basePrice || 0
  const salePrice = product.price?.salePrice
  const hasSale = salePrice && salePrice < basePrice
  const discountPercent = hasSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0

  // 3. Xử lý thêm vào giỏ hàng nhanh
  const handleAddToCart = (e: React.MouseEvent) => {
    const thumbnail =
      mainImageData?.sizes?.thumbnail?.url ||
      mainImageData?.url ||
      '/api/media/file/placeholder.jpg'
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      title: product.title,
      price: salePrice || basePrice,
      image: thumbnail,
      slug: product.slug,
      quantity: 1,
    })
    toast.success('Đã thêm vào giỏ hàng')
  }

  return (
    <div className="group relative flex flex-col bg-transparent transition-all duration-500">
      {/* KHUNG ẢNH 1:1 - TỐI ƯU HIỆU ỨNG HOVER */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F3F3F3] border border-gray-50">
        {/* Badge Giảm giá */}
        {hasSale && (
          <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
            -{discountPercent}%
          </div>
        )}

        <Link href={`/products/${product.slug}`} className="block h-full w-full">
          {/* Ảnh chính */}
          <OptimizedImage
            media={mainImageData}
            alt={product.title}
            size="card"
            className="h-full w-full group-hover:opacity-0 group-hover:scale-110 transition-all duration-700"
          />
          {/* Ảnh khi Hover (Swap image kiểu Haravan) */}
          <OptimizedImage
            media={hoverImageData}
            alt={product.title}
            size="card"
            className="absolute top-0 left-0 h-full w-full opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
          />
        </Link>

        {/* Nút thêm nhanh (Hiện khi hover - Desktop) */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md text-black py-3 rounded-xl 
                     text-[10px] font-bold uppercase tracking-[0.1em] shadow-xl 
                     translate-y-12 opacity-0 transition-all duration-500 
                     group-hover:translate-y-0 group-hover:opacity-100
                     flex items-center justify-center gap-2 hover:bg-black hover:text-white cursor-pointer"
        >
          <ShoppingBag size={14} />
          Thêm vào giỏ
        </button>
      </div>

      {/* THÔNG TIN SẢN PHẨM */}
      <div className="mt-5 space-y-2 px-1 text-center md:text-left">
        {/* Thương hiệu */}
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-800/60 leading-none">
          {product.brand?.name || 'MF Paris Authentic'}
        </p>

        {/* Tiêu đề - Mix giữa Serif và Sans cho sang */}
        <Link href={`/products/${product.slug}`} className="block group/title">
          <h3
            className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight 
                         group-hover/title:text-amber-700 transition-colors h-[40px] font-sans"
          >
            {product.title}
          </h3>
        </Link>

        {/* Giá tiền */}
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3 pt-1">
          <span className="text-sm font-black text-black tracking-tighter">
            {formatPrice(salePrice || basePrice)}₫
          </span>
          {hasSale && (
            <span className="text-[11px] text-gray-300 line-through decoration-gray-200">
              {formatPrice(basePrice)}₫
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
