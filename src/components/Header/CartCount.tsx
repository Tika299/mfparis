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

  if (!isClient) return <span className="...">0</span>

  return (
    <span className="absolute top-0 left-0 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
      {count}
    </span>
  )
}
