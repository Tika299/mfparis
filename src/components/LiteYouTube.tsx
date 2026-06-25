'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/utilities'

type LiteYouTubeProps = Readonly<{
    videoId: string
    title: string
    className?: string
    posterQuality?:
    | 'default'
    | 'mqdefault'
    | 'hqdefault'
    | 'sddefault'
    | 'maxresdefault'
    roundedClassName?: string
}>

export function LiteYouTube({
    videoId,
    title,
    className,
    posterQuality = 'hqdefault',
    roundedClassName = 'rounded-[24px]',
}: LiteYouTubeProps) {
    const [isPlaying, setIsPlaying] =
        useState(false)

    const thumbnailSrc = useMemo(
        () =>
            `https://i.ytimg.com/vi/${videoId}/${posterQuality}.jpg`,
        [videoId, posterQuality],
    )

    const embedSrc = useMemo(
        () =>
            `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
        [videoId],
    )

    return (
        <div
            className={cn(
                'relative overflow-hidden bg-black shadow-[0_18px_60px_rgba(0,0,0,0.18)]',
                roundedClassName,
                className,
            )}
        >
            <div className="relative aspect-video w-full">
                {isPlaying ? (
                    <iframe
                        src={embedSrc}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="absolute inset-0 h-full w-full"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsPlaying(true)}
                        aria-label={`Phát video: ${title}`}
                        className="group absolute inset-0 block h-full w-full"
                    >
                        <img
                            src={thumbnailSrc}
                            alt={title}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-black/20 transition-colors duration-300 group-hover:from-black/55 group-hover:via-black/20 group-hover:to-black/25" />

                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-18 w-18 items-center justify-center rounded-full bg-white/92 shadow-[0_10px_30px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:scale-110 group-hover:bg-white sm:h-20 sm:w-20">
                                <span
                                    aria-hidden="true"
                                    className="ml-1 block h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-[#b72828] sm:border-y-[13px] sm:border-l-[22px]"
                                />
                            </span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                            <p className="line-clamp-2 text-left text-sm font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:text-base">
                                {title}
                            </p>
                        </div>
                    </button>
                )}
            </div>
        </div>
    )
}