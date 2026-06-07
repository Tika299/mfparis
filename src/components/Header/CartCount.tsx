'use client'

import { useCartStore } from '@/lib/store'
import { useEffect, useState } from 'react'

export const CartCount = () => {
  const [isClient, setIsClient] = useState(false)
  const items = useCartStore((state) => state.items)

  const count = items.reduce((acc, item) => acc + item.quantity, 0)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || count <= 0) {
    return null
  }

  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}