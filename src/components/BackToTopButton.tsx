'use client'

import React, { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

export const BackToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 500)
        }

        handleScroll()
        window.addEventListener('scroll', handleScroll)

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    if (!isVisible) return null

    return (
        <button
            type="button"
            onClick={scrollToTop}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E54D2E] text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-[#c93f25] sm:h-12 sm:w-12 md:h-14 md:w-14"
            aria-label="Trở lại đầu trang"
        >
            <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
        </button>
    )
}