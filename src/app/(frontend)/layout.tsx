import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import '../globals.css'
import { Be_Vietnam_Pro } from 'next/font/google' // Thay đổi ở đây
import { FloatingContact } from '@/components/FloatingContact'
import { Toaster } from 'sonner'

// Cấu hình Be Vietnam Pro
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['100', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${beVietnamPro.variable}`}>
      <body className="font-sans antialiased text-[#1a1a1a]">
        <Header />
        <main>{children}</main>
        <Footer />
        {/* Cấu hình Toaster cho sang trọng */}
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: '1.2rem',
              fontFamily: 'var(--font-be-vietnam)',
            },
            className: "border-gray-100 shadow-2xl",
          }}
        />
        {/* NÚT LIÊN HỆ GÓC TRÁI MÀN HÌNH */}
        <FloatingContact />
      </body>
    </html>
  )
}
