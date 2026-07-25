'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    Heart,
    Menu,
    Phone,
    ShieldCheck,
    ShoppingBag,
    Truck,
    X,
} from 'lucide-react'

import { SearchBar } from './Header/SearchBar'
import { CartCount } from './Header/CartCount'
import type { HeaderSearchBrand } from '@/data/getHeaderSearchBrands'
import { useWishlistStore } from '@/lib/store'

type MobileMenuProps = {
    navItems: {
        id: string
        label: string
        link: string
        megaGroups?: {
            id: string
            title: string
            links: {
                id: string
                label: string
                link: string
            }[]
        }[]
    }[]
    logoUrl?: string | null
    logoAlt?: string
    searchBrandTargets?: HeaderSearchBrand[]
}

export const MobileMenu = ({
    navItems,
    logoUrl,
    logoAlt = 'Marais de France',
    searchBrandTargets = [],
}: MobileMenuProps) => {
    const [open, setOpen] =
        useState(false)

    const wishlistCount = useWishlistStore(
        (state) =>
            state.hasHydrated
                ? state.productIds.length
                : 0,
    )

    const hasWishlistItems =
        wishlistCount > 0

    useEffect(() => {
        if (!open) {
            return
        }

        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        return () => {
            document.body.style.overflow =
                previousOverflow
        }
    }, [open])

    const closeMenu = () => {
        setOpen(false)
    }

    return (
        <>
            {/* BUTTON OPEN MENU */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7] text-[#252525] transition-transform active:scale-95"
                aria-label="Mở menu"
                aria-expanded={open}
            >
                <Menu
                    size={21}
                    strokeWidth={2.4}
                />
            </button>

            {/* OVERLAY */}
            <div
                className={`fixed inset-0 z-[200] bg-black/45 transition-opacity duration-300 ${open
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                    }`}
                onClick={closeMenu}
                aria-hidden="true"
            />

            {/* DRAWER */}
            <aside
                className={`fixed left-0 top-0 z-[201] h-dvh w-[86vw] max-w-[360px] bg-white shadow-2xl transition-transform duration-300 ${open
                        ? 'translate-x-0'
                        : '-translate-x-full'
                    }`}
                aria-label="Menu di động"
            >
                <div className="flex h-full flex-col">
                    {/* DRAWER HEADER */}
                    <div className="flex min-h-[72px] items-center justify-between border-b border-[#eeeeee] px-5 py-3">
                        <Link
                            href="/"
                            onClick={closeMenu}
                            className="flex items-center"
                        >
                            {logoUrl ? (
                                <Image
                                    src={logoUrl}
                                    alt={logoAlt}
                                    width={300}
                                    height={100}
                                    sizes="150px"
                                    className="h-auto w-[150px] object-contain object-left"
                                />
                            ) : (
                                <div className="flex flex-col">
                                    <span className="font-heading text-xl font-semibold leading-none text-[#b31319]">
                                        Marais de France
                                    </span>

                                    <span className="mt-1 text-center text-[8px] tracking-[0.35em] text-gray-500">
                                        PARIS
                                    </span>
                                </div>
                            )}
                        </Link>

                        <button
                            type="button"
                            onClick={closeMenu}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#303030]"
                            aria-label="Đóng menu"
                        >
                            <X
                                size={20}
                                strokeWidth={2}
                            />
                        </button>
                    </div>

                    {/* SEARCH */}
                    <div className="border-b border-[#eeeeee] px-5 py-4">
                        <SearchBar
                            brandTargets={searchBrandTargets}
                            mobile
                        />
                    </div>

                    {/* NAVIGATION */}
                    <nav className="flex-1 overflow-y-auto px-5 py-4">
                        <div className="space-y-1">
                            <Link
                                href="/categories"
                                onClick={closeMenu}
                                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-[#202020] transition-colors hover:bg-red-50 hover:text-[#ad0509]"
                            >
                                <span>Danh mục</span>
                                <span className="text-[#ad0509]">
                                    ›
                                </span>
                            </Link>

                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.link}
                                    onClick={closeMenu}
                                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-[#202020] transition-colors hover:bg-red-50 hover:text-[#ad0509]"
                                >
                                    <span>{item.label}</span>

                                    <span className="text-[#ad0509]">
                                        ›
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {/* BENEFITS */}
                        <div className="mt-6 space-y-3 rounded-2xl bg-[#f7f7f7] p-4">
                            <div className="flex items-center gap-3 text-xs font-semibold text-[#555555]">
                                <Truck
                                    size={16}
                                    className="text-[#ad0509]"
                                />

                                <span>
                                    Miễn phí vận chuyển từ 499K
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-semibold text-[#555555]">
                                <ShieldCheck
                                    size={16}
                                    className="text-[#ad0509]"
                                />

                                <span>
                                    Sản phẩm chính hãng
                                </span>
                            </div>
                        </div>
                    </nav>

                    {/* BOTTOM ACTIONS */}
                    <div className="border-t border-[#eeeeee] p-5">
                        <div className="grid grid-cols-3 gap-3">
                            {/* WISHLIST */}
                            <Link
                                href="/wishlist"
                                onClick={closeMenu}
                                className="group relative flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#f7f7f7] py-3 text-xs font-semibold text-[#555555]"
                            >
                                <Heart
                                    size={19}
                                    strokeWidth={1.8}
                                    fill={
                                        hasWishlistItems
                                            ? 'currentColor'
                                            : 'none'
                                    }
                                    className={
                                        hasWishlistItems
                                            ? 'text-[#ad0509]'
                                            : ''
                                    }
                                />

                                <span className="mt-1">
                                    Yêu thích
                                </span>

                                {hasWishlistItems ? (
                                    <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ad0509] px-1 text-[8px] font-bold text-white">
                                        {wishlistCount > 99
                                            ? '99+'
                                            : wishlistCount}
                                    </span>
                                ) : null}
                            </Link>

                            {/* CART */}
                            <Link
                                href="/cart"
                                onClick={closeMenu}
                                className="relative flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#f7f7f7] py-3 text-xs font-semibold text-[#555555]"
                            >
                                <span className="relative">
                                    <ShoppingBag
                                        size={19}
                                        strokeWidth={1.8}
                                    />

                                    <CartCount className="absolute -right-2.5 -top-2.5 h-4 min-w-4 bg-[#ad0509] px-1 text-[8px]" />
                                </span>

                                <span className="mt-1">
                                    Giỏ hàng
                                </span>
                            </Link>

                            {/* PHONE */}
                            <Link
                                href="tel:0795891525"
                                onClick={closeMenu}
                                className="flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#ad0509] py-3 text-xs font-semibold text-white"
                            >
                                <Phone
                                    size={19}
                                    strokeWidth={1.8}
                                />

                                <span className="mt-1">
                                    Gọi ngay
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
