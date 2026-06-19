'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Heart, Phone, ShoppingBag, Truck, ShieldCheck } from 'lucide-react'
import { SearchBar } from './Header/SearchBar'
import { CartCount } from './Header/CartCount'
import { useWishlistStore } from '@/lib/store'

type MobileMenuProps = {
    navItems: {
        id?: string
        label: string
        link: string
    }[]
}

export const MobileMenu = ({ navItems }: MobileMenuProps) => {
    const [open, setOpen] = useState(false)
    const wishlistCount =
        useWishlistStore((state) =>
            state.hasHydrated
                ? state.productIds.length
                : 0,
        )

    const hasWishlistItems = wishlistCount > 0

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95"
                aria-label="Mở menu"
            >
                <Menu size={22} />
            </button>

            {/* Overlay */}
            <div
                className={`fixed inset-0 z-[200] bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <aside
                className={`fixed left-0 top-0 z-[201] h-screen w-[86vw] max-w-[360px] bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col">
                    {/* Header drawer */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <Link href="/" onClick={() => setOpen(false)} className="flex flex-col">
                            <span className="font-heading text-xl font-bold tracking-tight uppercase leading-none text-primary">
                                MF PARIS
                            </span>
                            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.35em] text-gray-400">
                                Authentic Service
                            </span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-700"
                            aria-label="Đóng menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="border-b border-gray-100 px-5 py-4">
                        <SearchBar mobile />
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 overflow-y-auto px-5 py-4">
                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id || item.link}
                                    href={item.link}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-gray-800 transition-colors hover:bg-red-50 hover:text-primary"
                                >
                                    {item.label}
                                    <span className="text-primary">›</span>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-6 rounded-3xl bg-gray-50 p-4 space-y-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                <Truck size={16} className="text-primary" />
                                Miễn phí vận chuyển từ 500k
                            </div>

                            <div className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                <ShieldCheck size={16} className="text-primary" />
                                100% Chính hãng Pháp
                            </div>
                        </div>
                    </nav>

                    {/* Bottom actions */}
                    <div className="border-t border-gray-100 p-5">
                        <div className="grid grid-cols-3 gap-3">
                            <Link
                                href="/wishlist"
                                onClick={() => setOpen(false)}
                                aria-label={`Xem danh sách yêu thích, ${wishlistCount} sản phẩm`}
                                className="group relative flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-gray-50 py-3 text-xs font-bold text-gray-700 transition-colors hover:bg-red-50 hover:text-primary active:scale-[0.98]"
                            >
                                <Heart
                                    aria-hidden="true"
                                    size={19}
                                    strokeWidth={2}
                                    fill={
                                        hasWishlistItems
                                            ? 'currentColor'
                                            : 'none'
                                    }
                                    className={
                                        hasWishlistItems
                                            ? 'text-primary'
                                            : 'transition-colors group-hover:text-primary'
                                    }
                                />

                                <span className="mt-1">
                                    Yêu thích
                                </span>

                                {hasWishlistItems ? (
                                    <span
                                        aria-hidden="true"
                                        className="absolute right-3 top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-white"
                                    >
                                        {wishlistCount > 99
                                            ? '99+'
                                            : wishlistCount}
                                    </span>
                                ) : null}
                            </Link>

                            <Link
                                href="/cart"
                                onClick={() => setOpen(false)}
                                className="relative flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-3 text-xs font-bold text-gray-700"
                            >
                                <ShoppingBag size={18} />
                                <span className="mt-1">Giỏ hàng</span>
                                <CartCount />
                            </Link>

                            <Link
                                href="tel:0795891525"
                                onClick={() => setOpen(false)}
                                className="flex flex-col items-center justify-center rounded-2xl bg-primary py-3 text-xs font-bold text-white"
                            >
                                <Phone size={18} />
                                <span className="mt-1">Gọi ngay</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}