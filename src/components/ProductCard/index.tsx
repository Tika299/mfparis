'use client'

import React, {
  useState,
  type MouseEvent,
} from 'react'
import type {
  Media,
  Product,
} from '@/payload-types'
import Link from 'next/link'
import { ShoppingBag, Settings, Heart, ShieldCheck, Bike, RotateCcw, Gift, ChevronRight, Star } from 'lucide-react'
import { toast } from 'sonner'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { cn } from '@/utilities'
import { useCartStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

type ProductVariant =
  NonNullable<Product['variants']>[number]

type MediaRelationship =
  | number
  | Media
  | null
  | undefined

type ProductCardProps = Readonly<{
  product: Product
  className?: string
}>

function getActiveVariants(
  product: Product,
): ProductVariant[] {
  if (
    product.productType !== 'variable' ||
    !Array.isArray(product.variants)
  ) {
    return []
  }

  return product.variants.filter(
    (variant) => variant.isActive !== false,
  )
}

function getUploadUrl(
  upload: MediaRelationship,
): string {
  if (
    !upload ||
    typeof upload !== 'object'
  ) {
    return ''
  }

  return (
    upload.sizes?.card?.url ??
    upload.url ??
    upload.sizes?.thumbnail?.url ??
    ''
  )
}

function getVariantPrice(
  variant: ProductVariant,
): number {
  const basePrice = Number(
    variant.basePrice ?? 0,
  )

  const salePrice = Number(
    variant.salePrice ?? 0,
  )

  const hasValidSalePrice =
    basePrice > 0 &&
    salePrice > 0 &&
    salePrice < basePrice

  return hasValidSalePrice
    ? salePrice
    : basePrice
}

function getVariantCartId(
  variant: ProductVariant,
  index: number,
): string {
  const variantId =
    typeof variant.id === 'string'
      ? variant.id.trim()
      : ''

  if (variantId) {
    return variantId
  }

  const sku = variant.sku?.trim()

  if (sku) {
    return `sku-${sku}`
  }

  const name = variant.name?.trim()

  if (name) {
    return `name-${encodeURIComponent(name)}`
  }

  return `variant-${index + 1}`
}

function normalizeRating(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null
  }

  return Math.min(5, Math.max(0, value))
}

function normalizeReviewCount(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null
  }

  return Math.max(0, Math.floor(value))
}

function RatingStars({
  rating,
}: Readonly<{
  rating: number
}>) {
  const normalizedRating = Math.min(
    5,
    Math.max(0, rating),
  )

  const filledStarCount = Math.round(
    normalizedRating,
  )

  return (
    <span
      role="img"
      aria-label={`${normalizedRating.toLocaleString(
        'vi-VN',
        {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        },
      )} trên 5 sao`}
      className="inline-flex shrink-0 items-center gap-0.5 leading-none"
    >
      {Array.from(
        { length: 5 },
        (_, index) => {
          const isFilled =
            index < filledStarCount

          const starColor = isFilled
            ? '#FFB800'
            : '#E5E7EB'

          return (
            <Star
              key={index}
              aria-hidden="true"
              size={15}
              strokeWidth={1.5}
              color={starColor}
              fill={starColor}
              style={{
                color: starColor,
                fill: starColor,
                flexShrink: 0,
                display: 'block',
              }}
            />
          )
        },
      )}
    </span>
  )
}

export const ProductCard = ({
  product,
  className,
}: ProductCardProps) => {

  const variants: ProductVariant[] =
    getActiveVariants(product)
  const isVariableProduct = product?.productType === 'variable' && variants.length > 0

  const defaultVariant =
    variants.find(
      (variant) =>
        variant.isDefault === true &&
        Number(variant.stock ?? 0) > 0,
    ) ??
    variants.find(
      (variant) =>
        Number(variant.stock ?? 0) > 0,
    ) ??
    variants[0]

  const basePrice = isVariableProduct
    ? Number(defaultVariant?.basePrice ?? 0)
    : Number(product.price?.basePrice ?? 0)

  const salePrice = isVariableProduct
    ? Number(defaultVariant?.salePrice ?? 0)
    : Number(product.price?.salePrice ?? 0)

  const isSale =
    basePrice > 0 &&
    salePrice > 0 &&
    salePrice < basePrice

  const discountPercent = isSale
    ? Math.round(
      ((basePrice - salePrice) / basePrice) * 100,
    )
    : 0

  const finalPrice = isSale
    ? salePrice
    : basePrice
  const isContactPrice = finalPrice <= 0

  const stock = isVariableProduct
    ? Number(defaultVariant?.stock ?? 0)
    : Number(product.price?.stock ?? 0)

  const isOutOfStock = stock <= 0

  const firstProductImage =
    product.images?.[0]?.image

  const productImage =
    getUploadUrl(defaultVariant?.image) ||
    getUploadUrl(firstProductImage) ||
    '/placeholder.jpg'

  const router = useRouter()

  const [added, setAdded] = useState(false)

  const addItem = useCartStore(
    (state) => state.addItem,
  )

  const rating = normalizeRating(
    product.averageRating,
  )

  const reviewCount = normalizeReviewCount(
    product.reviewCount,
  )

  const shouldShowRating =
    rating !== null &&
    rating > 0 &&
    reviewCount !== null &&
    reviewCount > 0

  const handleAddToCart = (
    event: MouseEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    /**
     * Sản phẩm có biến thể:
     * Không tự động thêm defaultVariant vào giỏ.
     * Chuyển người dùng đến trang chi tiết để chọn phân loại.
     */
    if (isVariableProduct) {
      router.push(`/products/${product.slug}`)
      return
    }

    /**
     * Từ đây trở xuống chỉ xử lý sản phẩm đơn.
     */
    if (isOutOfStock) {
      toast.error('Sản phẩm hiện đã hết hàng')
      return
    }

    if (isContactPrice) {
      window.location.href =
        'https://zalo.me/2731577726641619342'

      return
    }

    const productId = String(product.id)

    addItem({
      id: productId,

      productId,
      variantId: undefined,
      variantName: undefined,

      baseTitle: product.title,
      title: product.title,

      price: finalPrice,
      image: productImage,
      slug: product.slug,
      quantity: 1,

      sku: product.sku ?? undefined,
      stock,

      /**
       * Sản phẩm đơn không có danh sách
       * phân loại cần lựa chọn.
       */
      variants: [],
    })

    setAdded(true)

    toast.success(
      'Đã thêm vào giỏ hàng thành công!',
    )

    window.setTimeout(() => {
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

        {isOutOfStock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-black px-4 py-2 text-[12px] font-black uppercase tracking-widest text-white">
              Hết hàng
            </span>
          </div>
        )}

        {/* Nút Yêu thích */}
        <button
          type="button"
          aria-label={`Thêm ${product.title} vào danh sách yêu thích`}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-400 backdrop-blur-md transition hover:text-[#e10613]"
        >
          <Heart
            size={20}
            strokeWidth={2}
          />
        </button>

        {/* Badge Chính hãng */}
        {/* <div className="absolute left-3 top-[52px] z-20">
          <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-[#e10613] shadow-sm ring-1 ring-red-50">
            <ShieldCheck size={12} className="fill-[#e10613] text-white" />
            Chính hãng
          </span>
        </div> */}

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
        {product.brand && typeof product.brand === 'object' && product.brand.name ? (<p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#b38756]"> {product.brand.name} </p>) : null}

        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[44px] text-[17px] font-bold leading-tight text-neutral-900 transition hover:text-[#e10613]">
            {product.title}
          </h3>
        </Link>

        {/* Giá tiền */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[20px] font-black tracking-tight text-[#e10613]">
            {isContactPrice ? 'Liên hệ' : `${formatPrice(finalPrice)}đ`}
          </span>
          {isSale && (
            <span className="text-[14px] font-medium text-neutral-300 line-through">
              {formatPrice(basePrice)}đ
            </span>
          )}
        </div>

        {/* Đánh giá */}
        {shouldShowRating ? (
          <div className="mt-3 flex items-center gap-1 border-b border-neutral-50 pb-4">
            <RatingStars rating={rating} />

            <span className="ml-1 text-[13px] font-bold text-neutral-900">
              {rating.toLocaleString('vi-VN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>

            <span className="text-neutral-200">
              |
            </span>

            <span className="text-[12px] text-neutral-400">
              {reviewCount.toLocaleString(
                'vi-VN',
              )}{' '}
              đánh giá
            </span>
          </div>
        ) : null}

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
          disabled={
            !isVariableProduct &&
            isOutOfStock
          }
          aria-label={
            isVariableProduct
              ? `Chọn phân loại cho ${product.title}`
              : `Thêm ${product.title} vào giỏ hàng`
          }
          className="group/btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e10613] py-4 text-[14px] font-black text-white shadow-lg shadow-red-100 transition-all hover:bg-black hover:shadow-neutral-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {isVariableProduct ? (
            <Settings
              aria-hidden="true"
              size={19}
              className="transition-transform duration-300 group-hover/btn:rotate-90"
            />
          ) : (
            <ShoppingBag
              aria-hidden="true"
              size={19}
              className="transition-transform group-hover/btn:-rotate-12"
            />
          )}

          {isVariableProduct
            ? 'Chọn phân loại'
            : isOutOfStock
              ? 'Hết hàng'
              : isContactPrice
                ? 'Liên hệ'
                : added
                  ? 'Đã thêm vào giỏ'
                  : 'Thêm vào giỏ hàng'}
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