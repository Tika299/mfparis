'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const WishlistHydrator = dynamic(
    () =>
        import('@/components/WishlistHydrator').then(
            (mod) => mod.WishlistHydrator,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

const GlobalEnterHandler = dynamic(
    () =>
        import('@/components/GlobalEnterHandler').then(
            (mod) => mod.GlobalEnterHandler,
        ),
    {
        ssr: false,
        loading: () => null,
    },
)

export function ClientEnhancements() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const id = window.setTimeout(() => {
            setReady(true)
        }, 1)

        return () => window.clearTimeout(id)
    }, [])

    if (!ready) {
        return null
    }

    return (
        <>
            <WishlistHydrator />
            <GlobalEnterHandler />
        </>
    )
}