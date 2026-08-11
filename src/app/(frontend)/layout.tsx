import type { Metadata } from 'next'
import { Suspense } from 'react'

export const revalidate = 300

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import '../globals.css'
import '@/styles/floating-contact.css'
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google'
import { FloatingContact } from '@/components/FloatingContact'
import { Toaster } from 'sonner'
import { SITE_ORIGIN } from '@/utilities/seo'
import { ClientEnhancements } from '@/components/ClientEnhancements'
import { RouteLoadingIndicator } from '@/components/RouteLoadingIndicator'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  SITE_ORIGIN

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MF Paris Chính Hãng',
    template: '%s | MF Paris',
  },
  description:
    'MF Paris chuyên nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng từ Pháp và Châu Âu, tuyển chọn kỹ lưỡng cùng dịch vụ tư vấn tận tâm.',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'MF Paris',
    title: 'MF Paris Chính Hãng',
    description:
      'MF Paris chuyên nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng từ Pháp và Châu Âu, tuyển chọn kỹ lưỡng cùng dịch vụ tư vấn tận tâm.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MF Paris Chính Hãng',
    description:
      'MF Paris chuyên nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng từ Pháp và Châu Âu, tuyển chọn kỹ lưỡng cùng dịch vụ tư vấn tận tâm.',
  },
}

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
        <ClientEnhancements />
        <Suspense fallback={null}>
          <RouteLoadingIndicator />
        </Suspense>
        <Header />
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
