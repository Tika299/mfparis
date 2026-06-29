import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react'
import { getSiteSettings } from '@/data/getSiteSettings'
import { SITE_ORIGIN } from '@/utilities/seo'

type FooterLink = {
  id?: string | number | null
  label?: string | null
  link?: string | null
}

type FooterSocialIcon =
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'zalo'

type FooterSocialLink = {
  id?: string | number | null
  icon?: FooterSocialIcon | null
  name?: string | null
  url?: string | null
}

type FooterSettings = {
  description?: string | null
  workingHours?: string | null
  chatUrl?: string | null
  social?: FooterSocialLink[] | null
  aboutLinks?: FooterLink[] | null
  policyLinks?: FooterLink[] | null
}

type ContactSettings = {
  address?: string | null
  phone?: string | null
  email?: string | null
  zalo?: string | null
}

type SocialIconProps = Readonly<{
  size?: number
  className?: string
}>

function FacebookIcon({
  size = 21,
  className = '',
}: SocialIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" />
    </svg>
  )
}

function InstagramIcon({
  size = 21,
  className = '',
}: SocialIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
      />

      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <circle
        cx="17.5"
        cy="6.5"
        r="0.7"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

function YoutubeIcon({
  size = 22,
  className = '',
}: SocialIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="4"
      />

      <path
        d="m10 9 5 3-5 3V9Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

const fallbackAboutLinks: FooterLink[] = [
  { id: 'about', label: 'Giới thiệu', link: '/about' },
  { id: 'contact', label: 'Liên hệ', link: '/contact' },
  { id: 'products', label: 'Sản phẩm', link: '/products' },
  { id: 'brands', label: 'Thương hiệu', link: '/brands' },
]

const fallbackPolicyLinks: FooterLink[] = [
  { id: 'return-policy', label: 'Chính sách đổi trả', link: '/chinh-sach-doi-tra' },
  { id: 'shipping-policy', label: 'Chính sách vận chuyển', link: '/chinh-sach-van-chuyen' },
  { id: 'privacy-policy', label: 'Chính sách bảo mật', link: '/chinh-sach-bao-mat' },
  { id: 'terms', label: 'Điều khoản sử dụng', link: '/dieu-khoan-su-dung' },
  {
    id: 'payment-methods',
    label: 'Phương thức thanh toán',
    link: '/phuong-thuc-thanh-toan',
  },
]

type NormalizedFooterLink = FooterLink & {
  label: string
  link: string
}

const knownSafeInternalRoutes = new Set<string>([
  '/',
  '/about',
  '/contact',
  '/products',
  '/categories',
  '/brands',
  '/blog',
  '/chinh-sach-doi-tra',
  '/chinh-sach-van-chuyen',
  '/chinh-sach-bao-mat',
  '/dieu-khoan-su-dung',
  '/phuong-thuc-thanh-toan',
])

function normalizeInternalPath(
  value: string,
): string | null {
  const normalizedValue = value.trim()

  if (!normalizedValue.startsWith('/')) {
    return null
  }

  try {
    const url = new URL(
      normalizedValue,
      SITE_ORIGIN,
    )

    const pathname =
      url.pathname.replace(/\/+$/u, '') || '/'

    return knownSafeInternalRoutes.has(pathname)
      ? pathname
      : null
  } catch {
    return null
  }
}

function normalizeLinks(
  links: FooterLink[] | null | undefined,
  fallback: FooterLink[],
): FooterLink[] {
  if (!Array.isArray(links)) {
    return fallback
  }

  const normalizedLinks: NormalizedFooterLink[] = []

  for (const item of links) {
    const label = item.label?.trim()
    const link = item.link
      ? normalizeInternalPath(item.link)
      : null

    if (!label || !link) {
      continue
    }

    normalizedLinks.push({
      id: item.id ?? null,
      label,
      link,
    })
  }

  return normalizedLinks.length > 0
    ? normalizedLinks
    : fallback
}

function normalizeExternalUrl(
  value: string | null | undefined,
): string {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    return '#'
  }

  if (
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://')
  ) {
    return normalizedValue
  }

  return `https://${normalizedValue}`
}

type NormalizedSocialLink = {
  id: string | number
  icon: FooterSocialIcon
  label: string
  href: string
}

function getSocialLabel(
  icon: FooterSocialIcon,
): string {
  switch (icon) {
    case 'facebook':
      return 'Facebook'
    case 'instagram':
      return 'Instagram'
    case 'youtube':
      return 'YouTube'
    case 'tiktok':
      return 'TikTok'
    case 'zalo':
      return 'Zalo'
  }
}

function getSocialIcon(
  icon: FooterSocialIcon,
): React.ReactNode {
  switch (icon) {
    case 'facebook':
      return <FacebookIcon size={21} />
    case 'instagram':
      return <InstagramIcon size={21} />
    case 'youtube':
      return <YoutubeIcon size={22} />
    case 'tiktok':
      return <TikTokIcon size={22} />
    case 'zalo':
      return <MessageCircle size={22} />
  }
}

function normalizeSocialLinks(
  links: FooterSocialLink[] | null | undefined,
): NormalizedSocialLink[] {
  if (!Array.isArray(links)) {
    return []
  }

  const normalizedLinks: NormalizedSocialLink[] = []

  links.forEach((item, index) => {
    if (!item.icon) {
      return
    }

    const href = normalizeExternalUrl(item.url)

    if (href === '#') {
      return
    }

    normalizedLinks.push({
      id: item.id ?? `${item.icon}-${index}`,
      icon: item.icon,
      label: item.name?.trim() || getSocialLabel(item.icon),
      href,
    })
  })

  return normalizedLinks
}

function getChatUrl(
  chatUrl: string | null | undefined,
  zalo: string | null | undefined,
  phone: string,
): string {
  const explicitChatUrl =
    chatUrl?.trim()

  if (explicitChatUrl) {
    return normalizeExternalUrl(
      explicitChatUrl,
    )
  }

  const zaloValue = zalo?.trim()

  if (zaloValue) {
    if (
      zaloValue.startsWith('http://') ||
      zaloValue.startsWith('https://')
    ) {
      return zaloValue
    }

    return `https://zalo.me/${zaloValue.replace(
      /\D/g,
      '',
    )}`
  }

  return `https://zalo.me/${phone.replace(
    /\D/g,
    '',
  )}`
}

export const Footer = async () => {
  const payload = await getPayload({
    config: configPromise,
  })

  const settings = await getSiteSettings()

  const typedSettings =
    settings as unknown as {
      footer?: FooterSettings | null
      contact?: ContactSettings | null
    }

  const footerSettings =
    typedSettings.footer

  const contact =
    typedSettings.contact

  /* =====================================================
     LOGO
  ====================================================== */

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

  /* =====================================================
     CONTACT
  ====================================================== */

  const phone =
    contact?.phone?.trim() ||
    '0792979299'

  const email =
    contact?.email?.trim() ||
    'cskh@maraisdefrance.vn'

  const address =
    contact?.address?.trim() ||
    '220/24 Nguyễn Oanh, Gò Vấp, Thành phố Hồ Chí Minh'

  const workingHours =
    footerSettings?.workingHours?.trim() ||
    '8:00 – 22:00 (T2 – CN)'

  const description =
    footerSettings?.description?.trim() ||
    'Chuỗi cửa hàng mỹ phẩm & nước hoa\nchính hãng từ Pháp và thế giới.'

  const telHref = `tel:${phone.replace(
    /[^\d+]/g,
    '',
  )}`

  /* =====================================================
     MAP
  ====================================================== */

  const searchQuery =
    `Marais de France, ${address}`

  const encodedQuery =
    encodeURIComponent(searchQuery)

  const mapEmbedUrl =
    `https://maps.google.com/maps?q=${encodedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  const googleMapsUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`

  /* =====================================================
     LINKS
  ====================================================== */

  const aboutLinks =
    normalizeLinks(
      footerSettings?.aboutLinks,
      fallbackAboutLinks,
    )

  const policyLinks =
    normalizeLinks(
      footerSettings?.policyLinks,
      fallbackPolicyLinks,
    )

  /* =====================================================
     SOCIAL
  ====================================================== */

  const socialLinks = normalizeSocialLinks(
    footerSettings?.social,
  )

  const chatUrl = getChatUrl(
    footerSettings?.chatUrl,
    contact?.zalo,
    phone,
  )

  return (
    <footer className="relative overflow-hidden bg-[radial-gradient(circle_at_72%_20%,rgba(255,80,80,0.12),transparent_32%),linear-gradient(110deg,#8e0007_0%,#b20a10_47%,#970008_100%)] font-sans text-white antialiased">
      {/* Hiệu ứng sáng nền */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-red-400/10 blur-[100px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-180px] right-[15%] h-[420px] w-[420px] rounded-full bg-[#d8363c]/10 blur-[120px]"
      />

      <div className="container-custom relative z-10 px-5 pb-7 pt-12 sm:px-6 md:pt-16 lg:px-7">
        {/* =================================================
            TOP FOOTER
        ================================================== */}
        <div className="grid grid-cols-1 gap-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-[1.4fr_0.82fr_0.9fr_1.28fr_1.35fr] lg:gap-x-9 xl:gap-x-12">
          {/* ===============================================
              CỘT THƯƠNG HIỆU
          ================================================ */}
          <div className="flex flex-col items-center sm:items-start">
            <Link
              href="/"
              className="inline-flex items-center"
              aria-label="Trang chủ Marais de France"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  width={500}
                  height={150}
                  sizes="250px"
                  className="block h-auto w-[245px] object-contain object-left brightness-0 invert"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <FallbackLogoMark />

                  <span className="font-heading text-[27px] font-medium leading-none text-white">
                    Marais de France
                  </span>
                </div>
              )}
            </Link>

            <p className="mt-6 whitespace-pre-line text-[14px] font-normal leading-7 text-white/90 sm:text-[15px]">
              {description}
            </p>

            {/* SOCIAL */}
            {socialLinks.length > 0 ? (
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.map((item) => (
                  <SocialButton
                    key={item.id}
                    href={item.href}
                    label={item.label}
                  >
                    {getSocialIcon(item.icon)}
                  </SocialButton>
                ))}
              </div>
            ) : null}
          </div>

          {/* ===============================================
              VỀ CHÚNG TÔI
          ================================================ */}
          <FooterNavigationColumn
            title="Về chúng tôi"
            links={aboutLinks}
          />

          {/* ===============================================
              CHÍNH SÁCH
          ================================================ */}
          <FooterNavigationColumn
            title="Chính sách"
            links={policyLinks}
          />

          {/* ===============================================
              HỖ TRỢ KHÁCH HÀNG
          ================================================ */}
          <div>
            <FooterHeading>
              Hỗ trợ khách hàng
            </FooterHeading>

            <div className="mt-5 space-y-5">
              <a
                href={telHref}
                className="group flex items-center justify-center gap-3 text-[14px] font-normal text-white/90 transition-colors hover:text-white sm:justify-start sm:text-[15px]"
              >
                <Phone
                  size={18}
                  strokeWidth={1.8}
                  className="shrink-0"
                />

                <span>
                  Hotline: {phone}
                </span>
              </a>

              <a
                href={`mailto:${email}`}
                className="group flex items-center justify-center gap-3 text-[14px] font-normal text-white/90 transition-colors hover:text-white sm:justify-start sm:text-[15px]"
              >
                <Mail
                  size={19}
                  strokeWidth={1.8}
                  className="shrink-0"
                />

                <span className="break-all">
                  Email: {email}
                </span>
              </a>

              <div className="flex items-center justify-center gap-3 text-[14px] font-normal text-white/90 sm:justify-start sm:text-[15px]">
                <Clock3
                  size={19}
                  strokeWidth={1.8}
                  className="shrink-0"
                />

                <span>
                  Thời gian: {workingHours}
                </span>
              </div>
            </div>
          </div>

          {/* ===============================================
              BẢN ĐỒ
          ================================================ */}
          <div>
            <FooterHeading>
              Cửa hàng gần bạn
            </FooterHeading>

            <div className="relative mt-4 h-[150px] overflow-hidden rounded-[11px] border border-white/25 bg-white shadow-[0_10px_28px_rgba(59,0,0,0.20)]">
              <iframe
                title="Bản đồ Marais de France"
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen={false}
                referrerPolicy="no-referrer-when-downgrade"
                className="pointer-events-none h-full w-full border-0"
                style={{
                  filter:
                    'saturate(0.65) contrast(0.92) brightness(1.08)',
                }}
              />

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Xem cửa hàng Marais de France trên Google Maps"
                className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white/20 via-transparent to-transparent pb-3"
              >
                <span className="inline-flex h-9 items-center justify-center rounded-full bg-white px-6 text-[12px] font-semibold text-[#a4060d] shadow-[0_5px_15px_rgba(0,0,0,0.10)] transition-transform hover:scale-[1.03]">
                  Xem bản đồ
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* =================================================
            SEPARATOR
        ================================================== */}
        <div className="mt-9 h-px w-full bg-white/15 lg:mt-10" />

        {/* =================================================
            BOTTOM FOOTER
        ================================================== */}
        <div className="grid items-center gap-6 py-7 text-center lg:grid-cols-[1fr_auto_1fr] lg:text-left">
          {/* COPYRIGHT */}
          <p className="text-[13px] font-normal text-white/90 sm:text-[14px]">
            © {new Date().getFullYear()}{' '}
            Marais de France. All rights
            reserved.
          </p>

          {/* PAYMENT METHODS */}
          <PaymentMethods />

          {/* CHAT BUTTON */}
          <div className="flex justify-center lg:justify-end">
            <a
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-[50px] items-center gap-4 rounded-full bg-white px-6 text-[14px] font-medium text-[#202020] shadow-[0_9px_24px_rgba(66,0,0,0.22)] transition-transform hover:-translate-y-0.5 sm:px-7 sm:text-[15px]"
            >
              <span>
                Chat với chúng tôi
              </span>

              <span className="relative flex h-9 w-9 items-center justify-center">
                <MessageCircle
                  aria-hidden="true"
                  size={36}
                  fill="currentColor"
                  strokeWidth={0}
                  className="text-[#ad0810]"
                />

                <span className="absolute top-[15px] flex items-center gap-[2px]">
                  <span className="h-[3px] w-[3px] rounded-full bg-white" />
                  <span className="h-[3px] w-[3px] rounded-full bg-white" />
                  <span className="h-[3px] w-[3px] rounded-full bg-white" />
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* =========================================================
   FOOTER HEADING
========================================================= */

function FooterHeading({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <h3 className="text-[14px] font-bold uppercase leading-5 tracking-[0.015em] text-white sm:text-[15px]">
      {children}
    </h3>
  )
}

/* =========================================================
   NAVIGATION COLUMN
========================================================= */

function FooterNavigationColumn({
  title,
  links,
}: Readonly<{
  title: string
  links: FooterLink[]
}>) {
  return (
    <div>
      <FooterHeading>
        {title}
      </FooterHeading>

      <ul className="mt-5 space-y-4">
        {links.map((item, index) => (
          <li
            key={
              item.id ??
              `${item.label}-${index}`
            }
          >
            <Link
              href={item.link || '#'}
              className="text-[14px] font-normal leading-6 text-white/90 transition-colors hover:text-white sm:text-[15px]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* =========================================================
   SOCIAL BUTTON
========================================================= */

function SocialButton({
  href,
  label,
  children,
}: Readonly<{
  href: string
  label: string
  children: React.ReactNode
}>) {
  const className =
    'flex h-[43px] w-[43px] items-center justify-center rounded-full border border-white/35 text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#ad0810]'

  /**
   * Chưa thiết lập đường dẫn:
   * Dùng span thay vì thẻ a để không cần onClick.
   */
  if (!href || href === '#') {
    return (
      <span
        title={`${label} chưa được thiết lập`}
        className={`${className} cursor-default opacity-60`}
      >
        {children}
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className}
    >
      {children}
    </a>
  )
}

/* =========================================================
   PAYMENT METHODS
========================================================= */

function PaymentMethods() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3"
      aria-label="Các phương thức thanh toán"
    >
      {/* VISA */}
      <div className="flex h-[30px] w-[47px] items-center justify-center rounded-[3px] bg-white px-1 shadow-sm">
        <span className="text-[15px] font-black italic tracking-[-0.08em] text-[#193c91]">
          VISA
        </span>
      </div>

      {/* MASTERCARD */}
      <div className="relative flex h-[30px] w-[47px] items-center justify-center rounded-[3px] bg-white shadow-sm">
        <span className="absolute left-[10px] h-[18px] w-[18px] rounded-full bg-[#e8422d]" />

        <span className="absolute right-[10px] h-[18px] w-[18px] rounded-full bg-[#ef9b21] opacity-95" />

        <span className="relative z-10 text-[5px] font-semibold text-white">
          mastercard
        </span>
      </div>

      {/* MOMO */}
      <div className="flex h-[30px] w-[47px] items-center justify-center rounded-[3px] bg-white shadow-sm">
        <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[4px] bg-[#a50064] text-[8px] font-bold leading-[8px] text-white">
          mo
          <br />
          mo
        </span>
      </div>

      {/* ZALO PAY */}
      <div className="flex h-[30px] w-[47px] items-center justify-center rounded-[3px] bg-white shadow-sm">
        <span className="text-[9px] font-bold tracking-[-0.05em] text-[#1689e4]">
          Zalo
          <span className="text-[#55b449]">
            Pay
          </span>
        </span>
      </div>

      {/* NAPAS */}
      <div className="flex h-[30px] w-[47px] items-center justify-center rounded-[3px] bg-white shadow-sm">
        <span className="text-[9px] font-black italic tracking-[-0.06em] text-[#184b75]">
          napas
          <span className="text-[#57a53a]">
            24
          </span>
        </span>
      </div>
    </div>
  )
}

/* =========================================================
   FALLBACK LOGO
========================================================= */

function FallbackLogoMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className="h-12 w-12 text-white"
      fill="currentColor"
    >
      <path d="M28 8c0-4 2.2-7 4-8 1.8 1 4 4 4 8 0 3-1.1 5.5-4 8-2.9-2.5-4-5-4-8Z" />

      <path d="M15 21h9v33h-9V21Zm13 0h8v33h-8V21Zm12 0h9v33h-9V21Z" />

      <path d="M10 54h44v5H10v-5ZM12 17h40v5H12v-5Z" />
    </svg>
  )
}

/* =========================================================
   TIKTOK ICON
========================================================= */

function TikTokIcon({
  size = 22,
}: Readonly<{
  size?: number
}>) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M15.7 2c.2 1.7 1.2 3.2 2.7 4.1 1 .6 2.1.9 3.2.9v3.5c-2.2 0-4.2-.7-5.9-2v7.2c0 3.5-2.8 6.3-6.3 6.3S3 19.2 3 15.7s2.8-6.3 6.3-6.3c.4 0 .8 0 1.2.1v3.6c-.4-.1-.8-.2-1.2-.2-1.5 0-2.8 1.2-2.8 2.8s1.2 2.8 2.8 2.8 2.8-1.2 2.8-2.8V2h3.6Z" />
    </svg>
  )
}