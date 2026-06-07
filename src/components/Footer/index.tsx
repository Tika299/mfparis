import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MapPin } from 'lucide-react'
import React from 'react'

// Simple inline Instagram icon (lucide-react in this environment doesn't export Instagram)
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
import Link from 'next/link'

export const Footer = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  const rawAddress = settings.contact?.address || 'Hồ Chí Minh, Việt Nam'
  const searchQuery = `Marais De France, ${rawAddress}`
  const encodedQuery = encodeURIComponent(searchQuery)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const googleMapsAppUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`

  return (
    <footer className="bg-white pt-20 pb-8 border-t font-sans antialiased">
      <div className="container-custom grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

        {/* CỘT 1: THƯƠNG HIỆU */}
        <div className="space-y-6">
          <div className="text-3xl font-black italic tracking-tighter uppercase font-serif text-[#b72828]">MF PARIS</div>
          <p className="text-gray-500 text-[12px] leading-loose uppercase font-medium tracking-wider">
            Tinh hoa dược mỹ phẩm và <br /> Nước hoa nội địa Pháp. <br /> Mang cả Paris về Sài Gòn.
          </p>
          <div className="flex gap-4 grayscale opacity-60">
            <Link href="#" className="hover:opacity-100 hover:text-blue-600 transition-all"><Facebook size={18} /></Link>
            <Link href="#" className="hover:opacity-100 hover:text-pink-600 transition-all"><Instagram size={18} /></Link>
          </div>
        </div>

        {/* CỘT 2: KHÁM PHÁ */}
        <div>
          <h4 className="font-black text-[11px] uppercase tracking-[0.2em] mb-8 text-gray-900 border-b border-gray-50 pb-2 inline-block">Khám phá</h4>
          <ul className="text-gray-500 text-xs space-y-4 font-bold uppercase tracking-widest">
            <li><Link href="/about" className="hover:text-[#b72828] transition-colors">Về MF Paris</Link></li>
            <li><Link href="/products" className="hover:text-[#b72828] transition-colors">Sản phẩm mới</Link></li>
            <li><Link href="/blog" className="hover:text-[#b72828] transition-colors">Tạp chí làm đẹp</Link></li>
            <li><Link href="/brands" className="hover:text-[#b72828] transition-colors">Thương hiệu</Link></li>
          </ul>
        </div>

        {/* CỘT 3: HỖ TRỢ */}
        <div>
          <h4 className="font-black text-[11px] uppercase tracking-[0.2em] mb-8 text-gray-900 border-b border-gray-50 pb-2 inline-block">Chính sách</h4>
          <ul className="text-gray-500 text-xs space-y-4 font-bold uppercase tracking-widest">
            <li><Link href="#" className="hover:text-[#b72828] transition-colors">Chính sách đổi trả</Link></li>
            <li><Link href="#" className="hover:text-[#b72828] transition-colors">Vận chuyển & Giao hàng</Link></li>
            <li><Link href="#" className="hover:text-[#b72828] transition-colors">Thanh toán trả chậm</Link></li>
            <li><Link href="#" className="hover:text-[#b72828] transition-colors">Bảo mật thông tin</Link></li>
          </ul>
        </div>

        {/* CỘT 4: VỊ TRÍ (MAP) */}
        <div className="space-y-6">
          <h4 className="font-black text-[11px] uppercase tracking-[0.2em] mb-6 text-gray-900 border-b border-gray-50 pb-2 inline-block">Vị trí cửa hàng</h4>

          <div className="group relative w-full h-44 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
            <iframe
              src={mapEmbedUrl}
              width="100%" height="100%"
              style={{ border: 0, filter: 'grayscale(0.6) contrast(1.1)' }}
              allowFullScreen={false} loading="lazy"
              className="group-hover:grayscale-0 transition-all duration-700"
            />
            <a href={googleMapsAppUrl} target="_blank" rel="noopener" className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors group/btn">
              <div className="bg-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 opacity-0 group-hover/btn:opacity-100 transition-all translate-y-2 group-hover/btn:translate-y-0">
                <MapPin size={12} className="text-[#b72828]" />
                <span className="text-[10px] font-black uppercase text-black">Chỉ đường</span>
              </div>
            </a>
          </div>

          <div className="flex gap-2 items-start group cursor-default">
            <MapPin size={14} className="text-[#b72828] shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed font-bold uppercase tracking-tighter italic">
              {rawAddress}
            </p>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="container-custom mt-16 pt-8 border-t border-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em]">
          <span>&copy; {new Date().getFullYear()} MF PARIS. AUTHENTIC BEAUTY.</span>
          <div className="flex gap-4">
            <span className="hover:text-black cursor-help transition-colors">Designed for Excellence</span>
            <span className="text-gray-200">|</span>
            <span className="hover:text-black cursor-help transition-colors">French Standard</span>
          </div>
        </div>
      </div>
    </footer>
  )
}