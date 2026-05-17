import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const FloatingContact = async () => {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'site-settings' })

  // Lấy dữ liệu từ Admin (Site Settings -> Contact)
  const phone = settings.contact?.phone || '0123456789'
  const zalo = settings.contact?.zaloLink || 'https://zalo.me/2731577726641619342'

  return (
    <div className="fixed bottom-10 right-6 z-[999] flex flex-col gap-5 items-center">
      {/* NÚT ZALO */}
      <a
        href={zalo}
        target="_blank"
        rel="nofollow"
        className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300 border border-blue-50"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
          alt="Zalo"
          className="w-9 h-9"
        />
      </a>

      {/* NÚT PHONE (MÀU XANH LÁ + RUNG) */}
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        className="phone-wrapper w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-green-600 transition-all duration-300"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white animate-ring">
          <path
            d="M6.62 10.79c1.44 2.83 2.62 4.01 5.45 5.45l2.21-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.22z"
            fill="currentColor"
          />
        </svg>
      </a>
    </div>
  )
}
