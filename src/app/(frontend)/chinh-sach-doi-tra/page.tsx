import type { Metadata } from 'next'

import { PolicyDocument } from '@/components/PolicyDocument'
import { legacyWarrantyPolicyHtml } from '@/content/legacyPolicies'

export const metadata: Metadata = {
  title: 'Chính sách đổi trả và bảo hành | MF Paris',
  description: 'Chính sách đổi trả và bảo hành sản phẩm tại MF Paris.',
}

export default function ReturnPolicyPage() {
  return (
    <PolicyDocument
      path="/chinh-sach-doi-tra"
      title="Chính sách đổi trả và bảo hành"
      description="Chính sách đổi trả và bảo hành sản phẩm tại MF Paris."
      contentHtml={legacyWarrantyPolicyHtml}
    />
  )
}
