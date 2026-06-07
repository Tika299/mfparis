// D:\mfparis\src\components\FloatingContact\index.tsx
import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { LiveChat } from '../LiveChat'
import { BackToTopButton } from '../BackToTopButton'

export const FloatingContact = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  const phone = settings.contact?.phone || '0123456789'
  const zalo = settings.contact?.zaloLink || 'https://zalo.me/...'

  return (
    <div className="fixed bottom-4 right-3 z-[999] flex flex-col items-center gap-3 sm:bottom-5 sm:right-4 md:bottom-6 md:right-6 md:gap-4">
      <BackToTopButton />
      <LiveChat />

      <a
        href={zalo}
        target="_blank"
        rel="nofollow"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-50 bg-white shadow-lg transition-transform duration-300 hover:scale-110 sm:h-12 sm:w-12 md:h-14 md:w-14"
        aria-label="Zalo"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
          alt="Zalo"
          className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
      </a>

      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        className="phone-wrapper flex h-11 w-11 items-center justify-center rounded-full bg-green-500 shadow-xl transition-all duration-300 hover:bg-green-600 sm:h-12 sm:w-12 md:h-14 md:w-14"
        aria-label="Gọi điện"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-ring text-white sm:h-6 sm:w-6 md:h-7 md:w-7">
          <path
            d="M6.62 10.79c1.44 2.83 2.62 4.01 5.45 5.45l2.21-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.22z"
            fill="currentColor"
          />
        </svg>
      </a>
    </div>
  )
}