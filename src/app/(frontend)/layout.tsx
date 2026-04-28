import { Header } from '@/components/Header'
import '../globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.className}>
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <footer className="bg-black text-white py-16">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h3 className="font-bold uppercase mb-6 tracking-widest">Về MF Paris</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Chuyên cung cấp Nước hoa & Mỹ phẩm Pháp chính hãng. Tận tâm phục vụ vẻ đẹp của bạn.
              </p>
            </div>
            <div>
              <h3 className="font-bold uppercase mb-6 tracking-widest">Hỗ trợ khách hàng</h3>
              <ul className="text-gray-400 text-sm space-y-3">
                <li>Hướng dẫn mua hàng</li>
                <li>Chính sách đổi trả</li>
                <li>Thanh toán Fundiin</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold uppercase mb-6 tracking-widest">Liên hệ</h3>
              <p className="text-gray-400 text-sm">Hotline: 0123 456 789</p>
              <p className="text-gray-400 text-sm">Địa chỉ: Quận 1, TP. Hồ Chí Minh</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
