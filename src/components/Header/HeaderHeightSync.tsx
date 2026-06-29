'use client'

import { useEffect } from 'react'

const HEADER_HEIGHT_VARIABLE = '--site-header-height'

export const HeaderHeightSync = () => {
    useEffect(() => {
        const header = document.querySelector<HTMLElement>(
            '[data-site-header]',
        )

        if (!header) return

        const root = document.documentElement

        const updateHeaderHeight = () => {
            const height = Math.ceil(
                header.getBoundingClientRect().height,
            )

            root.style.setProperty(
                HEADER_HEIGHT_VARIABLE,
                `${height}px`,
            )
        }

        updateHeaderHeight()

        const resizeObserver = new ResizeObserver(
            updateHeaderHeight,
        )

        resizeObserver.observe(header)
        window.addEventListener('resize', updateHeaderHeight)

        return () => {
            resizeObserver.disconnect()

            window.removeEventListener(
                'resize',
                updateHeaderHeight,
            )
        }
    }, [])

    return null
}