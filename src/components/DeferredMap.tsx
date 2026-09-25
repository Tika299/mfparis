'use client'

import { useEffect, useRef, useState } from 'react'

export function DeferredMap({ src }: { src: string }) {
    const container = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const element = container.current
        if (!element) return

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            setVisible(true)
            observer.disconnect()
        }, { rootMargin: '100px' })

        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={container} className="h-full w-full bg-neutral-100">
            {visible && (
                <iframe
                    title="Bản đồ Marais de France"
                    src={src}
                    width="100%"
                    height="100%"
                    loading="lazy"
                    allowFullScreen={false}
                    referrerPolicy="no-referrer-when-downgrade"
                    className="pointer-events-none h-full w-full border-0"
                    style={{
                        filter: 'saturate(0.65) contrast(0.92) brightness(1.08)',
                    }}
                />
            )}
        </div>
    )
}