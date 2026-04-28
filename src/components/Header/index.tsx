import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Search, ShoppingBag, User } from 'lucide-react'

export const Header = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* 1. Logo */}
        <Link href="/" className="flex-shrink-0">
          {settings.header?.logo?.url ? (
            <Image
              src={settings.header.logo.url}
              alt="Logo"
              width={150}
              height={50}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-xl font-bold tracking-tighter">MF PARIS</span>
          )}
        </Link>

        {/* 2. Main Navigation (Desktop) */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {settings.header?.navItems?.map((item: any) => (
              <NavigationMenuItem key={item.id}>
                {item.subMenu && item.subMenu.length > 0 ? (
                  <>
                    <NavigationMenuTrigger className="uppercase text-xs font-semibold tracking-widest">
                      {item.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {item.subMenu.map((sub: any) => (
                          <li key={sub.id}>
                            <Link
                              href={sub.subLink}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-100"
                            >
                              <div className="text-sm font-medium leading-none">{sub.subLabel}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={item.link} legacyBehavior passHref>
                    <NavigationMenuLink className="px-4 py-2 uppercase text-xs font-semibold tracking-widest hover:text-blue-600 transition-colors">
                      {item.label}
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* 3. Icons (Search, User, Cart) */}
        <div className="flex items-center gap-5">
          <button className="hover:text-blue-600 transition-colors">
            <Search size={20} strokeWidth={1.5} />
          </button>
          <Link href="/account" className="hover:text-blue-600 transition-colors">
            <User size={20} strokeWidth={1.5} />
          </Link>
          <Link href="/cart" className="relative hover:text-blue-600 transition-colors">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
