import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const Footer = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  return (
    <footer className="bg-white pt-24 pb-12 border-t">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="space-y-6">
          <div className="text-3xl font-black italic tracking-tighter uppercase">MF PARIS</div>
          <p className="text-gray-400 text-xs leading-loose tracking-widest uppercase font-bold">
            L'art de la beauté Française.
            <br />
            Tinh hoa dược mỹ phẩm Pháp.
            <br />
            Sài Gòn, Việt Nam.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-8">Về chúng tôi</h4>
          <ul className="text-gray-500 text-xs space-y-4 uppercase tracking-widest font-medium">
            <li className="hover:text-black cursor-pointer">Câu chuyện</li>
            <li className="hover:text-black cursor-pointer">Tuyển dụng</li>
            <li className="hover:text-black cursor-pointer">Liên hệ</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-8">Hỗ trợ</h4>
          <ul className="text-gray-500 text-xs space-y-4 uppercase tracking-widest font-medium">
            <li className="hover:text-black cursor-pointer">Vận chuyển</li>
            <li className="hover:text-black cursor-pointer">Đổi trả 7 ngày</li>
            <li className="hover:text-black cursor-pointer">Fundiin (BNPL)</li>
          </ul>
        </div>
        <div className="space-y-6">
          <h4 className="font-bold text-[11px] uppercase tracking-[0.3em] mb-8">Đăng ký</h4>
          <div className="flex border-b border-black pb-2">
            <input
              type="email"
              placeholder="Email của bạn"
              className="bg-transparent outline-none border-none px-0 py-1 w-full focus:ring-0 text-sm"
            />
            <button className="font-bold text-xs uppercase tracking-widest">Gửi</button>
          </div>
          <div className="flex space-x-6 pt-4 grayscale opacity-50">
            <i className="fa-brands fa-facebook-f text-lg"></i>
            <i className="fa-brands fa-instagram text-lg"></i>
            <i className="fa-brands fa-tiktok text-lg"></i>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-20 pt-8 border-t text-center text-[10px] text-gray-400 uppercase tracking-[0.3em]">
        &copy; 2024 MF PARIS. Authentic French Beauty Service.
      </div>
    </footer>
  )
}
