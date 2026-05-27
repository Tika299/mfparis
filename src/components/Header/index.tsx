import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { User, ShoppingBag, Phone, MapPin, Truck, ShieldCheck } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { CartCount } from './CartCount'

export const Header = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })

  const logo = settings.header?.logo
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? logo.url : null
  const logoAlt = logo && typeof logo === 'object' && 'alt' in logo ? logo.alt : 'MF Paris'
  const navItems = settings.header?.navItems || []

  return (
    <header className="bg-white sticky top-0 z-[100] shadow-sm antialiased font-sans">
      {/* 1. TOP BAR - Cung cấp niềm tin ngay lập tức */}
      <div className="bg-primary text-primary-foreground py-2 border-b border-white/10 hidden md:block">
        <div className="container-custom flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Truck size={12} /> Miễn phí vận chuyển cho đơn hàng từ 500k</span>
            <span className="flex items-center gap-2"><ShieldCheck size={12} /> 100% Chính hãng Pháp</span>
          </div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:opacity-70 transition-opacity">Giới thiệu</Link>
            <Link href="/blog" className="hover:opacity-70 transition-opacity">Tạp chí</Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER - Khung 1200px chuẩn UX */}
      <div className="bg-white h-20">
        <div className="container-custom h-full flex justify-between items-center gap-8">

          {/* LOGO */}
          <Link href="/" className="flex-shrink-0 group">
            {logoUrl ? (
              <Image src={logoUrl} alt={logoAlt} width={140} height={45} className="h-9 w-auto object-contain transition-transform group-hover:scale-105" priority />
            ) : (
              <div className="flex flex-col">
                <span className="font-heading text-2xl font-bold tracking-tight uppercase leading-none text-primary">
                  MF PARIS
                </span>
                <span className="mt-1 font-sans text-[8px] font-bold uppercase tracking-[0.4em] text-gray-400">
                  Authentic Service
                </span>
              </div>
            )}
          </Link>

          {/* DYNAMIC NAVIGATION - Playfair Display */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item: any) => (
              <Link
                key={item.id}
                href={item.link}
                className="
        group relative font-heading text-[18px] font-bold
        tracking-[0.02em] transition-colors duration-300
        hover:text-primary
      "
              >
                {item.label}

                <span
                  className="
          absolute -bottom-2 left-0 h-[2px] w-0
          rounded-full bg-primary transition-all duration-300
          group-hover:w-full
        "
                />
              </Link>
            ))}
          </nav>

          {/* UTILITY ICONS */}
          <div className="flex items-center gap-5 shrink-0">
            <SearchBar />

            <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

            <Link href="/account" className="text-gray-700 transition-colors hover:text-primary">
              <User size={20} strokeWidth={2} />
            </Link>

            <Link href="/cart" className="relative group">
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
      </div>
    </header>
  )
}