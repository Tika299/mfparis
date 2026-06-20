'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/lib/store'

type WishlistButtonProps = {
    mode?: 'desktop' | 'icon'
}

export function WishlistButton({
    mode = 'icon',
}: WishlistButtonProps) {
    const wishlistCount = useWishlistStore(
        (state) =>
            state.hasHydrated
                ? state.productIds.length
                : 0,
    )

    const hasWishlistItems =
        wishlistCount > 0

    if (mode === 'desktop') {
        return (
            <Link
                href="/wishlist"
                className="group flex items-center gap-2 text-[#252525]"
                aria-label={
                    hasWishlistItems
                        ? `Danh sách yêu thích có ${wishlistCount} sản phẩm`
                        : 'Danh sách sản phẩm yêu thích'
                }
            >
                <span className="relative flex h-[31px] w-[31px] shrink-0 items-center justify-center">
                    <Heart
                        aria-hidden="true"
                        size={27}
                        strokeWidth={1.65}
                        fill={
                            hasWishlistItems
                                ? 'currentColor'
                                : 'none'
                        }
                        className={
                            hasWishlistItems
                                ? 'text-[#ad0509]'
                                : 'transition-colors group-hover:text-[#ad0509]'
                        }
                    />

                    {hasWishlistItems ? (
                        <span className="absolute -right-2 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#ad0509] px-[3px] text-[8px] font-bold leading-none text-white ring-2 ring-white">
                            {wishlistCount > 99
                                ? '99+'
                                : wishlistCount}
                        </span>
                    ) : null}
                </span>

                <span className="whitespace-nowrap text-[12px] font-medium">
                    Yêu thích
                </span>
            </Link>
        )
    }

    return (
        <Link
            href="/wishlist"
            className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7] text-[#303030]"
            aria-label={
                hasWishlistItems
                    ? `Danh sách yêu thích có ${wishlistCount} sản phẩm`
                    : 'Danh sách sản phẩm yêu thích'
            }
        >
            <Heart
                aria-hidden="true"
                size={20}
                strokeWidth={1.8}
                fill={
                    hasWishlistItems
                        ? 'currentColor'
                        : 'none'
                }
                className={
                    hasWishlistItems
                        ? 'text-[#ad0509]'
                        : 'transition-colors group-hover:text-[#ad0509]'
                }
            />

            {hasWishlistItems ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ad0509] px-1 text-[8px] font-bold leading-none text-white ring-2 ring-white">
                    {wishlistCount > 99
                        ? '99+'
                        : wishlistCount}
                </span>
            ) : null}
        </Link>
    )
}