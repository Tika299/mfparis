import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronRight,
  Gift,
  MapPin,
  Menu,
  ShoppingBag,
  Smartphone,
  UserRound,
} from 'lucide-react'

import { SearchBar } from './SearchBar'
import { CartCount } from './CartCount'
import { WishlistButton } from './WishlistButton'
import { MobileMenu } from '../MobileMenu'
import { getSiteSettings } from '@/data/getSiteSettings'
import { HeaderHeightSync } from './HeaderHeightSync'

type HeaderNavItem = {
  id: string
  label: string
  link: string
}

/**
 * Chỉ được dùng khi trong Payload chưa nhập menu.
 * Khi Payload đã có navItems, hệ thống sẽ ưu tiên dữ liệu từ Payload.
 */
const fallbackNavItems: HeaderNavItem[] = [
  {
    id: 'nuoc-hoa',
    label: 'Nước hoa',
    link: '/nuoc-hoa',
  },
  {
    id: 'nuoc-hoa-niche',
    label: 'Nước hoa niche',
    link: '/nuoc-hoa-niche',
  },
  {
    id: 'cham-soc-da',
    label: 'Chăm sóc da',
    link: '/cham-soc-da',
  },
  {
    id: 'makeup',
    label: 'Makeup',
    link: '/makeup',
  },
  {
    id: 'cham-soc-co-the',
    label: 'Chăm sóc cơ thể',
    link: '/cham-soc-co-the',
  },
  {
    id: 'toc-va-nuoc-hoa-toc',
    label: 'Tóc & Nước hoa tóc',
    link: '/toc-va-nuoc-hoa-toc',
  },
  {
    id: 'qua-tang',
    label: 'Quà tặng',
    link: '/qua-tang',
  },
  {
    id: 'uu-dai',
    label: 'Ưu đãi',
    link: '/vouchers',
  },
]

export const Header = async () => {
  const settings = await getSiteSettings()

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

  const cmsNavItems = (settings.header?.navItems ?? []).reduce<HeaderNavItem[]>((result, item, index) => {
    const label =
      typeof item?.label === 'string'
        ? item.label.trim()
        : ''

    const link =
      typeof item?.link === 'string'
        ? item.link.trim()
        : ''

    if (!label || !link) {
      return result
    }

    result.push({
      id: String(
        item.id ??
        `${label.toLowerCase().replaceAll(' ', '-')}-${index}`,
      ),
      label,
      link,
    })

    return result
  }, [])

  const navItems =
    cmsNavItems.length > 0
      ? cmsNavItems
      : fallbackNavItems

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
          <div className="mx-auto grid h-[86px] w-full max-w-[1280px] grid-cols-[269px_minmax(315px,1fr)_305px] items-center gap-x-6 px-7">
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
              <SearchBar />
            </div>

            {/* ACCOUNT / WISHLIST / CART */}
            <div className="flex w-[305px] items-center justify-end gap-6">
              {/* ACCOUNT */}
              <Link
                href="/tai-khoan"
                className="group flex items-center gap-2 text-[#252525]"
                aria-label="Tài khoản"
              >
                <UserRound
                  aria-hidden="true"
                  size={26}
                  strokeWidth={1.65}
                  className="shrink-0 transition-colors group-hover:text-[#ad0509]"
                />

                <span className="whitespace-nowrap text-[12px] leading-[16px]">
                  <span className="block font-medium">
                    Tài khoản
                  </span>

                  <span className="block font-normal text-[#777777]">
                    Đăng nhập
                  </span>
                </span>
              </Link>

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
            {/* DANH MỤC */}
            <Link
              href="/categories"
              className="group flex h-full shrink-0 items-center gap-3 pr-10 text-[12.5px] font-medium text-[#202020]"
            >
              <Menu
                aria-hidden="true"
                size={21}
                strokeWidth={3}
                className="text-[#7d0007] transition-colors group-hover:text-[#ad0509]"
              />

              <span>Danh mục</span>
            </Link>

            {/* MENU ITEMS */}
            <nav
              className="flex min-w-0 flex-1 items-center justify-start gap-x-5 xl:gap-x-8"
              aria-label="Điều hướng chính"
            >
              {navItems.map((item) => {
                const isOffer =
                  item.label
                    .trim()
                    .toLocaleLowerCase('vi') ===
                  'ưu đãi'

                return (
                  <Link
                    key={item.id}
                    href={process.env.NEXT_PUBLIC_BASE_URL + item.link}
                    className={
                      isOffer
                        ? 'group flex items-center gap-2 whitespace-nowrap text-[12.5px] font-semibold text-[#c31920] transition-opacity hover:opacity-70'
                        : 'whitespace-nowrap text-[12.5px] font-medium text-[#202020] transition-colors hover:text-[#ad0509]'
                    }
                  >
                    <span>{item.label}</span>

                    {isOffer ? (
                      <ChevronRight
                        aria-hidden="true"
                        size={13}
                        strokeWidth={2.3}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    ) : null}
                  </Link>
                )
              })}
            </nav>
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
          <SearchBar mobile />
        </div>
      </div>
    </header>
  )
}