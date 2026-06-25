import { FloatingContactMenu } from './FloatingContactMenu'
import { getSiteSettings } from '@/data/getSiteSettings'

type ContactSettings = {
  phone?: string | null
  zalo?: string | null
  zaloLink?: string | null
}

export const FloatingContact = async () => {
  const settings = await getSiteSettings()

  const contact =
    settings.contact as
    | ContactSettings
    | null
    | undefined

  const phone =
    contact?.phone?.trim() ||
    '0792979299'

  const zalo =
    contact?.zaloLink?.trim() ||
    contact?.zalo?.trim() ||
    'https://zalo.me/0792979299'

  return (
    <FloatingContactMenu
      phone={phone}
      zalo={zalo}
    />
  )
}