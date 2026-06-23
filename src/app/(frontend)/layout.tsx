export const revalidate = 300

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import '../globals.css'
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google'
import { FloatingContact } from '@/components/FloatingContact'
import { Toaster } from 'sonner'
import { GlobalEnterHandler } from '@/components/GlobalEnterHandler'
import { WishlistHydrator } from '@/components/WishlistHydrator'

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-playfair',
  display: 'swap',
})

// Cấu hình Be Vietnam Pro
const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${beVietnam.variable} ${playfair.variable}`}>
      <body className="flex min-h-screen flex-col font-sans text-[#1a1a1a] antialiased">
        <WishlistHydrator />
        <Header />
        <GlobalEnterHandler />
        <main className="flex-grow">{children}</main>
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
            className: 'top-center border-gray-100 shadow-2xl',
          }}
        />
        {/* NÚT LIÊN HỆ GÓC TRÁI MÀN HÌNH */}
        <FloatingContact />
      </body>
    </html>
  )
}