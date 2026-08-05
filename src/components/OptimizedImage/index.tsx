import React from 'react'
import Image from 'next/image'
import { cn } from '@/utilities'

type MediaSizeName =
  | 'thumbnail'
  | 'card'
  | 'blogCard'
  | 'large'
  | 'heroMobile'
  | 'heroTablet'
  | 'heroDesktop'

interface OptimizedImageProps {
  media: any
  size?: MediaSizeName
  alt?: string
  className?: string
  imageClassName?: string
  priority?: boolean
  sizes?: string
  quality?: number
}

function shouldBypassNextImage(src: string) {
  return src.startsWith('/api/media/file/')
}

export const OptimizedImage = ({
  media,
  size = 'card',
  alt,
  className,
  imageClassName,
  priority = false,
  sizes,
  quality = 85,
}: OptimizedImageProps) => {
  if (!media || typeof media !== 'object') {
    if (
      typeof media === 'number' ||
      typeof media === 'string'
    ) {
      return (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-gray-200 animate-pulse',
            className,
          )}
        >
          <span className="px-4 text-center text-base font-bold text-black sm:text-lg">
            Đang tải ảnh từ thư viện...
          </span>
        </div>
      )
    }

    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-white',
          className,
        )}
      >
        <Image
          src="/api/media/file/placeholder.webp"
          alt="Placeholder"
          fill
          sizes={sizes ?? '100vw'}
          unoptimized={shouldBypassNextImage('/api/media/file/placeholder.webp')}
          className="object-cover"
        />
      </div>
    )
  }

  const sizedMedia = media.sizes?.[size]
  const src =
    media.url ||
    sizedMedia?.url ||
    '/api/media/file/placeholder.webp'

  const imageAlt =
    alt || media.alt || 'MF Paris Product'

  const imageSizes =
    sizes ??
    (
      size === 'thumbnail'
        ? '150px'
        : size === 'card'
          ? '(max-width: 767px) 50vw, (max-width: 1279px) 33.33vw, 25vw'
          : size === 'blogCard'
            ? '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw'
          : size === 'heroMobile' ||
            size === 'heroTablet' ||
            size === 'heroDesktop'
            ? '100vw'
            : '100vw'
    )

  const width =
    sizedMedia?.width || media.width || 800
  const height =
    sizedMedia?.height || media.height || 800

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden',
        className,
      )}
    >
      <Image
        src={src}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={imageSizes}
        quality={quality}
        unoptimized={shouldBypassNextImage(src)}
        loading={priority ? undefined : 'lazy'}
        className={cn(
          'object-cover transition-transform duration-700 ease-in-out',
          imageClassName,
        )}
      />

      <span className="hidden">
        {width}x{height}
      </span>
    </div>
  )
}
