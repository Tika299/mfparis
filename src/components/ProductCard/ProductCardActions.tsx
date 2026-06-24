'use client'

import {
    useState,
    type MouseEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import {
    Heart,
    Settings,
    ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/utilities'
import {
    useCartStore,
    useWishlistStore,
} from '@/lib/store'
import type { ProductCardMode } from './index'

type ProductCardActionsProps =
    | Readonly<{
        action: 'wishlist'
        productId: string
        productTitle: string
    }>
    | Readonly<{
        action: 'addToCart'
        mode: ProductCardMode
        productId: string
        slug: string
        productTitle: string
        productImage: string
        finalPrice: number
        simpleStock: number
        sku?: string
        isVariableProduct: boolean
        isOutOfStock: boolean
        isContactPrice: boolean
    }>

export const ProductCardActions = (
    props: ProductCardActionsProps,
) => {
    if (props.action === 'wishlist') {
        return (
            <WishlistAction
                productId={props.productId}
                productTitle={props.productTitle}
            />
        )
    }

    return (
        <AddToCartAction
            mode={props.mode}
            productId={props.productId}
            slug={props.slug}
            productTitle={props.productTitle}
            productImage={props.productImage}
            finalPrice={props.finalPrice}
            simpleStock={props.simpleStock}
            sku={props.sku}
            isVariableProduct={props.isVariableProduct}
            isOutOfStock={props.isOutOfStock}
            isContactPrice={props.isContactPrice}
        />
    )
}

function WishlistAction({
    productId,
    productTitle,
}: Readonly<{
    productId: string
    productTitle: string
}>) {
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

    return (
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
                    ? `Xóa ${productTitle} khỏi yêu thích`
                    : `Thêm ${productTitle} vào yêu thích`
            }
            className={cn(
                'absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#989898] transition-all duration-200 sm:right-2.5 sm:top-2.5 sm:h-9 sm:w-9 lg:right-3 lg:top-3 lg:h-10 lg:w-10',
                'hover:bg-[#fff3f3] hover:text-[#b40008]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b40008] focus-visible:ring-offset-2',
                isWishlisted &&
                'bg-[#fff0f0] text-[#b40008]',
            )}
        >
            <Heart
                aria-hidden="true"
                size={19}
                strokeWidth={1.8}
                fill={isWishlisted ? 'currentColor' : 'none'}
                className="sm:h-5 sm:w-5 lg:h-6 lg:w-6"
            />
        </button>
    )
}

function AddToCartAction({
    mode,
    productId,
    slug,
    productTitle,
    productImage,
    finalPrice,
    simpleStock,
    sku,
    isVariableProduct,
    isOutOfStock,
    isContactPrice,
}: Readonly<{
    mode: ProductCardMode
    productId: string
    slug: string
    productTitle: string
    productImage: string
    finalPrice: number
    simpleStock: number
    sku?: string
    isVariableProduct: boolean
    isOutOfStock: boolean
    isContactPrice: boolean
}>) {
    const router = useRouter()
    const [added, setAdded] =
        useState(false)

    const addItem =
        useCartStore(
            (state) => state.addItem,
        )

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

        if (isVariableProduct) {
            router.push(
                `/products/${slug}`,
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
            baseTitle: productTitle,
            title: productTitle,
            price: finalPrice,
            image: productImage,
            slug,
            quantity: 1,
            sku,
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
        <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={
                isVariableProduct
                    ? `Chọn phân loại cho ${productTitle}`
                    : isOutOfStock
                        ? `${productTitle} đã hết hàng`
                        : isContactPrice
                            ? `Liên hệ mua ${productTitle}`
                            : `Thêm ${productTitle} vào giỏ hàng`
            }
            className={cn(
                'mt-3 flex min-h-10 w-full min-w-0 items-center justify-center gap-1 rounded-[10px]',
                'border border-[#eed4d4] bg-white px-1 text-[9px] font-bold leading-none text-[#b40008]',
                'min-[390px]:px-1.5 min-[390px]:text-[10px]',
                'sm:min-h-[42px] sm:px-2 sm:text-[11px]',
                'md:min-h-11 md:text-[12px]',
                'lg:mt-4 lg:min-h-[46px] lg:rounded-[12px] lg:px-3 lg:text-[14px]',
                'transition-colors duration-200 hover:border-[#b40008] hover:bg-[#b40008] hover:text-white',
                'disabled:cursor-not-allowed disabled:border-[#e5e5e5] disabled:bg-[#f5f5f5] disabled:text-[#aaaaaa]',
            )}
        >
            {isVariableProduct ? (
                <Settings
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 lg:h-[18px] lg:w-[18px]"
                />
            ) : (
                <ShoppingBag
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 lg:h-[18px] lg:w-[18px]"
                />
            )}

            <span
                className={cn(
                    'shrink-0 whitespace-nowrap leading-none',
                    mode === 'flash' && 'lg:sr-only',
                )}
            >
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
    )
}