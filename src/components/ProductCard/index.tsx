'use client'

import {
  useState,
  type MouseEvent,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  ShoppingBag,
  Star,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  Media,
  Product,
} from '@/payload-types'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { cn } from '@/utilities'
import {
  useCartStore,
  useWishlistStore,
} from '@/lib/store'

type ProductVariant =
  NonNullable<Product['variants']>[number]

type MediaRelationship =
  | number
  | Media
  | null
  | undefined

export type ProductCardMode =
  | 'standard'
  | 'flash'
  | 'combo'
  | 'new'
  | 'bestSeller'

type ProductCardProps = Readonly<{
  product: Product

  /**
   * standard:
   * Card mặc định.
   *
   * flash:
   * Hiện phần trăm giảm giá, giá cũ và nút thêm giỏ.
   *
   * combo:
   * Hiện badge COMBO và mô tả thành phần combo.
   *
   * new:
   * Hiện badge MỚI.
   *
   * bestSeller:
   * Hiện thứ hạng và đánh giá.
   */
  mode?: ProductCardMode

  /**
   * Thứ hạng sản phẩm bán chạy.
   * Chỉ hiện số 1, 2 và 3.
   */
  rank?: number

  /**
   * Nội dung phụ dành cho combo.
   * Ví dụ: "Sữa rửa mặt + Toner + Serum".
   */
  description?: string

  /**
   * Ghi đè nội dung badge.
   */
  badgeText?: string

  /**
   * Ghi đè việc hiển thị đánh giá.
   */
  showRating?: boolean

  /**
   * Ghi đè việc hiển thị nút thêm giỏ.
   */
  showAddToCart?: boolean

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
    (variant) =>
      variant.isActive !== false,
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

function normalizeRating(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null
  }

  return Math.min(
    5,
    Math.max(0, value),
  )
}

function normalizeReviewCount(
  value: number | null | undefined,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(value),
  )
}

function formatReviewCount(
  count: number,
): string {
  if (count >= 1000) {
    const compactCount =
      count / 1000

    return `${compactCount.toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      },
    )}k`
  }

  return count.toLocaleString('vi-VN')
}

function getRankClassName(
  rank: number,
): string {
  switch (rank) {
    case 1:
      return 'bg-[#e95c0c] text-white'

    case 2:
      return 'bg-[#cfd0d2] text-white'

    case 3:
      return 'bg-[#f28b00] text-white'

    default:
      return ''
  }
}

export const ProductCard = ({
  product,
  mode = 'standard',
  rank,
  description,
  badgeText,
  showRating: showRatingProp,
  showAddToCart: showAddToCartProp,
  className,
}: ProductCardProps) => {
  const router = useRouter()

  const [added, setAdded] =
    useState(false)

  /*
   * ==========================================================
   * BIẾN THỂ
   * ==========================================================
   */

  const variants =
    getActiveVariants(product)

  const isVariableProduct =
    product.productType === 'variable' &&
    variants.length > 0

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

  /*
   * ==========================================================
   * GIÁ
   * ==========================================================
   */

  const basePrice =
    isVariableProduct
      ? Number(
        defaultVariant?.basePrice ?? 0,
      )
      : Number(
        product.price?.basePrice ?? 0,
      )

  const salePrice =
    isVariableProduct
      ? Number(
        defaultVariant?.salePrice ?? 0,
      )
      : Number(
        product.price?.salePrice ?? 0,
      )

  const isSale =
    basePrice > 0 &&
    salePrice > 0 &&
    salePrice < basePrice

  const discountPercent =
    isSale
      ? Math.round(
        ((basePrice - salePrice) /
          basePrice) *
        100,
      )
      : 0

  const finalPrice =
    isSale
      ? salePrice
      : basePrice

  const isContactPrice =
    finalPrice <= 0

  /*
   * ==========================================================
   * TỒN KHO
   * ==========================================================
   */

  const simpleStock = Number(
    product.price?.stock ?? 0,
  )

  const variableHasStock =
    variants.some(
      (variant) =>
        Number(variant.stock ?? 0) > 0,
    )

  const isOutOfStock =
    isVariableProduct
      ? !variableHasStock
      : simpleStock <= 0

  /*
   * ==========================================================
   * ẢNH
   * ==========================================================
   */

  const firstProductImage =
    product.images?.[0]?.image

  const displayMedia:
    MediaRelationship =
    defaultVariant?.image ??
    firstProductImage

  const productImage =
    getUploadUrl(displayMedia) ||
    '/placeholder.jpg'

  /*
   * ==========================================================
   * BRAND
   * ==========================================================
   */

  const brandName =
    product.brand &&
      typeof product.brand === 'object' &&
      product.brand.name
      ? product.brand.name
      : null

  /*
   * ==========================================================
   * ĐÁNH GIÁ
   * ==========================================================
   */

  const rating =
    normalizeRating(
      product.averageRating,
    )

  const reviewCount =
    normalizeReviewCount(
      product.reviewCount,
    )

  const hasRating =
    rating !== null &&
    rating > 0 &&
    reviewCount > 0

  /*
   * ==========================================================
   * CẤU HÌNH THEO MODE
   * ==========================================================
   */

  const showRating =
    showRatingProp ??
    (
      mode === 'bestSeller' ||
      mode === 'standard'
    )

  const showAddToCart =
    showAddToCartProp ??
    mode === 'flash'

  const showComboDescription =
    mode === 'combo' &&
    Boolean(description)

  const showBrand =
    mode !== 'combo'

  const shouldShowDiscountBadge =
    mode === 'flash' &&
    isSale

  const shouldShowNewBadge =
    mode === 'new'

  const shouldShowComboBadge =
    mode === 'combo'

  const shouldShowRankBadge =
    mode === 'bestSeller' &&
    typeof rank === 'number' &&
    rank >= 1 &&
    rank <= 3

  /*
   * ==========================================================
   * STORE
   * ==========================================================
   */

  const addItem =
    useCartStore(
      (state) => state.addItem,
    )

  const productId =
    String(product.id)

  const toggleWishlist =
    useWishlistStore(
      (state) =>
        state.toggleWishlist,
    )

  const hasWishlistHydrated =
    useWishlistStore(
      (state) =>
        state.hasHydrated,
    )

  const isWishlisted =
    useWishlistStore(
      (state) =>
        state.hasHydrated &&
        state.productIds.includes(
          productId,
        ),
    )

  /*
   * ==========================================================
   * WISHLIST
   * ==========================================================
   */

  const handleToggleWishlist = (
    event: MouseEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    if (!hasWishlistHydrated) {
      return
    }

    const hasBeenAdded =
      toggleWishlist(productId)

    toast.success(
      hasBeenAdded
        ? 'Đã thêm sản phẩm vào yêu thích'
        : 'Đã xóa sản phẩm khỏi yêu thích',
    )
  }

  /*
   * ==========================================================
   * THÊM GIỎ
   * ==========================================================
   */

  const handleAddToCart = (
    event: MouseEvent<HTMLButtonElement>,
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    if (isOutOfStock) {
      toast.error(
        'Sản phẩm hiện đã hết hàng',
      )

      return
    }

    /*
     * Sản phẩm có biến thể:
     * Chuyển sang trang chi tiết để khách chọn.
     */
    if (isVariableProduct) {
      router.push(
        `/products/${product.slug}`,
      )

      return
    }

    if (isContactPrice) {
      window.location.href =
        'https://zalo.me/2731577726641619342'

      return
    }

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

      sku:
        product.sku ??
        undefined,

      stock: simpleStock,

      variants: [],
    })

    setAdded(true)

    toast.success(
      'Đã thêm vào giỏ hàng',
    )

    window.setTimeout(() => {
      setAdded(false)
    }, 1200)
  }

  return (
    <article
      className={cn(
        /*
         * Không dùng rounded-[32px].
         * Ảnh mẫu chỉ bo khoảng 18–22px.
         */
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#e6e6e6] bg-white font-sans',

        /*
         * Hover nhẹ, không nhấc card quá cao.
         */
        'transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#d8d8d8] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]',

        className,
      )}
    >
      {/* =====================================================
          IMAGE AREA
      ====================================================== */}
      <div className="relative aspect-[1/1] w-full overflow-hidden bg-white">
        {/* FLASH SALE BADGE */}
        {shouldShowDiscountBadge ? (
          <span className="absolute left-4 top-4 z-20 flex min-h-8 items-center justify-center rounded-[8px] bg-[#c40008] px-3 text-[13px] font-bold tabular-nums text-white shadow-[0_4px_12px_rgba(196,0,8,0.2)]">
            -{discountPercent}%
          </span>
        ) : null}

        {/* NEW BADGE */}
        {shouldShowNewBadge ? (
          <span className="absolute left-4 top-4 z-20 flex min-h-8 items-center justify-center rounded-[8px] bg-[#c40008] px-3 text-[13px] font-bold uppercase text-white shadow-[0_4px_12px_rgba(196,0,8,0.2)]">
            {badgeText ?? 'Mới'}
          </span>
        ) : null}

        {/* COMBO BADGE */}
        {shouldShowComboBadge ? (
          <span className="absolute left-4 top-4 z-20 flex min-h-8 items-center justify-center rounded-[8px] bg-[#c40008] px-3 text-[12px] font-bold uppercase text-white shadow-[0_4px_12px_rgba(196,0,8,0.2)]">
            {badgeText ?? 'Combo'}
          </span>
        ) : null}

        {/* BEST SELLER RANK */}
        {shouldShowRankBadge ? (
          <span
            className={cn(
              'absolute left-4 top-4 z-20 flex h-12 min-w-12 items-center justify-center rounded-[11px] px-3 text-[20px] font-bold shadow-sm',
              getRankClassName(rank),
            )}
          >
            {rank}
          </span>
        ) : null}

        {/* WISHLIST */}
        <button
          type="button"
          onClick={
            handleToggleWishlist
          }
          disabled={
            !hasWishlistHydrated
          }
          aria-pressed={
            isWishlisted
          }
          aria-label={
            isWishlisted
              ? `Xóa ${product.title} khỏi yêu thích`
              : `Thêm ${product.title} vào yêu thích`
          }
          className={cn(
            'absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#989898] transition-all duration-200',
            'hover:bg-[#fff3f3] hover:text-[#b40008]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b40008] focus-visible:ring-offset-2',
            isWishlisted &&
            'bg-[#fff0f0] text-[#b40008]',
          )}
        >
          <Heart
            aria-hidden="true"
            size={24}
            strokeWidth={1.8}
            fill={
              isWishlisted
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        {/* OUT OF STOCK */}
        {isOutOfStock ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              Hết hàng
            </span>
          </div>
        ) : null}

        {/* PRODUCT IMAGE */}
        <Link
          href={`/products/${product.slug}`}
          className="relative flex h-full w-full items-center justify-center p-3 sm:p-4"
          aria-label={product.title}
        >
          <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
            <OptimizedImage
              media={displayMedia}
              size="card"
              alt={product.title}
              className="h-full w-full [&_img]:object-contain"
            />
          </div>
        </Link>
      </div>

      {/* =====================================================
          CONTENT AREA
      ====================================================== */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        {/* BRAND */}
        {showBrand &&
          brandName ? (
          <p className="mb-1 line-clamp-1 text-[13px] font-bold leading-5 text-[#222222] sm:text-[14px]">
            {brandName}
          </p>
        ) : null}

        {/* PRODUCT TITLE */}
        <Link
          href={`/products/${product.slug}`}
          className="block"
        >
          <h3
            className={cn(
              'text-[#252525] transition-colors hover:text-[#b40008]',

              mode === 'combo'
                ? 'line-clamp-1 min-h-[24px] text-[14px] font-bold leading-6 sm:text-[15px]'
                : 'line-clamp-2 min-h-[46px] text-[13px] font-normal leading-[1.55] sm:text-[14px]',
            )}
          >
            {product.title}
          </h3>
        </Link>

        {/* COMBO DESCRIPTION */}
        {showComboDescription ? (
          <p className="mt-1 line-clamp-2 min-h-[44px] text-[13px] font-normal leading-[1.55] text-[#555555] sm:text-[14px]">
            {description}
          </p>
        ) : null}

        {/* RATING */}
        {showRating ? (
          <div className="mt-2 flex min-h-6 items-center gap-1.5">
            {hasRating ? (
              <>
                <Star
                  aria-hidden="true"
                  size={17}
                  strokeWidth={1.5}
                  fill="#ff9900"
                  className="shrink-0 text-[#ff9900]"
                />

                <span className="text-[12px] font-medium tabular-nums text-[#646464] sm:text-[13px]">
                  {rating.toLocaleString(
                    'vi-VN',
                    {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    },
                  )}
                </span>

                <span className="text-[12px] text-[#777777] sm:text-[13px]">
                  (
                  {formatReviewCount(
                    reviewCount,
                  )}
                  )
                </span>
              </>
            ) : (
              <span className="text-[12px] text-[#a0a0a0]">
                Chưa có đánh giá
              </span>
            )}
          </div>
        ) : null}

        {/* Đẩy giá xuống đáy card */}
        <div className="mt-auto pt-4">
          {mode === 'flash' && isSale ? (
            <div className="flex min-h-[48px] flex-col justify-end">
              {/* Giá niêm yết cũ */}
              <span className="text-[12px] font-normal leading-none tabular-nums text-[#999999] line-through sm:text-[13px]">
                {formatPrice(basePrice)}đ
              </span>

              {/* Giá bán hiện tại */}
              <span className="mt-2 text-[16px] font-bold leading-none tabular-nums text-[#c40008] sm:text-[17px]">
                {formatPrice(salePrice)}đ
              </span>
            </div>
          ) : (
            <div className="flex min-h-[48px] flex-col justify-end">
              {/* Dòng giữ chỗ để các card bằng nhau */}
              <span
                aria-hidden="true"
                className="invisible text-[12px] leading-none"
              >
                Giá niêm yết
              </span>

              <span className="mt-2 block text-[17px] font-bold leading-none tabular-nums text-[#c40008] sm:text-[18px]">
                {isContactPrice
                  ? 'Liên hệ'
                  : `${formatPrice(finalPrice)}đ`}
              </span>
            </div>
          )}

          {/* Nút thêm vào giỏ giữ nguyên */}
          {showAddToCart ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              aria-label={
                isVariableProduct
                  ? `Chọn phân loại cho ${product.title}`
                  : isOutOfStock
                    ? `${product.title} đã hết hàng`
                    : isContactPrice
                      ? `Liên hệ mua ${product.title}`
                      : `Thêm ${product.title} vào giỏ hàng`
              }
              className={cn(
                'mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#eed4d4] bg-white px-3 text-[14px] font-bold text-[#b40008]',
                'transition-colors duration-200 hover:border-[#b40008] hover:bg-[#b40008] hover:text-white',
                'disabled:cursor-not-allowed disabled:border-[#e5e5e5] disabled:bg-[#f5f5f5] disabled:text-[#aaaaaa]',
              )}
            >
              {isVariableProduct ? (
                <Settings
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                />
              ) : (
                <ShoppingBag
                  aria-hidden="true"
                  size={18}
                  strokeWidth={2}
                />
              )}

              <span>
                {isVariableProduct
                  ? 'Chọn phân loại'
                  : isOutOfStock
                    ? 'Hết hàng'
                    : isContactPrice
                      ? 'Liên hệ'
                      : added
                        ? 'Đã thêm vào giỏ'
                        : 'Thêm vào giỏ'}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}