import Image from 'next/image'
import Link from 'next/link'
import {
  Gift,
  MapPin,
  ShoppingBag,
  Smartphone,
} from 'lucide-react'

import { SearchBar } from './SearchBar'
import { SiloMegaMenu } from './SiloMegaMenu'
import { CartCount } from './CartCount'
import { WishlistButton } from './WishlistButton'
import { MobileMenu } from '../MobileMenu'
import { getHeaderSearchBrands } from '@/data/getHeaderSearchBrands'
import { getSiteSettings } from '@/data/getSiteSettings'
import { HeaderHeightSync } from './HeaderHeightSync'

type HeaderNavLink = {
  id: string
  label: string
  link: string
}

type HeaderNavGroup = {
  id: string
  title: string
  links: HeaderNavLink[]
}

type HeaderNavItem = HeaderNavLink & {
  megaGroups?: HeaderNavGroup[]
}

function normalizeMenuText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMenuLink(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function createMenuId(label: string, index: number): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-') + '-' + index
}

function normalizeMenuLinks(value: unknown): HeaderNavLink[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<HeaderNavLink[]>((result, item, index) => {
    const label = normalizeMenuText(item?.label)
    const link = normalizeMenuLink(item?.link)

    if (!label || !link) {
      return result
    }

    result.push({
      id: String(item?.id ?? createMenuId(label, index)),
      label,
      link,
    })

    return result
  }, [])
}

function normalizeMegaGroups(value: unknown): HeaderNavGroup[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const groups = value.reduce<HeaderNavGroup[]>((result, group, index) => {
    const title = normalizeMenuText(group?.title)
    const links = normalizeMenuLinks(group?.links)

    if (!title || links.length === 0) {
      return result
    }

    result.push({
      id: String(group?.id ?? createMenuId(title, index)),
      title,
      links,
    })

    return result
  }, [])

  return groups.length > 0 ? groups : undefined
}

function buildHeaderNavItems(cmsNavItems: unknown): HeaderNavItem[] {
  if (!Array.isArray(cmsNavItems)) {
    return []
  }

  return cmsNavItems.reduce<HeaderNavItem[]>((result, item, index) => {
    const label = normalizeMenuText(item?.label)
    const link = normalizeMenuLink(item?.link)

    if (!label || !link) {
      return result
    }

    result.push({
      id: String(item?.id ?? createMenuId(label, index)),
      label,
      link,
      megaGroups: normalizeMegaGroups(item?.megaGroups),
    })

    return result
  }, [])
}

export const Header = async () => {
  const [settings, searchBrandTargets] = await Promise.all([
    getSiteSettings(),
    getHeaderSearchBrands(),
  ])

  const logo = settings.header?.logo

  const logoUrl =
    logo &&
      typeof logo === 'object' &&
      'url' in logo &&
      typeof logo.url === 'string'
      ? logo.url
      : null

  const logoAlt =
    logo &&
      typeof logo === 'object' &&
      'alt' in logo &&
      typeof logo.alt === 'string' &&
      logo.alt
      ? logo.alt
      : 'Marais de France'
  const navItems = buildHeaderNavItems(settings.header?.navItems)

  return (
    <header
      data-site-header
      className="sticky top-0 z-[100] w-full bg-white font-sans text-[#202020]"
    >
      <HeaderHeightSync />
      {/* =====================================================
          DESKTOP HEADER
          Hiển thị từ 1024 px trở lên
      ====================================================== */}
      <div className="hidden lg:block">
        {/* TOP PROMOTION BAR */}
        <div className="h-10 bg-[#ad0509] text-white">
          <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between px-7">
            {/* Nội dung bên trái */}
            <div className="flex items-center gap-7">
              <div className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium leading-none">
                <Gift
                  aria-hidden="true"
                  size={15}
                  strokeWidth={2.4}
                />

                <span>
                  <strong className="font-bold">
                    FREESHIP
                  </strong>{' '}
                  cho đơn từ 499K
                </span>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium leading-none">
                <Gift
                  aria-hidden="true"
                  size={15}
                  strokeWidth={2.4}
                />

                <span>
                  Tặng sample cao cấp cho mọi đơn hàng
                </span>
              </div>
            </div>

            {/* Nội dung bên phải */}
            <div className="flex items-center gap-7">
              <Link
                href="/tai-ung-dung"
                className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium leading-none transition-opacity hover:opacity-80"
              >
                <Smartphone
                  aria-hidden="true"
                  size={14}
                  strokeWidth={2.4}
                />

                <span>
                  Tải ứng dụng Marais de France
                </span>
              </Link>

              <Link
                href="/he-thong-cua-hang"
                className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium leading-none transition-opacity hover:opacity-80"
              >
                <MapPin
                  aria-hidden="true"
                  size={15}
                  strokeWidth={2.4}
                />

                <span>Hệ thống cửa hàng</span>
              </Link>
            </div>
          </div>
        </div>

        {/* MAIN HEADER */}
        <div className="bg-white">
          <div className="mx-auto grid h-[86px] w-full max-w-[1280px] grid-cols-[269px_minmax(315px,1fr)_220px] items-center gap-x-6 px-7">
            {/* LOGO */}
            <div className="flex items-center pl-6">
              <Link
                href="/"
                className="inline-flex items-center"
                aria-label="Trang chủ Marais de France"
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={logoAlt}
                    width={420}
                    height={130}
                    sizes="140px"
                    className="block h-auto w-[140px] object-contain object-left"
                  />
                ) : (
                  <div className="flex flex-col">
                    <span className="font-heading text-[25px] font-semibold leading-none text-[#b31319]">
                      Marais de France
                    </span>

                    <span className="mt-1 text-center text-[9px] tracking-[0.35em] text-gray-500">
                      PARIS
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* SEARCH */}
            <div className="w-full max-w-[340px] justify-self-center">
              <SearchBar brandTargets={searchBrandTargets} />
            </div>

            {/* WISHLIST / CART */}
            <div className="flex w-[220px] items-center justify-end gap-6">
              {/* WISHLIST */}
              <WishlistButton mode="desktop" />

              {/* CART */}
              <Link
                href="/cart"
                className="group flex items-center gap-2 text-[#252525]"
                aria-label="Giỏ hàng"
              >
                <span className="relative flex h-[31px] w-[31px] shrink-0 items-center justify-center">
                  <ShoppingBag
                    aria-hidden="true"
                    size={26}
                    strokeWidth={1.65}
                    className="transition-colors group-hover:text-[#ad0509]"
                  />

                  <CartCount
                    showZero
                    className="absolute -right-[7px] -top-[8px] h-[15px] min-w-[15px] bg-[#ad0509] px-[3px] text-[8px] ring-2 ring-white"
                  />
                </span>

                <span className="whitespace-nowrap text-[12px] font-medium">
                  Giỏ hàng
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="h-[49px] border-y border-[#ececec] bg-white">
          <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-7">
            <SiloMegaMenu navItems={navItems} />
          </div>
        </div>
      </div>

      {/* =====================================================
          MOBILE / TABLET HEADER
          Hiển thị dưới 1024 px
      ====================================================== */}
      <div className="lg:hidden">
        <div className="relative flex h-16 items-center justify-between border-b border-[#eeeeee] bg-white px-4">
          {/* MENU BÊN TRÁI */}
          <MobileMenu
            navItems={navItems}
            logoUrl={logoUrl}
            logoAlt={logoAlt}
            searchBrandTargets={searchBrandTargets}
          />

          {/* LOGO Ở GIỮA */}
          <Link
            href="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            aria-label="Trang chủ Marais de France"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={280}
                height={90}
                sizes="126px"
                className="h-auto w-[100px] object-contain"
              />
            ) : (
              <span className="font-heading text-lg font-semibold text-[#b31319]">
                Marais de France
              </span>
            )}
          </Link>

          {/* ICON BÊN PHẢI */}
          <div className="ml-auto flex items-center gap-1">
            <WishlistButton mode="icon" />

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7] text-[#303030]"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag
                size={20}
                strokeWidth={1.8}
              />

              <CartCount className="absolute -right-0.5 -top-0.5 h-4 min-w-4 bg-[#ad0509] px-1 text-[8px] ring-2 ring-white" />
            </Link>
          </div>
        </div>

        {/* SEARCH MOBILE */}
        <div className="border-b border-[#eeeeee] bg-white px-4 py-2.5">
          <SearchBar
            brandTargets={searchBrandTargets}
            mobile
          />
        </div>
      </div>
    </header>
  )
}
