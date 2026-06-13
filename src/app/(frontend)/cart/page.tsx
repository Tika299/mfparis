'use client'

import { useEffect, useState, useRef } from 'react'
import { useCartStore } from '@/lib/store'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Minus } from 'lucide-react'
import Image from 'next/image'

const formatMoney = (value: number) => {
  return Number(value || 0).toLocaleString('vi-VN')
}

const getVariantPrice = (variant: any) => {
  const salePrice = Number(variant?.salePrice || 0)
  const basePrice = Number(variant?.basePrice || variant?.price || 0)

  return salePrice > 0 ? salePrice : basePrice
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, changeVariant, syncItems } = useCartStore() as any
  const [checkingStock, setCheckingStock] = useState(false)

  const totalPrice = items.reduce(
    (total: number, item: any) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  )

  const hasValidatedCartRef = useRef(false)

  useEffect(() => {
    if (!items.length) return
    if (hasValidatedCartRef.current) return

    hasValidatedCartRef.current = true

    const refreshCartStock = async () => {
      try {
        setCheckingStock(true)

        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            items: items.map((item: any) => ({
              id: item.id,
              productId: item.productId || item.id,
              variantId: item.variantId || null,
              quantity: item.quantity,
              price: item.price,
              title: item.title,
              image: item.image,
              slug: item.slug,
              sku: item.sku,
              variantName: item.variantName,
              baseTitle: item.baseTitle,
              variants: item.variants || [],
            })),
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || 'Không thể kiểm tra tồn kho')
        }

        if (Array.isArray(data.items)) {
          syncItems(data.items)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setCheckingStock(false)
      }
    }

    refreshCartStock()
  }, [items.length, syncItems])

  useEffect(() => {
    const refreshOnFocus = () => {
      hasValidatedCartRef.current = false
    }

    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [])

  const invalidItems = items.filter((item: any) => {
    const stock = Number(item.stock || 0)
    const quantity = Number(item.quantity || 0)
    const price = Number(item.price || 0)

    return (
      item.isAvailable === false ||
      item.isOutOfStock === true ||
      item.isContactPrice === true ||
      stock <= 0 ||
      quantity > stock ||
      price <= 0
    )
  })

  const hasInvalidItems = invalidItems.length > 0

  const handleChangeVariant = (item: any, variantId: string) => {
    const variant = item.variants?.find((variant: any) => String(variant.id) === variantId)

    if (!variant) return

    const productId = item.productId

    if (!productId) {
      console.error('Missing productId in cart item:', item)
      return
    }

    const price = getVariantPrice(variant)
    const stock = Number(variant?.stock || 0)
    const isContactPrice = price <= 0
    const baseTitle = item.baseTitle || item.title

    changeVariant(item.id, {
      id: `${productId}-${variant.id}`,
      productId,
      variantId: variant.id,
      variantName: variant.name,

      baseTitle,
      title: `${baseTitle} - ${variant.name}`,

      price,
      image: variant.image || item.image,
      slug: item.slug,
      sku: variant.sku || item.sku,
      stock,

      quantity: 1,
      isContactPrice,
      isAvailable: stock > 0 && !isContactPrice,
      isOutOfStock: stock <= 0,

      variants: item.variants || [],
    })
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-40 text-center">
        <h2 className="mb-4 text-2xl font-bold uppercase">
          Giỏ hàng của bạn đang trống
        </h2>

        <Link href="/">
          <Button className="cursor-pointer">Tiếp tục mua sắm</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <h1 className="mb-10 text-2xl font-bold uppercase tracking-widest">
        Giỏ hàng của bạn
      </h1>
      {checkingStock && (
        <p className="mb-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          Đang cập nhật tồn kho mới nhất...
        </p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-16">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {items.map((item: any) => {
            const hasVariants = Array.isArray(item.variants) && item.variants.length > 0
            const stock = Number(item.stock || 0)
            const isOutOfStock = stock <= 0
            const isMaxQuantity = stock > 0 && item.quantity >= stock

            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:gap-5 md:p-5"
              >
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 md:h-32 md:w-28">
                  <Image
                    src={item.image || '/api/media/file/placeholder.jpg'}
                    alt={item.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-bold uppercase leading-6 text-gray-950">
                        {item.baseTitle || item.title}
                      </h3>

                      {item.variantName && (
                        <p className="mt-1 text-xs font-bold text-[#b72828]">
                          Dung tích / phân loại: {item.variantName}
                        </p>
                      )}

                      {isOutOfStock ? (
                        <p className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-red-600">
                          Hết hàng
                        </p>
                      ) : item.quantity > stock ? (
                        <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700">
                          Vượt tồn kho
                        </p>
                      ) : null}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-9 w-9 shrink-0 rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Xóa sản phẩm"
                    >
                      <Trash2 size={18} className="mx-auto" />
                    </button>
                  </div>

                  {hasVariants && (
                    <div className="mt-4">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-gray-400">
                        Đổi dung tích
                      </label>

                      <select
                        value={item.variantId || ''}
                        onChange={(event) => handleChangeVariant(item, event.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#b72828]"
                      >
                        {item.variants.map((variant: any) => {
                          const variantStock = Number(variant?.stock || 0)
                          const price = getVariantPrice(variant)
                          const isContactPrice = price <= 0
                          const disabled = variantStock <= 0 || isContactPrice

                          return (
                            <option
                              key={variant.id}
                              value={variant.id}
                              disabled={disabled}
                            >
                              {variant.name} - {isContactPrice ? 'Liên hệ' : `${formatMoney(price)}₫`}
                              {variantStock <= 0 ? ' - Hết hàng' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-[#b72828]">
                        {Number(item.price || 0) <= 0 || item.isContactPrice ? 'Liên hệ' : `${formatMoney(item.price)}₫`}
                      </p>

                      {stock > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                          Còn {stock} sản phẩm
                        </p>
                      )}
                    </div>

                    <div className="flex w-fit items-center overflow-hidden rounded-full border border-gray-200 bg-white">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, Math.max(1, item.quantity - 1))
                        }
                        disabled={item.quantity <= 1}
                        className="flex h-10 w-10 items-center justify-center transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="flex h-10 min-w-12 items-center justify-center border-x border-gray-200 px-4 text-sm font-black">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isOutOfStock || isMaxQuantity}
                        className="flex h-10 w-10 items-center justify-center transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-sm">
                    <span className="text-gray-500">Thành tiền</span>
                    <span className="font-black text-gray-950">
                      {Number(item.price || 0) <= 0 || item.isContactPrice
                        ? 'Liên hệ'
                        : `${formatMoney(item.price * item.quantity)}₫`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="h-fit rounded-3xl bg-gray-50 p-6 md:p-8">
          <h2 className="mb-6 border-b pb-4 text-sm font-bold uppercase">
            Tóm tắt đơn hàng
          </h2>

          <div className="mb-4 flex justify-between">
            <span>Tạm tính:</span>
            <span className="font-bold">{formatMoney(totalPrice)}₫</span>
          </div>

          <div className="mb-8 flex justify-between text-lg">
            <span>Tổng cộng:</span>
            <span className="text-xl font-bold text-[#b72828]">
              {formatMoney(totalPrice)}₫
            </span>
          </div>

          {hasInvalidItems && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              Giỏ hàng có sản phẩm đã hết hàng hoặc vượt số lượng tồn kho. Vui lòng xóa hoặc giảm số lượng trước khi thanh toán.
            </p>
          )}

          {hasInvalidItems ? (
            <Button
              disabled
              className="h-14 w-full cursor-not-allowed bg-gray-300 font-bold uppercase tracking-widest"
            >
              Vui lòng cập nhật giỏ hàng
            </Button>
          ) : (
            <Link href="/checkout">
              <Button className="h-14 w-full bg-black font-bold uppercase tracking-widest">
                Tiến hành thanh toán
              </Button>
            </Link>
          )}

          <p className="mt-4 text-center text-[10px] italic text-gray-500">
            Phí vận chuyển sẽ được tính ở trang thanh toán.
          </p>
        </div>
      </div>
    </div>
  )
}