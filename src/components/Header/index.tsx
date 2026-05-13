import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { Search, ShoppingBag, User } from 'lucide-react'
import { SearchBar } from './SearchBar' // Chúng ta sẽ tạo file này
import { CartCount } from './CartCount' // Chúng ta đã tạo file này

export const Header = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  const logo = settings.header?.logo
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? logo.url : null
  const logoAlt = logo && typeof logo === 'object' && 'alt' in logo ? logo.alt : 'MF Paris'

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="hidden lg:flex space-x-10 text-[11px] font-bold uppercase tracking-[0.2em]">
          <Link href="/products" className="hover:text-gray-400 transition-colors">
            Cửa hàng
          </Link>
          <Link href="/categories/nuoc-hoa" className="hover:text-gray-400 transition-colors">
            Nước hoa
          </Link>
          <Link href="/categories/skincare" className="hover:text-gray-400 transition-colors">
            Dưỡng da
          </Link>
          <Link href="/blog" className="hover:text-gray-400 transition-colors">
            Blog
          </Link>
        </nav>

        {/* Icons */}
        <div className="flex items-center space-x-6">
          {/* SEARCH FORM */}
          <SearchBar />
          <User size={18} strokeWidth={2} className="cursor-pointer hover:opacity-50" />
          <Link href="/cart" className="relative group">
            <ShoppingBag size={18} strokeWidth={2} />
            <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              <CartCount />
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
