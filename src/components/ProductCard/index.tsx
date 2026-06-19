'use client'

import {
  useState,
  type MouseEvent,
} from 'react'
import type {
  Media,
  Product,
} from '@/payload-types'
import Link from 'next/link'
import { ShoppingBag, Settings, Heart, Gift, ChevronRight, Star } from 'lucide-react'
import { toast } from 'sonner'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { cn } from '@/utilities'
import {
  useCartStore,
  useWishlistStore,
} from '@/lib/store'
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

  const wishlistProductId = String(
    product.id,
  )

  const toggleWishlist =
    useWishlistStore(
      (state) => state.toggleWishlist,
    )

  const hasWishlistHydrated =
    useWishlistStore(
      (state) => state.hasHydrated,
    )

  const isWishlisted = useWishlistStore(
    (state) =>
      state.hasHydrated &&
      state.productIds.includes(
        wishlistProductId,
      ),
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

  const handleToggleWishlist = (
    event: MouseEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    if (!hasWishlistHydrated) {
      return
    }

    const hasBeenAdded =
      toggleWishlist(wishlistProductId)

    if (hasBeenAdded) {
      toast.success(
        'Đã thêm sản phẩm vào danh sách yêu thích',
      )

      return
    }

    toast.success(
      'Đã xóa sản phẩm khỏi danh sách yêu thích',
    )
  }

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
        'font-sans group relative flex h-full flex-col overflow-hidden rounded-[32px] bg-white p-1 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]',
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
            <span className="flex h-8 items-center justify-center rounded-full bg-[#e10613] px-3 text-[12px] font-extrabol sm:text-[13px] tracking-[-0.01em] tabular-nums text-white shadow-lg shadow-red-200">
              -{discountPercent}%
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px] text-white">
              Hết hàng
            </span>
          </div>
        )}

        {/* Nút Yêu thích */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          disabled={!hasWishlistHydrated}
          aria-pressed={isWishlisted}
          aria-label={
            isWishlisted
              ? `Xóa ${product.title} khỏi danh sách yêu thích`
              : `Thêm ${product.title} vào danh sách yêu thích`
          }
          title={
            isWishlisted
              ? 'Xóa khỏi yêu thích'
              : 'Thêm vào yêu thích'
          }
          className={cn(
            'absolute right-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
            isWishlisted
              ? 'scale-105 bg-red-50 text-[#B72828] shadow-sm ring-1 ring-[#B72828]/15'
              : 'bg-white/80 text-neutral-400 hover:scale-105 hover:bg-red-50 hover:text-[#B72828]',
          )}
        >
          <Heart
            aria-hidden="true"
            size={20}
            strokeWidth={2}
            fill={
              isWishlisted
                ? 'currentColor'
                : 'none'
            }
            className="transition-all duration-200"
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
        {product.brand && typeof product.brand === 'object' && product.brand.name
          ? (<p className="mb-1.5 text-[10px] font-bold uppercase leading-4 tracking-[0.14em] sm:text-[11px] text-[#b38756]"> {product.brand.name} </p>)
          : null
        }

        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[44px] text-[14px] font-semibold leading-[1.5] tracking-[-0.012em] text-neutral-900 transition sm:text-[15px] lg:text-[16px] hover:text-[#e10613]">
            {product.title}
          </h3>
        </Link>

        {/* Giá tiền */}
        <div className="mt-1 flex min-h-[54px] flex-col justify-end">
          {isSale ? (
            <>
              {/* Giá gốc */}
              <span className="text-[11px] font-normal tabular-nums leading-none text-neutral-400 line-through sm:text-[12px]">
                {formatPrice(basePrice)}đ
              </span>

              {/* Giá khuyến mãi */}
              <span className="mt-1.5 text-[17px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-[#e10613] sm:text-[19px] lg:text-[20px]">
                {formatPrice(salePrice)}đ
              </span>
            </>
          ) : (
            <>
              {/*
       * Phần tử giữ chỗ giúp chiều cao khu vực giá
       * đồng nhất với sản phẩm đang giảm giá.
       */}
              <span
                aria-hidden="true"
                className="invisible text-[12px] leading-none sm:text-[13px]"
              >
                Giá gốc
              </span>

              <span className="mt-1.5 text-[17px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-[#e10613] sm:text-[19px] lg:text-[20px]">
                {isContactPrice
                  ? 'Liên hệ'
                  : `${formatPrice(basePrice)}đ`}
              </span>
            </>
          )}
        </div>

        {/* Đánh giá - luôn hiển thị để các card đồng đều chiều cao */}
        <div className="mt-3 flex min-h-[37px] items-center gap-1 border-b border-neutral-100 pb-3">
          {shouldShowRating ? (
            <>
              <RatingStars rating={rating} />

              <span className="ml-1 text-[11px] font-semibold tabular-nums text-neutral-800 sm:text-[12px]">
                {rating.toLocaleString('vi-VN', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>

              <span
                aria-hidden="true"
                className="text-neutral-200"
              >
                |
              </span>

              <span className="truncate text-[10px] font-normal text-neutral-400 sm:text-[11px]">
                {reviewCount.toLocaleString('vi-VN')} đánh giá
              </span>
            </>
          ) : (
            <>
              <RatingStars rating={0} />

              <span className="ml-1 truncate text-[10px] font-normal text-neutral-400 sm:text-[11px]">
                Chưa có đánh giá
              </span>
            </>
          )}
        </div>

        {/* Quà tặng/Voucher */}
        <Link
          href="/vouchers"
          aria-label={`Xem voucher áp dụng cho ${product.title}`}
          className="mt-3 flex min-h-11 w-full items-center justify-between rounded-2xl bg-[#f5f9ff] px-3 py-2.5 text-[#1f5fe0] transition-colors hover:bg-[#ebf3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5fe0] focus-visible:ring-offset-2 sm:px-4 sm:py-3"
        >
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold leading-5 tracking-[-0.005em] sm:text-[12px]">
            <Gift
              aria-hidden="true"
              size={18}
              className="shrink-0"
            />

            <span className="truncate">
              Tặng quà/Voucher
            </span>
          </span>

          <ChevronRight
            aria-hidden="true"
            size={16}
            className="shrink-0"
          />
        </Link>

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
              : isOutOfStock
                ? `${product.title} hiện đã hết hàng`
                : isContactPrice
                  ? `Liên hệ mua ${product.title}`
                  : `Thêm ${product.title} vào giỏ hàng`
          }
          title={
            isVariableProduct
              ? 'Chọn phân loại'
              : isOutOfStock
                ? 'Hết hàng'
                : isContactPrice
                  ? 'Liên hệ'
                  : 'Thêm vào giỏ hàng'
          }
          className="group/btn mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#e10613] px-3 py-3 text-white shadow-lg shadow-red-100 transition-all hover:bg-black hover:shadow-neutral-200 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:min-h-12 sm:py-3.5"
        >
          {isVariableProduct ? (
            <Settings
              aria-hidden="true"
              size={20}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover/btn:rotate-90"
            />
          ) : (
            <ShoppingBag
              aria-hidden="true"
              size={20}
              strokeWidth={2}
              className="transition-transform group-hover/btn:-rotate-12"
            />
          )}

          {/* Mobile ẩn chữ, từ sm trở lên mới hiển thị */}
          <span className="hidden text-[13px] font-bold leading-5 tracking-[0.01em] sm:inline lg:text-[14px]">
            {isVariableProduct
              ? 'Chọn phân loại'
              : isOutOfStock
                ? 'Hết hàng'
                : isContactPrice
                  ? 'Liên hệ'
                  : added
                    ? 'Đã thêm vào giỏ'
                    : 'Thêm vào giỏ hàng'}
          </span>
        </button>
      </div>
    </article>
  )
}