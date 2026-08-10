'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/utilities/formatPrice'
import { useCartStore } from '@/lib/store'

type ProductPurchaseProps = {
  product: any
}

const PRODUCT_VARIANT_SELECTED_EVENT = 'mfparis:product-variant-selected'

const getActiveVariants = (product: any) => {
  if (product?.productType !== 'variable') return []

  return Array.isArray(product?.variants)
    ? product.variants.filter((variant: any) => variant?.isActive !== false)
    : []
}

const getUploadUrl = (upload: any) => {
  if (!upload) return ''

  if (typeof upload === 'string') return upload

  if (typeof upload === 'object' && upload.url) return upload.url

  return ''
}

const getProductImage = (product: any, selectedVariant?: any) => {
  const variantImage = getUploadUrl(selectedVariant?.image)

  if (variantImage) return variantImage

  const firstProductImage = product?.images?.[0]?.image
  const productImage = getUploadUrl(firstProductImage)

  return productImage
}

const dispatchVariantSelected = (variant: any) => {
  if (typeof window === 'undefined' || !variant?.id) return

  window.dispatchEvent(
    new CustomEvent(PRODUCT_VARIANT_SELECTED_EVENT, {
      detail: { variantId: String(variant.id) },
    }),
  )
}

export function ProductPurchase({ product }: ProductPurchaseProps) {
  const router = useRouter()
  const addItem = useCartStore((state: any) => state.addItem)

  const variants = useMemo(() => getActiveVariants(product), [product])

  const defaultVariant =
    variants.find((variant: any) => variant?.isDefault) || variants[0]

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    defaultVariant?.id,
  )

  const [quantity, setQuantity] = useState(1)

  const isVariableProduct =
    product?.productType === 'variable' && variants.length > 0

  const selectedVariant =
    variants.find((variant: any) => variant.id === selectedVariantId) ||
    defaultVariant

  const basePrice = isVariableProduct
    ? Number(selectedVariant?.basePrice || 0)
    : Number(product?.price?.basePrice || 0)

  const salePrice = isVariableProduct
    ? Number(selectedVariant?.salePrice || 0)
    : Number(product?.price?.salePrice || 0)

  const finalPrice = salePrice > 0 ? salePrice : basePrice
  const isContactPrice = finalPrice <= 0

  const stock = isVariableProduct
    ? Number(selectedVariant?.stock || 0)
    : Number(product?.price?.stock || 0)

  const sku = isVariableProduct
    ? selectedVariant?.sku || product?.sku
    : product?.sku

  const image = getProductImage(product, selectedVariant)

  const discountPercent =
    salePrice > 0 && basePrice > salePrice
      ? Math.round(((basePrice - salePrice) / basePrice) * 100)
      : 0

  const isOutOfStock = stock <= 0

  useEffect(() => {
    if (isVariableProduct && selectedVariant?.id) {
      dispatchVariantSelected(selectedVariant)
    }
  }, [isVariableProduct, selectedVariant])

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1))
  }

  const increaseQuantity = () => {
    setQuantity((current) => {
      if (stock > 0) return Math.min(stock, current + 1)

      return current + 1
    })
  }

  const buildCartItem = () => ({
    id: isVariableProduct
      ? `${product.id}-${selectedVariant?.id}`
      : product.id,

    productId: product.id,
    variantId: selectedVariant?.id,
    variantName: selectedVariant?.name,

    baseTitle: product.title,
    title: selectedVariant?.name
      ? `${product.title} - ${selectedVariant.name}`
      : product.title,

    price: finalPrice,
    image,
    slug: product.slug,
    quantity,
    sku,

    stock,

    variants: variants.map((variant: any) => {
      const variantBasePrice = Number(variant?.basePrice || 0)
      const variantSalePrice = Number(variant?.salePrice || 0)
      const variantImage = getProductImage(product, variant)

      return {
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        basePrice: variantBasePrice,
        salePrice: variantSalePrice,
        price: variantSalePrice > 0 ? variantSalePrice : variantBasePrice,
        stock: Number(variant?.stock || 0),
        image: variantImage,
      }
    }),
  } as any)

  const handleAddToCart = () => {
    if (isOutOfStock) return

    if (isContactPrice) {
      window.location.href = 'https://zalo.me/2731577726641619342'
      return
    }

    const cartItem = buildCartItem()

    addItem(cartItem)
    toast.success('Đã thêm vào giỏ hàng', {
      description: cartItem.title,
    })
  }

  const handleBuyNow = () => {
    if (isOutOfStock) return

    if (isContactPrice) {
      window.location.href = 'https://zalo.me/2731577726641619342'
      return
    }

    const buyNowItem = buildCartItem()

    window.localStorage.setItem(
      'mf-paris-checkout-items',
      JSON.stringify([buyNowItem]),
    )

    toast.success('Đang chuyển đến thanh toán', {
      description: buyNowItem.title,
    })
    router.push('/checkout?mode=single')
  }

  const handleFundiinCheckout = () => {
    if (isOutOfStock) return

    if (isContactPrice) {
      window.location.href = 'https://zalo.me/2731577726641619342'
      return
    }

    const fundiinItem = buildCartItem()

    window.localStorage.setItem(
      'mf-paris-fundiin-checkout-item',
      JSON.stringify(fundiinItem),
    )

    window.localStorage.setItem(
      'mf-paris-checkout-items',
      JSON.stringify([fundiinItem]),
    )

    const params = new URLSearchParams({
      product_id: String(product.id),
      quantity: String(quantity),
    })

    if (selectedVariant?.id) {
      params.set('variant_id', String(selectedVariant.id))
    }

    if (selectedVariant?.wpVariationId) {
      params.set('variation_id', String(selectedVariant.wpVariationId))
    }

    toast.success('Đang mở bảng tính trả góp Fundiin', {
      description: fundiinItem.title,
    })
    router.push(`/tra-gop?${params.toString()}`)
  }

  return (
    <div className="space-y-5">
      {/* Giá */}
      <div className="rounded-2xl bg-[#F8F9FB] p-6">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-2xl font-black text-[#b72828] md:text-3xl">
            {isContactPrice ? 'Liên hệ' : `${formatPrice(finalPrice)}₫`}
          </span>

          {salePrice > 0 && basePrice > salePrice && (
            <span className="pb-1 text-lg text-gray-400 line-through">
              {formatPrice(basePrice)}₫
            </span>
          )}
        </div>

        {discountPercent > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ffebeb] px-4 py-1.5 text-xs font-bold text-[#b72828]">
            <CheckCircle2 size={14} />
            Tiết kiệm {discountPercent}%
          </div>
        )}
      </div>

      {/* Biến thể */}
      {isVariableProduct && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-wider text-gray-900">
              Chọn phân loại
            </p>

            {selectedVariant?.name && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#b72828]">
                {selectedVariant.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((variant: any) => {
              const variantSalePrice = Number(variant?.salePrice || 0)
              const variantBasePrice = Number(variant?.basePrice || 0)
              const variantFinalPrice =
                variantSalePrice > 0 ? variantSalePrice : variantBasePrice

              const variantStock = Number(variant?.stock || 0)
              const variantOutOfStock = variantStock <= 0
              const isSelected = selectedVariant?.id === variant.id

              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={variantOutOfStock}
                  onClick={() => {
                    setSelectedVariantId(variant.id)
                    setQuantity(1)
                  }}
                  className={
                    isSelected
                      ? 'relative rounded-2xl border-2 border-[#b72828] bg-[#fff5f5] px-3 py-3 text-left shadow-sm'
                      : variantOutOfStock
                        ? 'cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-left opacity-50'
                        : 'rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left transition hover:border-[#b72828] hover:bg-[#fffafa]'
                  }
                >
                  {isSelected && (
                    <CheckCircle2
                      size={16}
                      className="absolute right-2 top-2 text-[#b72828]"
                    />
                  )}

                  <p className="pr-5 text-sm font-bold text-gray-900">
                    {variant.name}
                  </p>

                  <p className="mt-1 text-xs font-black text-[#b72828]">
                    {variantFinalPrice <= 0 ? 'Liên hệ' : `${formatPrice(variantFinalPrice)}₫`}
                  </p>

                  <p className="mt-1 text-[11px] text-gray-500">
                    {variantOutOfStock
                      ? 'Hết hàng'
                      : ''}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Số lượng */}
      <div>
        <p className="mb-3 text-sm font-black uppercase tracking-wider text-gray-900">
          Số lượng
        </p>

        <div className="inline-flex h-12 items-center overflow-hidden rounded-full border border-gray-200 bg-white">
          <button
            type="button"
            onClick={decreaseQuantity}
            className="flex h-full w-12 items-center justify-center text-gray-700 transition hover:bg-gray-100"
          >
            <Minus size={16} />
          </button>

          <div className="flex h-full min-w-12 items-center justify-center border-x border-gray-200 px-4 text-sm font-black text-gray-900">
            {quantity}
          </div>

          <button
            type="button"
            onClick={increaseQuantity}
            disabled={stock > 0 && quantity >= stock}
            className="flex h-full w-12 items-center justify-center text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Nút mua */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={isContactPrice ? 'Liên hệ tư vấn' : ''}
            title={isContactPrice ? 'Liên hệ tư vấn' : ''}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-[#b72828] bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-[#b72828] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
          >
            <ShoppingCart aria-hidden="true" size={24} />
            <span>{isContactPrice ? 'Liên hệ tư vấn' : ''}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            aria-label={isContactPrice ? 'Liên hệ tư vấn' : 'Mua ngay'}
            title={isContactPrice ? 'Liên hệ tư vấn' : 'Mua ngay'}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#b72828] px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShoppingBag aria-hidden="true" size={19} />
            <span>{isContactPrice ? 'Liên hệ tư vấn' : 'Mua ngay'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleFundiinCheckout}
          disabled={isOutOfStock || isContactPrice}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#00AEEF] px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <WalletCards aria-hidden="true" size={20} />
          <span>Trả góp qua Fundiin</span>
        </button>
      </div>

      {isOutOfStock && (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-500">
          Sản phẩm hiện đang hết hàng. Vui lòng chọn phân loại khác hoặc liên hệ shop để được tư vấn.
        </p>
      )}
    </div>
  )
}
