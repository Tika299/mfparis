import type { Metadata } from 'next'

import { PolicyDocument } from '@/components/PolicyDocument'
import { legacyShippingPolicyHtml } from '@/content/legacyPolicies'

export const metadata: Metadata = {
  title: 'Chính sách vận chuyển và giao nhận | MF Paris',
  description: 'Chính sách vận chuyển, giao nhận và kiểm tra đơn hàng tại MF Paris.',
}

export default function ShippingPolicyPage() {
  return (
    <PolicyDocument
      path="/chinh-sach-van-chuyen"
      title="Chính sách vận chuyển và giao nhận"
      description="Chính sách vận chuyển, giao nhận và kiểm tra đơn hàng tại MF Paris."
      contentHtml={legacyShippingPolicyHtml}
    />
  )
}
