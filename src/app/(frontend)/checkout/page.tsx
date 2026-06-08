export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import CheckoutClient from './CheckoutClient'

export default function CheckoutPage() {
  return <CheckoutClient />
}