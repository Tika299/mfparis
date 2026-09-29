'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { SearchFiltersProps } from './search-filters.types'

const LazySearchFilters = dynamic(
    () => import('./SearchFilters').then((module) => module.SearchFilters),
    {
        ssr: false,
        loading: () => (
            <div role="status" className="min-h-12 p-3 text-sm">
                Đang tải bộ lọc…
            </div>
        ),
    },
)

export function ViewportSearchFilters(props: SearchFiltersProps) {
    const variant = props.variant ?? 'responsive'
    const [activeVariant, setActiveVariant] = useState<string | null>(null)

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)')
        const tablet = window.matchMedia('(min-width: 768px)')
        const update = () => {
            setActiveVariant(
                desktop.matches ? 'sidebar' : tablet.matches ? 'horizontal' : 'mobile-fab',
            )
        }
        update()
        desktop.addEventListener('change', update)
        tablet.addEventListener('change', update)
        return () => {
            desktop.removeEventListener('change', update)
            tablet.removeEventListener('change', update)
        }
    }, [])

    if (!activeVariant) return null
    if (variant !== 'responsive' && variant !== activeVariant) return null

    return <LazySearchFilters {...props} />
}