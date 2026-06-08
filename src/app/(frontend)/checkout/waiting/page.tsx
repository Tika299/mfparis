export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { Suspense } from 'react'
import CheckoutWaitingClient from './CheckoutWaitingClient'

export default function CheckoutWaitingPage() {
    return (
        <Suspense fallback={null}>
            <CheckoutWaitingClient />
        </Suspense>
    )
}