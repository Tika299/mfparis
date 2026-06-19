'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/lib/store'
import { cn } from '@/utilities'

export function WishlistButton() {
    const wishlistCount =
        useWishlistStore((state) =>
            state.hasHydrated
                ? state.productIds.length
                : 0,
        )

    const hasWishlistItems =
        wishlistCount > 0

    return (
        <Link
            href="/wishlist"
            className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
                hasWishlistItems
                    ? 'bg-red-50 text-primary'
                    : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-primary',
            )}
            aria-label={
                hasWishlistItems
                    ? `Danh sách yêu thích có ${wishlistCount} sản phẩm`
                    : 'Danh sách sản phẩm yêu thích'
            }
            title="Sản phẩm yêu thích"
        >
            <Heart
                aria-hidden="true"
                size={20}
                strokeWidth={2}
                fill={
                    hasWishlistItems
                        ? 'currentColor'
                        : 'none'
                }
                className={cn(
                    'transition-all duration-200',
                    hasWishlistItems
                        ? 'scale-105 text-primary'
                        : 'group-hover:fill-primary group-hover:text-primary',
                )}
            />

            {hasWishlistItems ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-white shadow-sm ring-2 ring-white">
                    {wishlistCount > 99
                        ? '99+'
                        : wishlistCount}
                </span>
            ) : null}
        </Link>
    )
}