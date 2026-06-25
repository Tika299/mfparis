'use client'

import { useEffect, useRef, useState } from 'react'

type LazySectionProps = {
    children: React.ReactNode
    minHeight?: number
    rootMargin?: string
    placeholder?: React.ReactNode
}

export function LazySection({
    children,
    minHeight = 320,
    rootMargin = '300px',
    placeholder,
}: LazySectionProps) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [isVisible, setIsVisible] =
        useState(false)

    useEffect(() => {
        const node = ref.current

        if (!node || isVisible) {
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]

                if (entry?.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin },
        )

        observer.observe(node)

        return () => observer.disconnect()
    }, [isVisible, rootMargin])

    return (
        <div
            ref={ref}
            style={{ minHeight }}
        >
            {isVisible
                ? children
                : placeholder ?? (
                    <div
                        className="w-full animate-pulse rounded-3xl bg-neutral-100"
                        style={{ minHeight }}
                    />
                )}
        </div>
    )
}