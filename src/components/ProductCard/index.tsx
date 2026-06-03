'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Heart, ShieldCheck, Bike, RotateCcw, Gift, ChevronRight, Star } from 'lucide-react'
import { toast } from 'sonner'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { cn } from '@/utilities'
import { useCartStore } from '@/lib/store'

function getStableRating(seed: string) {
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }

  const rating = 4.8 + (Math.abs(hash) % 21) / 100

  return Math.min(rating, 5).toFixed(1)
}

function getReviewCount(product: any) {
  return (
    product?.reviewCount ||
    product?.reviewsCount ||
    product?.rating?.count ||
    product?.reviews?.totalDocs ||
    product?.reviews?.docs?.length ||
    null
  )
}

export const ProductCard = ({ product, className }: { product: any; className?: string }) => {
  const basePrice = Number(product?.price?.basePrice || 0)
  const salePrice = Number(product?.price?.salePrice || 0)
  const isSale = salePrice > 0 && salePrice < basePrice
  const discountPercent = isSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0
  const finalPrice = isSale ? salePrice : basePrice

  const [added, setAdded] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  const rating = useMemo(() => {
    return getStableRating(String(product?.id || product?.slug || product?.title || 'product'))
  }, [product?.id, product?.slug, product?.title])

  const reviewCount = getReviewCount(product)

  const productImage =
    product?.images?.[0]?.image?.url ||
    product?.images?.[0]?.image?.sizes?.thumbnail?.url ||
    '/placeholder.jpg'

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    addItem({
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: productImage,
      slug: product.slug,
      quantity: 1,
    })

    setAdded(true)
    toast.success('Đã thêm vào giỏ hàng thành công!')

    setTimeout(() => {
      setAdded(false)
    }, 1200)
  }

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[32px] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      {/* 1. IMAGE AREA - Chiều cao đã được giảm xuống để card nhìn cân đối hơn */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-[26px]">
        {/* Nền gradient nghệ thuật */}
        <div className="absolute inset-0" />

        {/* Badge Giảm giá */}
        {isSale && (
          <div className="absolute left-3 top-3 z-20">
            <span className="flex h-8 items-center justify-center rounded-full bg-[#e10613] px-3 text-[13px] font-black text-white shadow-lg shadow-red-200">
              -{discountPercent}%
            </span>
          </div>
        )}

        {/* Nút Yêu thích */}
        <button className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-400 backdrop-blur-md transition hover:text-[#e10613]">
          <Heart size={20} strokeWidth={2} />
        </button>

        {/* Badge Chính hãng */}
        <div className="absolute left-3 top-[52px] z-20">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-[#e10613] shadow-sm ring-1 ring-red-50">
            <ShieldCheck size={12} className="fill-[#e10613] text-white" />
            Chính hãng
          </span>
        </div>

        <Link href={`/products/${product.slug}`} className="relative flex h-full items-center justify-center">

          {/* Ảnh sản phẩm */}
          <div className="relative z-10 h-full w-full transition-transform duration-700 group-hover:scale-110">
            <OptimizedImage
              media={product?.images?.[0]?.image}
              size="card"
              alt={product.title}
              className="h-full w-full [&_img]:object-contain"
            />
          </div>
        </Link>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#b38756]">
          {product?.brand?.name || "NATURE'S WAY"}
        </p>

        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[44px] text-[17px] font-bold leading-tight text-neutral-900 transition hover:text-[#e10613]">
            {product.title}
          </h3>
        </Link>

        {/* Giá tiền */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[20px] font-black tracking-tight text-[#e10613]">
            {formatPrice(finalPrice)}đ
          </span>
          {isSale && (
            <span className="text-[14px] font-medium text-neutral-300 line-through">
              {formatPrice(basePrice)}đ
            </span>
          )}
        </div>

        {/* Đánh giá */}
        <div className="mt-3 flex items-center gap-1 border-b border-neutral-50 pb-4">
          <div className="flex gap-0.5 text-[#ffb800]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
            ))}
          </div>

          <span className="ml-1 text-[13px] font-bold text-neutral-900">
            {rating}
          </span>

          {reviewCount ? (
            <>
              <span className="text-neutral-200">|</span>
              <span className="text-[12px] text-neutral-400">
                {Number(reviewCount).toLocaleString('vi-VN')} đánh giá
              </span>
            </>
          ) : null}
        </div>

        {/* Chính sách 3 cột - Làm gọn lại */}
        <div className="grid grid-cols-3 py-4">
          <MiniPolicy icon={<ShieldCheck size={18} />} label="Chính hãng" sub="100% chuẩn" />
          <MiniPolicy icon={<Bike size={18} />} label="Giao 2h" sub="Nội thành" />
          <MiniPolicy icon={<RotateCcw size={18} />} label="Đổi trả" sub="7 ngày" />
        </div>

        {/* Quà tặng */}
        <button className="flex w-full items-center justify-between rounded-2xl bg-[#f5f9ff] px-4 py-3 text-[#1f5fe0] transition hover:bg-[#ebf3ff]">
          <span className="flex items-center gap-2 text-[12.5px] font-bold">
            <Gift size={18} />
            Tặng quà/Voucher
          </span>
          <ChevronRight size={16} />
        </button>

        {/* Nút Mua ngay */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="group/btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e10613] py-4 text-[14px] font-black text-white shadow-lg shadow-red-100 transition-all hover:bg-black hover:shadow-neutral-200"
        >
          <ShoppingBag size={19} className="transition-transform group-hover/btn:-rotate-12" />
          {added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}
        </button>
      </div>
    </article>
  )
}

function MiniPolicy({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-1 text-[#e10613]">{icon}</div>
      <p className="text-[10px] font-bold text-neutral-800">{label}</p>
      <p className="text-[9px] text-neutral-400">{sub}</p>
    </div>
  )
}