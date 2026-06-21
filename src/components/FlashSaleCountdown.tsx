'use client'

import {
    useEffect,
    useState,
} from 'react'

type TimeLeft = {
    days: number
    hours: number
    minutes: number
    seconds: number
    isEnded: boolean
}

type FlashSaleCountdownProps = Readonly<{
    endTime: string
}>

function getTimeLeft(
    endTime: string,
): TimeLeft {
    const endTimestamp =
        new Date(endTime).getTime()

    if (!Number.isFinite(endTimestamp)) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isEnded: true,
        }
    }

    const difference = Math.max(
        0,
        endTimestamp - Date.now(),
    )

    return {
        days: Math.floor(
            difference /
            (1000 * 60 * 60 * 24),
        ),

        hours: Math.floor(
            (difference /
                (1000 * 60 * 60)) %
            24,
        ),

        minutes: Math.floor(
            (difference /
                (1000 * 60)) %
            60,
        ),

        seconds: Math.floor(
            (difference / 1000) % 60,
        ),

        isEnded: difference <= 0,
    }
}

function padTime(
    value: number,
): string {
    return String(value).padStart(2, '0')
}

export function FlashSaleCountdown({
    endTime,
}: FlashSaleCountdownProps) {
    const [timeLeft, setTimeLeft] =
        useState<TimeLeft | null>(null)

    useEffect(() => {
        const updateCountdown = () => {
            setTimeLeft(
                getTimeLeft(endTime),
            )
        }

        updateCountdown()

        const timer =
            window.setInterval(
                updateCountdown,
                1000,
            )

        return () => {
            window.clearInterval(timer)
        }
    }, [endTime])

    if (!timeLeft) {
        return (
            <CountdownLayout
                days="--"
                hours="--"
                minutes="--"
                seconds="--"
            />
        )
    }

    if (timeLeft.isEnded) {
        return (
            <span className="text-[13px] font-medium text-[#777777]">
                Chương trình đã kết thúc
            </span>
        )
    }

    return (
        <CountdownLayout
            days={padTime(timeLeft.days)}
            hours={padTime(timeLeft.hours)}
            minutes={padTime(
                timeLeft.minutes,
            )}
            seconds={padTime(
                timeLeft.seconds,
            )}
        />
    )
}

function CountdownLayout({
    days,
    hours,
    minutes,
    seconds,
}: Readonly<{
    days: string
    hours: string
    minutes: string
    seconds: string
}>) {
    return (
        <div
            className="flex flex-wrap items-center gap-3 sm:flex-nowrap"
            aria-live="polite"
        >
            <span className="mr-1 whitespace-nowrap text-[13px] font-medium text-[#555555] sm:text-[14px]">
                Kết thúc sau
            </span>

            <TimeBox
                value={days}
                label="Ngày"
            />

            <TimeBox
                value={hours}
                label="Giờ"
            />

            <TimeBox
                value={minutes}
                label="Phút"
            />

            <TimeBox
                value={seconds}
                label="Giây"
            />
        </div>
    )
}

function TimeBox({
    value,
    label,
}: Readonly<{
    value: string
    label: string
}>) {
    return (
        <div className="flex h-[64px] min-w-[58px] flex-col items-center justify-center rounded-[11px] border border-[#eadede] bg-white px-2 text-center shadow-[0_3px_12px_rgba(0,0,0,0.025)] sm:h-[68px] sm:min-w-[62px]">
            <span className="text-[22px] font-bold leading-none tabular-nums tracking-[-0.025em] text-[#b40008] sm:text-[24px]">
                {value}
            </span>

            <span className="mt-2 text-[10px] font-medium leading-none text-[#555555] sm:text-[11px]">
                {label}
            </span>
        </div>
    )
}