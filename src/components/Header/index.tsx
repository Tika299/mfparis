import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { User, ShoppingBag, Truck, ShieldCheck } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { CartCount } from './CartCount'
import { MobileMenu } from '../MobileMenu'

export const Header = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })

  const logo = settings.header?.logo
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? logo.url : null
  const logoAlt = logo && typeof logo === 'object' && 'alt' in logo ? logo.alt : 'MF Paris'
  const navItems = settings.header?.navItems || []

  return (
    <header className="sticky top-0 z-[100] bg-white shadow-sm antialiased font-sans">
      {/* TOP BAR - Desktop / Tablet lớn */}
      <div className="hidden bg-primary text-primary-foreground border-b border-white/10 md:block">
        <div className="container-custom flex h-9 items-center justify-between text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4 lg:gap-6">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Truck size={12} /> Miễn phí vận chuyển từ 500k
            </span>

            <span className="hidden lg:flex items-center gap-2 whitespace-nowrap">
              <ShieldCheck size={12} /> 100% Chính hãng Pháp
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:opacity-70 transition-opacity">
              Giới thiệu
            </Link>
            <Link href="/blog" className="hover:opacity-70 transition-opacity">
              Tạp chí
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className="bg-white">
        <div className="container-custom flex h-16 items-center justify-between gap-3 md:h-18 lg:h-20 lg:gap-8">
          {/* MOBILE MENU */}
          <div className="flex lg:hidden">
            <MobileMenu navItems={navItems.filter((item): item is { id: string; label: string; link: string } => item.id !== null && item.id !== undefined)} />
          </div>

          {/* LOGO */}
          <Link href="/" className="group flex h-full shrink-0 items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={100}
                height={80}
                sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 220px"
                className="block h-[100%] w-[150px] object-contain object-left transition-transform duration-300 group-hover:scale-105 sm:w-[180px] lg:h-14 lg:w-[220px]"
                priority
              />
            ) : (
              <div className="flex flex-col">
                <span className="font-heading text-xl font-bold tracking-tight uppercase leading-none text-primary sm:text-2xl">
                  MF PARIS
                </span>
                <span className="mt-1 hidden font-sans text-[8px] font-bold uppercase tracking-[0.35em] text-gray-400 sm:block">
                  Authentic Service
                </span>
              </div>
            )}
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navItems.map((item: any) => (
              <Link
                key={item.id}
                href={item.link}
                className="group relative font-heading text-[15px] xl:text-[16px] font-[600] tracking-[0.02em] transition-colors duration-300 hover:text-primary whitespace-nowrap"
              >
                {item.label}
                <span className="absolute -bottom-2 left-0 h-[2px] w-0 rounded-full bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* SEARCH - TABLET / DESKTOP */}
          <div className="hidden md:flex flex-1 justify-end lg:max-w-[260px] xl:max-w-[320px]">
            <SearchBar />
          </div>

          {/* ICONS */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
            <div className="hidden h-6 w-px bg-gray-100 md:block" />

            <Link
              href="/account"
              className="hidden rounded-full p-2 text-gray-700 transition-colors hover:bg-red-50 hover:text-primary sm:flex"
              aria-label="Tài khoản"
            >
              <User size={20} strokeWidth={2} />
            </Link>

            <Link href="/cart" className="relative group" aria-label="Giỏ hàng">
              <div className="rounded-full bg-gray-50 p-2.5 transition-colors group-hover:bg-red-50">
                <ShoppingBag
                  size={20}
                  strokeWidth={2}
                  className="text-gray-700 transition-colors group-hover:text-primary"
                />
              </div>
              <CartCount />
            </Link>
          </div>
        </div>

        {/* SEARCH MOBILE RIÊNG */}
        <div className="border-t border-gray-100 px-4 py-3 md:hidden">
          <SearchBar mobile />
        </div>
      </div>
    </header>
  )
}