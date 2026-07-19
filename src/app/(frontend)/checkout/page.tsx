export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { getSiteSettings } from '@/data/getSiteSettings'
import CheckoutClient, {
  type BankTransferSettings,
} from './CheckoutClient'

type CheckoutPageProps = Readonly<{
  searchParams?: Promise<{
    payment?: string
  }>
}>

function getMediaUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as {
    url?: unknown
  }

  return typeof record.url === 'string' && record.url.trim()
    ? record.url
    : null
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const settings = await getSiteSettings()
  const resolvedSearchParams = await searchParams
  const initialPaymentMethod =
    resolvedSearchParams?.payment === 'fundiin'
      ? 'fundiin'
      : 'bank_transfer'

  const payment = (settings as unknown as {
    payment?: {
      bankName?: string | null
      bankAccountName?: string | null
      bankAccountNumber?: string | null
      bankBranch?: string | null
      bankQrImage?: unknown
    } | null
  }).payment

  const bankTransfer: BankTransferSettings = {
    bankName: payment?.bankName?.trim() || null,
    bankAccountName: payment?.bankAccountName?.trim() || null,
    bankAccountNumber: payment?.bankAccountNumber?.trim() || null,
    bankBranch: payment?.bankBranch?.trim() || null,
    bankQrImageUrl: getMediaUrl(payment?.bankQrImage),
  }

  return (
    <CheckoutClient
      bankTransfer={bankTransfer}
      initialPaymentMethod={initialPaymentMethod}
    />
  )
}