// src/components/FloatingContact/index.tsx

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { BackToTopButton } from '../BackToTopButton'
import { FloatingContactMenu } from './FloatingContactMenu'

type ContactSettings = {
  phone?: string | null
  zalo?: string | null
  zaloLink?: string | null
}

export const FloatingContact = async () => {
  const payload = await getPayload({
    config: configPromise,
  })

  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 1,
  })

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
    <>
      {/* Back To Top luôn hiển thị độc lập */}
      <div
        className={[
          'fixed bottom-[84px] right-3 z-[998]',
          'sm:bottom-[96px] sm:right-5',
          'md:bottom-[104px] md:right-7',

          /*
           * Ghi đè nếu BackToTopButton đang tự dùng fixed.
           */
          '[&>*]:!static',
          '[&>*]:!bottom-auto',
          '[&>*]:!right-auto',
          '[&>*]:!m-0',
        ].join(' ')}
      >
        <BackToTopButton />
      </div>

      {/* Cụm Live Chat, Zalo và điện thoại */}
      <FloatingContactMenu
        phone={phone}
        zalo={zalo}
      />
    </>
  )
}