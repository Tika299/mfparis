import Link from 'next/link'
import { Star } from 'lucide-react'

import type {
  Brand,
  Media,
  Product,
} from '@/payload-types'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'
import { cn } from '@/utilities'
import { ProductCardActions } from './ProductCardActions'

type ProductVariant =
  NonNullable<Product['variants']>[number]

type MediaRelationship =
  | number
  | Media
  | null
  | undefined

export type ProductCardProduct = Readonly<{
  id: number
  title: string
  slug: string
  sku?: string | null
  brand?: number | Brand | null
  price?: {
    basePrice: number
    salePrice?: number | null
    stock?: number | null
  } | null
  images?: Product['images']
  averageRating?: number | null
  reviewCount?: number | null
  status?: Product['status']
  productType?: Product['productType'] | null
  variants?: Product['variants']
}>

export type ProductCardMode =
  | 'standard'
  | 'flash'
  | 'combo'
  | 'new'
  | 'bestSeller'

type ProductCardProps = Readonly<{
  product: ProductCardProduct
  mode?: ProductCardMode
  rank?: number
  description?: string
  badgeText?: string
  showRating?: boolean
  showAddToCart?: boolean
  className?: string
}>

function getActiveVariants(
  product: ProductCardProduct,
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

  const firstProductImage =
    product.images?.[0]?.image

  const displayMedia:
    MediaRelationship =
    defaultVariant?.image ??
    firstProductImage

  const productImage =
    getUploadUrl(displayMedia) ||
    '/placeholder.jpg'

  const brandName =
    product.brand &&
      typeof product.brand === 'object' &&
      product.brand.name
      ? product.brand.name
      : null

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

  const showRating =
    showRatingProp ??
    (
      mode === 'bestSeller' ||
      mode === 'standard' ||
      mode === 'flash'
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

  const isFlashMode =
    mode === 'flash'

  const productCardSizes =
    '(min-width: 1536px) 23vw, (min-width: 1280px) 23vw, (min-width: 768px) 31vw, 48vw'

  return (
    <article
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#e6e6e6] bg-white font-sans sm:rounded-[16px] lg:rounded-[20px]',
        'transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#d8d8d8] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <div className="relative aspect-[1/1] w-full overflow-hidden bg-white">
        {shouldShowDiscountBadge ? (
          <span className="absolute left-2 top-2 z-20 flex min-h-7 items-center justify-center rounded-[7px] bg-[#c40008] px-2 text-[10px] font-bold uppercase text-white shadow-sm sm:left-2.5 sm:top-2.5 sm:text-[11px] lg:left-4 lg:top-4 lg:min-h-8 lg:px-3 lg:text-[12px]">
            -{discountPercent}%
          </span>
        ) : null}

        {shouldShowNewBadge ? (
          <span className="absolute left-2 top-2 z-20 flex min-h-7 items-center justify-center rounded-[7px] bg-[#c40008] px-2 text-[10px] font-bold uppercase text-white shadow-sm sm:left-2.5 sm:top-2.5 sm:text-[11px] lg:left-4 lg:top-4 lg:min-h-8 lg:px-3 lg:text-[12px]">
            {badgeText ?? 'Mới'}
          </span>
        ) : null}

        {shouldShowComboBadge ? (
          <span className="absolute left-2 top-2 z-20 flex min-h-7 items-center justify-center rounded-[7px] bg-[#c40008] px-2 text-[10px] font-bold uppercase text-white shadow-sm sm:left-2.5 sm:top-2.5 sm:text-[11px] lg:left-4 lg:top-4 lg:min-h-8 lg:px-3 lg:text-[12px]">
            {badgeText ?? 'Combo'}
          </span>
        ) : null}

        {shouldShowRankBadge ? (
          <span
            className={cn(
              'absolute left-2 top-2 z-20 flex h-9 min-w-9 items-center justify-center rounded-[9px] px-2 text-[15px] font-bold shadow-sm sm:left-2.5 sm:top-2.5 sm:h-10 sm:min-w-10 sm:text-[17px] lg:left-4 lg:top-4 lg:h-12 lg:min-w-12 lg:text-[20px]',
              getRankClassName(rank),
            )}
          >
            {rank}
          </span>
        ) : null}

        <ProductCardActions
          action="wishlist"
          productId={String(product.id)}
          productTitle={product.title}
        />

        {isOutOfStock ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              Hết hàng
            </span>
          </div>
        ) : null}

        <Link
          href={`/products/${product.slug}`}
          className={cn(
            'relative flex h-full w-full items-center justify-center',
            isFlashMode
              ? 'p-1.5 sm:p-2 md:p-2.5 lg:p-4'
              : 'p-2 sm:p-2.5 md:p-3 lg:p-4',
          )}
          aria-label={product.title}
        >
          <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-[1.04]">
            <OptimizedImage
              media={displayMedia}
              size="card"
              alt={product.title}
              sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33.33vw, 33.33vw"
              className="h-full w-full [&_img]:object-contain"
            />
          </div>
        </Link>
      </div>

      <div
        className={cn(
          'flex flex-1 flex-col',
          isFlashMode
            ? 'px-2 pb-2.5 sm:px-2.5 sm:pb-3 md:px-3 lg:px-4 lg:pb-4'
            : 'px-2.5 pb-3 sm:px-3 sm:pb-3.5 md:px-3.5 lg:px-4 lg:pb-4',
        )}
      >
        {showBrand &&
          brandName ? (
          <p className="mb-0.5 line-clamp-1 text-[10px] font-bold leading-4 text-[#222222] sm:text-[11px] md:text-[12px] lg:mb-1 lg:text-[14px]">
            {brandName}
          </p>
        ) : null}

        <Link
          href={`/products/${product.slug}`}
          className="block"
        >
          <h3
            className={cn(
              'text-[#252525] transition-colors hover:text-[#b40008]',
              mode === 'combo'
                ? 'line-clamp-2 min-h-[38px] text-[12px] font-bold leading-[1.5] sm:min-h-[40px] sm:text-[12px] md:min-h-[42px] md:text-[13px] lg:min-h-[46px] lg:text-[15px]'
                : isFlashMode
                  ? 'line-clamp-2 min-h-[34px] text-[11px] font-normal leading-[1.42] sm:min-h-[36px] sm:text-[11px] md:min-h-[38px] md:text-[12px] lg:min-h-[46px] lg:text-[14px]'
                  : 'line-clamp-2 min-h-[38px] text-[12px] font-normal leading-[1.5] sm:min-h-[40px] sm:text-[12px] md:min-h-[42px] md:text-[13px] lg:min-h-[46px] lg:text-[14px]',
            )}
          >
            {product.title}
          </h3>
        </Link>

        {showComboDescription ? (
          <p className="mt-1 line-clamp-2 min-h-[36px] text-[10px] font-normal leading-[1.55] text-[#666666] sm:min-h-[38px] sm:text-[11px] md:min-h-[40px] md:text-[12px] lg:min-h-[44px] lg:text-[13px]">
            {description}
          </p>
        ) : null}

        {showRating ? (
          <div
            className={cn(
              'flex items-center gap-1',
              isFlashMode
                ? 'mt-1 min-h-4 sm:mt-1.5 sm:min-h-5'
                : 'mt-1.5 min-h-5 sm:mt-2 sm:min-h-6',
            )}
          >
            {hasRating ? (
              <>
                <Star
                  aria-hidden="true"
                  size={14}
                  strokeWidth={1.5}
                  fill="#ff9900"
                  className="shrink-0 text-[#ff9900] sm:h-4 sm:w-4 lg:h-[17px] lg:w-[17px]"
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

                <span className="text-[10px] font-medium tabular-nums text-[#646464] sm:text-[11px] md:text-[12px] lg:text-[13px]">
                  ({formatReviewCount(reviewCount)})
                </span>
              </>
            ) : (
              <span className="text-[12px] text-[#a0a0a0]">
                Chưa có đánh giá
              </span>
            )}
          </div>
        ) : null}

        <div
          className={cn(
            'mt-auto',
            isFlashMode
              ? 'pt-2.5 sm:pt-3'
              : 'pt-4',
          )}
        >
          {mode === 'flash' && isSale ? (
            <div
              className={cn(
                'flex flex-col justify-end',
                isFlashMode
                  ? 'min-h-[40px] sm:min-h-[42px] lg:min-h-[48px]'
                  : 'min-h-[48px]',
              )}
            >
              <span className="text-[9px] font-normal leading-none tabular-nums text-[#999999] line-through sm:text-[10px] lg:text-[13px]">
                {formatPrice(basePrice)}đ
              </span>

              <span className="mt-1 text-[13px] font-bold leading-none tabular-nums text-[#c40008] sm:text-[14px] md:text-[15px] lg:mt-2 lg:text-[17px]">
                {formatPrice(salePrice)}đ
              </span>
            </div>
          ) : (
            <div className="flex min-h-[48px] flex-col justify-end">
              <span
                aria-hidden="true"
                className="invisible text-[12px] leading-none"
              >
                Giá niêm yết
              </span>

              <span className="block text-[14px] font-bold leading-none tabular-nums text-[#c40008] sm:text-[15px] md:text-[16px] lg:text-[18px]">
                {isContactPrice
                  ? 'Liên hệ'
                  : `${formatPrice(finalPrice)}đ`}
              </span>
            </div>
          )}

          {showAddToCart ? (
            <ProductCardActions
              action="addToCart"
              mode={mode}
              productId={String(product.id)}
              slug={product.slug}
              productTitle={product.title}
              productImage={productImage}
              finalPrice={finalPrice}
              simpleStock={simpleStock}
              sku={product.sku ?? undefined}
              isVariableProduct={isVariableProduct}
              isOutOfStock={isOutOfStock}
              isContactPrice={isContactPrice}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}