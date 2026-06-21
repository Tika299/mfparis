'use client'

import {
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    MessageCircle,
    Phone,
    X,
} from 'lucide-react'

import { LiveChat } from '../LiveChat'
import { cn } from '@/utilities'

type FloatingContactMenuProps =
    Readonly<{
        phone: string
        zalo: string
    }>

type FloatingActionProps =
    Readonly<{
        open: boolean
        positionClassName: string
        delay: number
        label: string
        children: React.ReactNode
    }>

function normalizeZaloUrl(
    value: string,
): string {
    const normalizedValue =
        value.trim()

    if (
        normalizedValue.startsWith(
            'http://',
        ) ||
        normalizedValue.startsWith(
            'https://',
        )
    ) {
        return normalizedValue
    }

    const zaloNumber =
        normalizedValue.replace(
            /\D/g,
            '',
        )

    return `https://zalo.me/${zaloNumber}`
}

function normalizePhone(
    value: string,
): string {
    return value.replace(/[^\d+]/g, '')
}

export function FloatingContactMenu({
    phone,
    zalo,
}: FloatingContactMenuProps) {
    const [open, setOpen] =
        useState(false)

    const containerRef =
        useRef<HTMLDivElement>(null)

    const phoneHref =
        `tel:${normalizePhone(phone)}`

    const zaloHref =
        normalizeZaloUrl(zalo)

    const closeMenu = () => {
        setOpen(false)
    }

    const toggleMenu = () => {
        setOpen((current) => !current)
    }

    /**
     * Nhấn ESC để đóng.
     */
    useEffect(() => {
        const handleEscape = (
            event: KeyboardEvent,
        ) => {
            if (event.key === 'Escape') {
                closeMenu()
            }
        }

        window.addEventListener(
            'keydown',
            handleEscape,
        )

        return () => {
            window.removeEventListener(
                'keydown',
                handleEscape,
            )
        }
    }, [])

    /**
     * Nhấn bên ngoài cụm nút để đóng.
     */
    useEffect(() => {
        if (!open) {
            return
        }

        const handleClickOutside = (
            event: PointerEvent,
        ) => {
            const target =
                event.target as Node

            if (
                containerRef.current &&
                !containerRef.current.contains(
                    target,
                )
            ) {
                closeMenu()
            }
        }

        document.addEventListener(
            'pointerdown',
            handleClickOutside,
        )

        return () => {
            document.removeEventListener(
                'pointerdown',
                handleClickOutside,
            )
        }
    }, [open])

    return (
        <div
            ref={containerRef}
            className="fixed bottom-4 right-3 z-[999] h-14 w-14 sm:bottom-5 sm:right-5 sm:h-16 sm:w-16 md:bottom-7 md:right-7"
        >
            {/* =============================================
          LIVE CHAT
          Bung chéo lên bên trái
      ============================================== */}
            <FloatingAction
                open={open}
                positionClassName="-translate-y-[76px] sm:-translate-y-[86px]"
                delay={0}
                label="Chat trực tuyến"
            >
                <div
                    className={[
                        '[&>*]:!static',
                        '[&>*]:!bottom-auto',
                        '[&>*]:!right-auto',
                        '[&>*]:!m-0',
                        '[&>*]:!h-12',
                        '[&>*]:!w-12',
                        'sm:[&>*]:!h-14',
                        'sm:[&>*]:!w-14',
                    ].join(' ')}
                >
                    <LiveChat />
                </div>
            </FloatingAction>

            {/* =============================================
          ZALO
          Bung chéo sang trái
      ============================================== */}
            <FloatingAction
                open={open}
                positionClassName="-translate-x-[64px] -translate-y-[53px] sm:-translate-x-[70px] sm:-translate-y-[68px]"
                delay={50}
                label="Chat Zalo"
            >
                <a
                    href={zaloHref}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={closeMenu}
                    aria-label="Chat qua Zalo"
                    className="group flex h-12 w-12 items-center justify-center rounded-full border border-[#dcecff] bg-white shadow-[0_8px_24px_rgba(0,91,187,0.22)] transition-transform hover:scale-110 sm:h-14 sm:w-14"
                >
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 object-contain transition-transform group-hover:scale-105 sm:h-9 sm:w-9"
                    />
                </a>
            </FloatingAction>

            {/* =============================================
          GỌI ĐIỆN
          Bung ngang sang trái
      ============================================== */}
            <FloatingAction
                open={open}
                positionClassName="-translate-x-[84px] sm:-translate-x-[96px]"
                delay={100}
                label={`Gọi ${phone}`}
            >
                <a
                    href={phoneHref}
                    onClick={closeMenu}
                    aria-label={`Gọi điện đến ${phone}`}
                    className="phone-wrapper flex h-12 w-12 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_8px_24px_rgba(34,197,94,0.32)] transition-all hover:scale-110 hover:bg-[#16a34a] sm:h-14 sm:w-14"
                >
                    <Phone
                        aria-hidden="true"
                        size={23}
                        strokeWidth={2}
                        className="animate-ring sm:h-7 sm:w-7"
                    />
                </a>
            </FloatingAction>

            {/* =============================================
          NÚT CHÍNH
      ============================================== */}
            <button
                type="button"
                onClick={toggleMenu}
                aria-expanded={open}
                aria-label={
                    open
                        ? 'Đóng menu liên hệ'
                        : 'Mở menu liên hệ'
                }
                title={
                    open
                        ? 'Đóng'
                        : 'Liên hệ với chúng tôi'
                }
                className={cn(
                    'floating-contact-main absolute bottom-0 right-0 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#b72828] text-white',
                    'shadow-[0_10px_30px_rgba(183,40,40,0.42)]',
                    'transition-all duration-300 ease-out',
                    'hover:scale-105 hover:bg-[#9e1f1f]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b72828]/25 focus-visible:ring-offset-2',
                    'sm:h-16 sm:w-16',
                    open &&
                    'rotate-90 bg-[#8e1118] shadow-[0_8px_24px_rgba(142,17,24,0.35)]',
                )}
            >
                <span
                    className={cn(
                        'absolute transition-all duration-300',
                        open
                            ? 'rotate-0 scale-100 opacity-100'
                            : '-rotate-90 scale-50 opacity-0',
                    )}
                >
                    <X
                        aria-hidden="true"
                        size={27}
                        strokeWidth={2.2}
                        className="sm:h-8 sm:w-8"
                    />
                </span>

                <span
                    className={cn(
                        'absolute transition-all duration-300',
                        open
                            ? 'rotate-90 scale-50 opacity-0'
                            : 'rotate-0 scale-100 opacity-100',
                    )}
                >
                    <MessageCircle
                        aria-hidden="true"
                        size={27}
                        strokeWidth={2}
                        className="sm:h-8 sm:w-8"
                    />
                </span>

                {/* Ba dấu chấm trong icon chat */}
                {!open ? (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-[27px] flex items-center gap-[2px] sm:top-[31px]"
                    >
                        <span className="h-[3px] w-[3px] rounded-full bg-white" />
                        <span className="h-[3px] w-[3px] rounded-full bg-white" />
                        <span className="h-[3px] w-[3px] rounded-full bg-white" />
                    </span>
                ) : null}
            </button>
        </div>
    )
}

/* =====================================================
   FLOATING ACTION WRAPPER
===================================================== */

function FloatingAction({
    open,
    positionClassName,
    delay,
    label,
    children,
}: FloatingActionProps) {
    return (
        <div
            className={cn(
                'group/action absolute bottom-0 right-0 z-20',
                'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                'motion-reduce:transition-none',
                open
                    ? cn(
                        positionClassName,
                        'pointer-events-auto scale-100 opacity-100',
                    )
                    : 'pointer-events-none translate-x-0 translate-y-0 scale-50 opacity-0',
            )}
            style={{
                transitionDelay: open
                    ? `${delay}ms`
                    : '0ms',
            }}
        >
            {/* Tooltip */}
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#202020] px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 sm:block">
                {label}
            </span>

            {children}
        </div>
    )
}