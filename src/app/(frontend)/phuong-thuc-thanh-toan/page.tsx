import type { Metadata } from 'next'

import { PolicyDocument } from '@/components/PolicyDocument'
import { legacyPaymentPolicyHtml } from '@/content/legacyPolicies'

export const metadata: Metadata = {
  title: 'Phương thức thanh toán | MF Paris',
  description: 'Các phương thức thanh toán và quy định giao dịch tại MF Paris.',
}

export default function PaymentMethodsPage() {
  return (
    <PolicyDocument
      path="/phuong-thuc-thanh-toan"
      title="Phương thức thanh toán"
      description="Các phương thức thanh toán và quy định giao dịch tại MF Paris."
      contentHtml={legacyPaymentPolicyHtml}
    />
  )
}
