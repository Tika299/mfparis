import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MapPin } from 'lucide-react'
import Link from 'next/link'

export const Footer = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  // 1. Lấy địa chỉ thuần văn bản từ trường address có sẵn trong Admin của bạn
  const rawAddress = settings.contact?.address || 'Hồ Chí Minh, Việt Nam'

  // 2. Mẹo tối ưu: Kết hợp Tên Shop + Địa chỉ để Google trỏ chính xác nhất
  // Chúng ta gộp "MF PARIS" vào truy vấn tìm kiếm
  const searchQuery = `Marais De France, ${rawAddress}`
  const encodedQuery = encodeURIComponent(searchQuery)

  // Link nhúng bản đồ (Free, không cần API Key)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  // Link để mở ứng dụng Google Maps khi click
  const googleMapsAppUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`

  return (
    <footer className="bg-white pt-24 pb-12 border-t font-sans">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
        {/* CỘT 1: BRANDING */}
        <div className="space-y-6 text-center md:text-left">
          <div className="text-3xl font-black italic tracking-tighter uppercase font-serif text-[#16423C]">
            MF PARIS
          </div>
          <p className="text-gray-400 text-[10px] leading-loose tracking-[0.2em] uppercase font-bold">
            L&apos;art de la beauté Française.
            <br />
            Tinh hoa dược mỹ phẩm Pháp.
            <br />
            Sài Gòn, Việt Nam.
          </p>
        </div>

        {/* CỘT 2: VỀ CHÚNG TÔI */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-8 text-gray-900">
            Về chúng tôi
          </h4>
          <ul className="text-gray-500 text-xs space-y-4 uppercase tracking-widest font-medium">
            <li className="hover:text-black cursor-pointer transition-colors">
              <Link href="/about">Câu chuyện</Link>
            </li>
            <li className="hover:text-black cursor-pointer transition-colors">Tuyển dụng</li>
            <li className="hover:text-black cursor-pointer transition-colors">Liên hệ</li>
          </ul>
        </div>

        {/* CỘT 3: HỖ TRỢ */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-8 text-gray-900">
            Hỗ trợ
          </h4>
          <ul className="text-gray-500 text-xs space-y-4 uppercase tracking-widest font-medium">
            <li className="hover:text-black cursor-pointer transition-colors">Vận chuyển</li>
            <li className="hover:text-black cursor-pointer transition-colors">Đổi trả 7 ngày</li>
            <li className="hover:text-black cursor-pointer transition-colors">
              Thanh toán Fundiin
            </li>
          </ul>
        </div>

        {/* CỘT 4: GOOGLE MAP TỰ ĐỘNG TỪ ĐỊA CHỈ */}
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-6 text-gray-900 text-center md:text-left">
            Vị trí cửa hàng
          </h4>

          <div className="group relative w-full h-40 rounded-[1.5rem] overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
            {/* Iframe tự động nhận diện address */}
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'grayscale(0.5) contrast(1.2)' }}
              allowFullScreen={false}
              loading="lazy"
              className="group-hover:grayscale-0 transition-all duration-700"
            />

            {/* Overlay link mở app Google Map */}
            <a
              href={googleMapsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center group/btn"
            >
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-xl flex items-center gap-2 opacity-0 group-hover/btn:opacity-100 transition-all duration-300 translate-y-2 group-hover/btn:translate-y-0">
                <MapPin size={12} className="text-red-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-black">
                  Mở bản đồ
                </span>
              </div>
            </a>
          </div>

          <p className="text-[10px] text-gray-400 text-center md:text-left italic leading-relaxed">
            {rawAddress}
          </p>

          <div className="flex space-x-6 pt-2 grayscale opacity-50 justify-center md:justify-start">
            <i className="fa-brands fa-facebook-f text-lg hover:text-blue-600 cursor-pointer"></i>
            <i className="fa-brands fa-instagram text-lg hover:text-pink-600 cursor-pointer"></i>
            <i className="fa-brands fa-tiktok text-lg hover:text-black cursor-pointer"></i>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-20 pt-8 border-t text-center text-[10px] text-gray-400 uppercase tracking-[0.3em]">
        &copy; {new Date().getFullYear()} MF PARIS. Authentic French Beauty Service.
      </div>
    </footer>
  )
}
