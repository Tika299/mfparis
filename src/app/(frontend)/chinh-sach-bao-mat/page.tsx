import type { Metadata } from 'next'

import { PolicyDocument } from '@/components/PolicyDocument'
import { legacyPrivacyPolicyHtml } from '@/content/legacyPolicies'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật thông tin | MF Paris',
  description: 'Chính sách bảo vệ dữ liệu cá nhân và thông tin khách hàng của MF Paris.',
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyDocument
      path="/chinh-sach-bao-mat"
      title="Chính sách bảo mật thông tin"
      description="Chính sách bảo vệ dữ liệu cá nhân và thông tin khách hàng của MF Paris."
      contentHtml={legacyPrivacyPolicyHtml}
    />
  )
}
