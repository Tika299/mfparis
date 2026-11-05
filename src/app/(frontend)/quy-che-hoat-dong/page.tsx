import type { Metadata } from 'next'

import { PolicyDocument } from '@/components/PolicyDocument'
import { legacyOperationRulesHtml } from '@/content/legacyPolicies'

export const metadata: Metadata = {
  title: 'Quy chế hoạt động | MF Paris',
  description: 'Quy chế hoạt động của website MF Paris và các điều khoản giao dịch.',
}

export default function OperationRulesPage() {
  return (
    <PolicyDocument
      path="/quy-che-hoat-dong"
      title="Quy chế hoạt động"
      description="Quy chế hoạt động của website MF Paris và các điều khoản giao dịch."
      contentHtml={legacyOperationRulesHtml}
    />
  )
}
