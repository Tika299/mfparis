'use client'

import {
    Bookmark,
    FileDown,
    Heart,
    Lightbulb,
    Share2,
    ShoppingCart,
    Trash2,
} from 'lucide-react'

import {
    useMemo,
    useState,
} from 'react'

import { toast } from 'sonner'

import type { Product } from '@/payload-types'

import {
    useCartStore,
    useWishlistStore,
    type CartItem,
} from '@/lib/store'

import {
    getWishlistProductPrice,
    productToCartItem,
} from './wishlistCartHelpers'

type WishlistSidebarProps = Readonly<{
    products: Product[]

    onShare?: () => void | Promise<void>
    onExportPdf?: () => void | Promise<void>
    onSaveForLater?: () => void | Promise<void>
}>

function formatVND(value: number): string {
    const safeValue =
        Number.isFinite(value) && value > 0
            ? value
            : 0

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(safeValue)
}

export function WishlistSidebar({
    products,
    onShare,
    onExportPdf,
    onSaveForLater,
}: WishlistSidebarProps) {
    const [
        isAddingAll,
        setIsAddingAll,
    ] = useState(false)

    const addItem = useCartStore(
        (state) => state.addItem,
    )

    const wishlistProductIds =
        useWishlistStore(
            (state) => state.productIds,
        )

    const hasWishlistHydrated =
        useWishlistStore(
            (state) => state.hasHydrated,
        )

    const clearWishlist =
        useWishlistStore(
            (state) =>
                state.clearWishlist,
        )

    const currentProducts =
        useMemo(() => {
            if (!hasWishlistHydrated) {
                return products
            }

            const idSet = new Set(
                wishlistProductIds.map(String),
            )

            return products.filter(
                (product) =>
                    idSet.has(
                        String(product.id),
                    ),
            )
        }, [
            hasWishlistHydrated,
            products,
            wishlistProductIds,
        ])

    const itemCount =
        currentProducts.length

    const totalValue =
        useMemo(
            () =>
                currentProducts.reduce(
                    (total, product) =>
                        total +
                        getWishlistProductPrice(
                            product,
                        ),
                    0,
                ),
            [currentProducts],
        )

    const isEmpty =
        itemCount === 0

    const handleAddAllToCart =
        (): void => {
            if (
                isEmpty ||
                isAddingAll
            ) {
                return
            }

            setIsAddingAll(true)

            try {
                const cartItems =
                    currentProducts
                        .map(
                            productToCartItem,
                        )
                        .filter(
                            (
                                item,
                            ): item is CartItem =>
                                item !== null,
                        )

                if (cartItems.length === 0) {
                    toast.error(
                        'Không có sản phẩm còn hàng để thêm vào giỏ.',
                    )

                    return
                }

                cartItems.forEach(
                    (cartItem) => {
                        addItem(cartItem)
                    },
                )

                const skippedCount =
                    currentProducts.length -
                    cartItems.length

                toast.success(
                    skippedCount > 0
                        ? `Đã thêm ${cartItems.length} sản phẩm vào giỏ. Bỏ qua ${skippedCount} sản phẩm hết hàng hoặc cần liên hệ.`
                        : `Đã thêm ${cartItems.length} sản phẩm vào giỏ hàng.`,
                )
            } finally {
                setIsAddingAll(false)
            }
        }

    const handleClearWishlist =
        (): void => {
            if (isEmpty) {
                return
            }

            const shouldClear =
                window.confirm(
                    'Bạn có chắc muốn xóa toàn bộ sản phẩm yêu thích?',
                )

            if (!shouldClear) {
                return
            }

            clearWishlist()

            toast.success(
                'Đã xóa toàn bộ danh sách yêu thích.',
            )
        }

    return (
        <aside
            className="sticky top-24"
            aria-label="Tổng quan danh sách yêu thích"
        >
            <div className="overflow-hidden rounded-[2rem] border border-neutral-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.045)]">
                {/* Thông tin tổng quan */}
                <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-5">
                        <div>
                            <p className="font-heading text-xl font-semibold text-neutral-950">
                                Danh sách của bạn
                            </p>

                            <p className="mt-1 text-xs leading-5 text-neutral-400">
                                Tổng quan sản phẩm đã lưu
                            </p>
                        </div>

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#B72828]">
                            <Heart
                                aria-hidden="true"
                                size={21}
                                strokeWidth={1.8}
                                fill="currentColor"
                            />
                        </span>
                    </div>

                    {/* Số lượng */}
                    <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium text-neutral-500">
                                Số lượng sản phẩm
                            </p>

                            <div className="mt-1 flex items-baseline gap-1.5">
                                <strong className="text-2xl font-semibold leading-none text-neutral-950">
                                    {itemCount.toLocaleString('vi-VN')}
                                </strong>

                                <span className="text-xs text-neutral-400">
                                    sản phẩm
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tổng giá trị */}
                    <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-4">
                        <p className="text-xs font-medium text-neutral-500">
                            Tổng giá trị ước tính
                        </p>

                        <p className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-[#B72828] sm:text-3xl">
                            {formatVND(totalValue)}
                        </p>

                        <p className="mt-2 text-[11px] leading-5 text-neutral-400">
                            Giá thực tế được xác nhận lại tại giỏ hàng.
                        </p>
                    </div>

                    {/* CTA chính */}
                    <button
                        type="button"
                        onClick={handleAddAllToCart}
                        disabled={isEmpty || isAddingAll}
                        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#B72828] px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(183,40,40,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#951F1F] hover:shadow-[0_14px_30px_rgba(183,40,40,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none disabled:hover:translate-y-0"
                    >
                        <ShoppingCart
                            aria-hidden="true"
                            size={20}
                            strokeWidth={1.9}
                        />

                        {isAddingAll
                            ? 'Đang thêm vào giỏ...'
                            : 'Thêm tất cả vào giỏ'}
                    </button>

                    {/* CTA phụ */}
                    <button
                        type="button"
                        onClick={() => {
                            void onShare?.()
                        }}
                        disabled={isEmpty}
                        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#B72828]/30 bg-white px-5 py-3 text-sm font-semibold text-[#B72828] transition-colors hover:border-[#B72828] hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300 disabled:hover:bg-white"
                    >
                        <Share2
                            aria-hidden="true"
                            size={18}
                        />

                        Chia sẻ danh sách
                    </button>
                </div>

                {/* Danh sách tính năng */}
                <div className="border-t border-neutral-100 px-3 py-3">
                    <SidebarAction
                        icon={<FileDown size={18} />}
                        label="Xuất danh sách (PDF)"
                        onClick={onExportPdf}
                        disabled={isEmpty}
                    />

                    <SidebarAction
                        icon={<Bookmark size={18} />}
                        label="Lưu cho sau"
                        onClick={onSaveForLater}
                        disabled={isEmpty}
                    />

                    <SidebarAction
                        icon={<Trash2 size={18} />}
                        label="Xóa tất cả sản phẩm"
                        onClick={handleClearWishlist}
                        disabled={isEmpty}
                        destructive
                    />
                </div>

                {/* Mẹo nhỏ */}
                <div className="mx-4 mb-4 rounded-2xl border border-red-100 bg-[#fff4f3] p-4 sm:mx-5 sm:mb-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#B72828] shadow-sm">
                            <Lightbulb
                                aria-hidden="true"
                                size={18}
                                strokeWidth={1.8}
                            />
                        </span>

                        <div>
                            <p className="text-sm font-semibold text-[#B72828]">
                                Mẹo nhỏ
                            </p>

                            <p className="mt-1 text-xs leading-5 text-neutral-600">
                                Giá sản phẩm, ưu đãi và tình trạng tồn kho có
                                thể thay đổi theo thời điểm. Hãy thêm vào giỏ
                                hàng sớm để không bỏ lỡ sản phẩm bạn yêu thích.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}

type SidebarActionProps = Readonly<{
    icon: React.ReactNode
    label: string
    onClick?: () => void | Promise<void>
    disabled?: boolean
    destructive?: boolean
}>

function SidebarAction({
    icon,
    label,
    onClick,
    disabled = false,
    destructive = false,
}: SidebarActionProps) {
    return (
        <button
            type="button"
            onClick={() => {
                void onClick?.()
            }}
            disabled={disabled}
            className={[
                'group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-40',
                destructive
                    ? 'text-neutral-600 hover:bg-red-50 hover:text-[#B72828]'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950',
            ].join(' ')}
        >
            <span
                className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                    destructive
                        ? 'bg-red-50 text-[#B72828]'
                        : 'bg-neutral-100 text-neutral-500 group-hover:bg-red-50 group-hover:text-[#B72828]',
                ].join(' ')}
            >
                {icon}
            </span>

            <span>{label}</span>
        </button>
    )
}