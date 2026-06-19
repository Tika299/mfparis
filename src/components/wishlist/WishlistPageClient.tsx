'use client'

import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import { toast } from 'sonner'

import type { Product } from '@/payload-types'
import { getWishlistProducts } from '@/actions/wishlist'
import {
    useWishlistStore,
} from '@/lib/store'

import { WishlistHero } from './WishlistHero'
import { WishlistGrid } from './WishlistGrid'
import { WishlistSidebar } from './WishlistSidebar'
import {
    getWishlistProductPrice,
} from './wishlistCartHelpers'

export function WishlistPageClient() {
    const [products, setProducts] =
        useState<Product[]>([])

    const [isLoading, setIsLoading] =
        useState(true)

    const productIds = useWishlistStore(
        (state) => state.productIds,
    )

    const hasHydrated = useWishlistStore(
        (state) => state.hasHydrated,
    )

    /**
     * Sau khi WishlistHydrator đọc xong localStorage,
     * gọi Server Action để lấy chi tiết sản phẩm.
     */
    useEffect(() => {
        if (!hasHydrated) {
            return
        }

        let isCancelled = false

        const loadProducts =
            async (): Promise<void> => {
                setIsLoading(true)

                try {
                    const result =
                        await getWishlistProducts(
                            productIds,
                        )

                    if (!isCancelled) {
                        setProducts(result)
                    }
                } catch (error) {
                    console.error(
                        '[Wishlist] Load error:',
                        error,
                    )

                    if (!isCancelled) {
                        setProducts([])
                    }
                } finally {
                    if (!isCancelled) {
                        setIsLoading(false)
                    }
                }
            }

        void loadProducts()

        return () => {
            isCancelled = true
        }
    }, [
        hasHydrated,
        productIds,
    ])

    /**
     * Chỉ giữ những sản phẩm vẫn còn trong store.
     * Khi click trái tim để xóa, sản phẩm biến mất
     * ngay mà không cần reload.
     */
    const currentProducts = useMemo(() => {
        if (!hasHydrated) {
            return products
        }

        const wishlistIdSet = new Set(
            productIds.map(String),
        )

        return products.filter(
            (product) =>
                wishlistIdSet.has(
                    String(product.id),
                ),
        )
    }, [
        hasHydrated,
        productIds,
        products,
    ])

    const totalWishlistValue =
        useMemo(() => {
            return currentProducts.reduce(
                (total, product) =>
                    total +
                    getWishlistProductPrice(
                        product,
                    ),
                0,
            )
        }, [currentProducts])

    const saleCount = useMemo(() => {
        return currentProducts.filter(
            (product) => {
                const basePrice = Number(
                    product.price?.basePrice ?? 0,
                )

                const salePrice = Number(
                    product.price?.salePrice ?? 0,
                )

                return (
                    salePrice > 0 &&
                    basePrice > 0 &&
                    salePrice < basePrice
                )
            },
        ).length
    }, [currentProducts])

    const lowStockCount = useMemo(() => {
        return currentProducts.filter(
            (product) => {
                const stock = Number(
                    product.price?.stock ?? 0,
                )

                return stock > 0 && stock <= 5
            },
        ).length
    }, [currentProducts])

    const handleShareWishlist =
        async (): Promise<void> => {
            try {
                const url = window.location.href

                if (navigator.share) {
                    await navigator.share({
                        title:
                            'Danh sách sản phẩm yêu thích',
                        text:
                            'Xem danh sách sản phẩm yêu thích của tôi tại Marais de France.',
                        url,
                    })

                    return
                }

                await navigator.clipboard.writeText(
                    url,
                )

                toast.success(
                    'Đã sao chép liên kết danh sách.',
                )
            } catch {
                toast.error(
                    'Không thể chia sẻ danh sách.',
                )
            }
        }

    const handleExportPdf = (): void => {
        toast.info(
            'Tính năng xuất PDF đang được hoàn thiện.',
        )
    }

    const handleSaveForLater = (): void => {
        toast.success(
            'Danh sách đã được lưu trong trình duyệt.',
        )
    }

    if (!hasHydrated || isLoading) {
        return (
            <main className="pb-14 pt-6">
                <div className="container-ux">
                    <div className="h-[300px] animate-pulse rounded-3xl bg-neutral-100" />

                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {Array.from({
                            length: 4,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="h-24 animate-pulse rounded-2xl bg-neutral-100"
                            />
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="pb-14 pt-6 md:pb-20">
            <WishlistHero
                savedCount={
                    currentProducts.length
                }
                saleCount={saleCount}
                lowStockCount={
                    lowStockCount
                }
                repurchaseCount={0}
            />

            {/* THÊM PHẦN 7 NGAY TẠI ĐÂY */}
            <section className="container-ux mt-8 md:mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
                    {/* Cột trái */}
                    <div className="min-w-0 lg:col-span-8">
                        <WishlistGrid
                            products={
                                currentProducts
                            }
                        />
                    </div>

                    {/* Cột phải */}
                    <div className="mt-8 lg:col-span-4 lg:mt-0">
                        <WishlistSidebar
                            products={
                                currentProducts
                            }
                            onShare={
                                handleShareWishlist
                            }
                            onExportPdf={
                                handleExportPdf
                            }
                            onSaveForLater={
                                handleSaveForLater
                            }
                        />
                    </div>
                </div>
            </section>

            <span className="sr-only">
                Tổng giá trị danh sách:{' '}
                {totalWishlistValue}
            </span>
        </main>
    )
}