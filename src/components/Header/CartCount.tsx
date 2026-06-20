'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store'

type CartCountProps = {
  showZero?: boolean
  className?: string
}

export const CartCount = ({
  showZero = false,
  className = '',
}: CartCountProps) => {
  const [isClient, setIsClient] =
    useState(false)

  const items = useCartStore(
    (state) => state.items,
  )

  const count = items.reduce(
    (total, item) =>
      total + item.quantity,
    0,
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

  const displayedCount = isClient
    ? count
    : 0

  if (
    !showZero &&
    (!isClient || displayedCount <= 0)
  ) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold leading-none text-white ${className}`}
      aria-label={`${displayedCount} sản phẩm trong giỏ hàng`}
    >
      {displayedCount > 99
        ? '99+'
        : displayedCount}
    </span>
  )
}