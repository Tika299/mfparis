import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MapPin } from 'lucide-react'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Simple inline Instagram icon
const Instagram = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const Facebook = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2z" />
  </svg>
)

export const Footer = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  const logo = settings.header?.logo
  const logoUrl = logo && typeof logo === 'object' && 'url' in logo ? logo.url : null
  const logoAlt = logo && typeof logo === 'object' && 'alt' in logo ? logo.alt : 'MF Paris'

  const rawAddress = settings.contact?.address || 'Hồ Chí Minh, Việt Nam'
  const searchQuery = `Marais De France, ${rawAddress}`
  const encodedQuery = encodeURIComponent(searchQuery)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const googleMapsAppUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`

  return (
    <footer className="border-t bg-white pt-8 pb-8 font-sans antialiased md:pt-20">
      <div className="container-custom grid grid-cols-1 gap-12 text-center md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:text-left">
        {/* CỘT 1: THƯƠNG HIỆU */}
        <div className="flex flex-col items-center space-y-5 lg:items-start">
          <Link
            href="/"
            className="group flex shrink-0 items-center justify-center lg:justify-start"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={180}
                height={180}
                sizes="(max-width: 640px) 120px, (max-width: 1024px) 135px, 145px"
                className="block h-auto w-[105px] object-contain transition-transform duration-300 group-hover:scale-105 sm:w-[120px] lg:w-[130px]"
              />
            ) : (
              <div className="font-serif text-3xl font-black italic tracking-tighter text-[#b72828] uppercase">
                MF PARIS
              </div>
            )}
          </Link>

          <p className="max-w-[280px] text-[12px] leading-loose font-medium tracking-wider text-gray-500 uppercase">
            Tinh hoa dược mỹ phẩm và <br /> Nước hoa nội địa Pháp. <br /> Mang cả Paris về Sài Gòn.
          </p>

          <div className="flex justify-center gap-4 opacity-60 grayscale lg:justify-start">
            <Link href="#" className="transition-all hover:text-blue-600 hover:opacity-100">
              <Facebook size={18} />
            </Link>
            <Link href="#" className="transition-all hover:text-pink-600 hover:opacity-100">
              <Instagram size={18} />
            </Link>
          </div>
        </div>

        {/* CỘT 2: KHÁM PHÁ */}
        <div className="flex flex-col items-center lg:items-center">
          <h4 className="mb-7 inline-block border-b border-gray-100 pb-2 text-[11px] font-black tracking-[0.2em] text-gray-900 uppercase">
            Khám phá
          </h4>

          <ul className="space-y-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
            <li>
              <Link href="/about" className="transition-colors hover:text-[#b72828]">
                Về MF Paris
              </Link>
            </li>
            <li>
              <Link href="/products" className="transition-colors hover:text-[#b72828]">
                Sản phẩm mới
              </Link>
            </li>
            <li>
              <Link href="/blog" className="transition-colors hover:text-[#b72828]">
                Tạp chí làm đẹp
              </Link>
            </li>
            <li>
              <Link href="/brands" className="transition-colors hover:text-[#b72828]">
                Thương hiệu
              </Link>
            </li>
          </ul>
        </div>

        {/* CỘT 3: HỖ TRỢ */}
        <div className="flex flex-col items-center lg:items-center">
          <h4 className="mb-7 inline-block border-b border-gray-100 pb-2 text-[11px] font-black tracking-[0.2em] text-gray-900 uppercase">
            Chính sách
          </h4>

          <ul className="space-y-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
            <li>
              <Link href="#" className="transition-colors hover:text-[#b72828]">
                Chính sách đổi trả
              </Link>
            </li>
            <li>
              <Link href="#" className="transition-colors hover:text-[#b72828]">
                Vận chuyển & Giao hàng
              </Link>
            </li>
            <li>
              <Link href="#" className="transition-colors hover:text-[#b72828]">
                Thanh toán trả chậm
              </Link>
            </li>
            <li>
              <Link href="#" className="transition-colors hover:text-[#b72828]">
                Bảo mật thông tin
              </Link>
            </li>
          </ul>
        </div>

        {/* CỘT 4: VỊ TRÍ */}
        <div className="flex flex-col items-center space-y-6 lg:items-center">
          <h4 className="mb-1 inline-block border-b border-gray-100 pb-2 text-[11px] font-black tracking-[0.2em] text-gray-900 uppercase">
            Vị trí cửa hàng
          </h4>

          <div className="group relative h-44 w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm lg:max-w-none">
            <iframe
              title="MF Paris Google Maps"
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'grayscale(0.6) contrast(1.1)' }}
              allowFullScreen={false}
              loading="lazy"
              className="transition-all duration-700 group-hover:grayscale-0"
            />

            <a
              href={googleMapsAppUrl}
              target="_blank"
              rel="noopener"
              className="group/btn absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10"
            >
              <div className="flex translate-y-2 items-center gap-2 rounded-full bg-white px-4 py-2 opacity-0 shadow-2xl transition-all group-hover/btn:translate-y-0 group-hover/btn:opacity-100">
                <MapPin size={12} className="text-[#b72828]" />
                <span className="text-[10px] font-black text-black uppercase">Chỉ đường</span>
              </div>
            </a>
          </div>

          <div className="flex max-w-[320px] items-start justify-center gap-2 text-center lg:justify-start lg:text-left">
            <MapPin size={14} className="mt-0.5 shrink-0 text-[#b72828]" />
            <p className="text-[11px] leading-relaxed font-bold tracking-tighter text-gray-400 uppercase italic">
              {rawAddress}
            </p>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="container-custom mt-14 border-t border-gray-50 pt-8 md:mt-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center text-[9px] font-bold tracking-[0.3em] text-gray-400 uppercase md:flex-row md:justify-between md:text-left">
          <span>&copy; {new Date().getFullYear()} MF PARIS. AUTHENTIC BEAUTY.</span>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <span className="cursor-help transition-colors hover:text-black">
              Designed for Excellence
            </span>
            <span className="text-gray-200">|</span>
            <span className="cursor-help transition-colors hover:text-black">French Standard</span>
          </div>
        </div>
      </div>
    </footer>
  )
}