import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { User, ShoppingBag } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { CartCount } from './CartCount'

export const Header = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })

  // Lấy dữ liệu Logo
  const logo = settings.header?.logo
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? logo.url : null
  const logoAlt = logo && typeof logo === 'object' && 'alt' in logo ? logo.alt : 'MF Paris'

  // Lấy danh sách Menu từ Database
  const navItems = settings.header?.navItems || []

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        {/* 1. LOGO */}
        <Link href="/" className="flex items-center gap-1 group">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logoAlt}
              width={140}
              height={40}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="text-2xl font-black tracking-tighter uppercase italic">
              MF PARIS<span className="text-[10px] font-normal not-italic ml-1">skincare</span>
            </div>
          )}
        </Link>

        {/* 2. DYNAMIC NAVIGATION (Lấy từ Database) */}
        <nav className="hidden lg:flex space-x-10 text-[11px] font-bold uppercase tracking-[0.2em]">
          {navItems.length > 0 ? (
            navItems.map((item: any) => (
              <Link
                key={item.id}
                href={item.link}
                className="hover:text-amber-700 transition-colors duration-300"
              >
                {item.label}
              </Link>
            ))
          ) : (
            /* Fallback nếu trong Admin chưa nhập Menu */
            <>
              <Link href="/products" className="hover:text-gray-400">
                Cửa hàng
              </Link>
              <Link href="/blog" className="hover:text-gray-400">
                Blog
              </Link>
            </>
          )}
        </nav>

        {/* 3. ICONS */}
        <div className="flex items-center space-x-6">
          <SearchBar />

          <Link href="/account" className="hover:text-amber-700 transition-colors">
            <User size={18} strokeWidth={2} />
          </Link>

          <Link href="/cart" className="relative group">
            <ShoppingBag
              size={18}
              strokeWidth={2}
              className="group-hover:text-amber-700 transition-colors"
            />
            <CartCount /> {/* Component này đã có khung tròn đỏ bên trong */}
          </Link>
        </div>
      </div>
    </header>
  )
}
