import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Không tìm thấy | MF Paris',
  robots: {
    index: false,
    follow: false,
  },
}

export default function TestFilterPage() {
  notFound()
}
