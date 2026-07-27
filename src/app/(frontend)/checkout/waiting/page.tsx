import type { Metadata } from 'next'
import { Suspense } from 'react'

import CheckoutWaitingClient from './CheckoutWaitingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export const metadata: Metadata = {
  title: 'Đang xử lý thanh toán | MF Paris',
  description: 'Trang chờ xử lý thanh toán đơn hàng tại MF Paris.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CheckoutWaitingPage() {
    return (
        <Suspense fallback={null}>
            <CheckoutWaitingClient />
        </Suspense>
    )
}
