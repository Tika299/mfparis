'use client'

import { useEffect } from 'react'
import { useWishlistStore } from '@/lib/store'

export function WishlistHydrator() {
    useEffect(() => {
        let isMounted = true

        const hydrateWishlist =
            async (): Promise<void> => {
                try {
                    await useWishlistStore.persist.rehydrate()
                } catch (error) {
                    console.error(
                        '[Wishlist] Hydration failed:',
                        error,
                    )
                } finally {
                    if (isMounted) {
                        useWishlistStore
                            .getState()
                            .setHasHydrated(true)
                    }
                }
            }

        void hydrateWishlist()

        return () => {
            isMounted = false
        }
    }, [])

    return null
}