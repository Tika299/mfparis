import React from 'react'
import Image from 'next/image'
import { cn } from '@/utilities' // Đảm bảo đường dẫn này đúng với file cn của bạn

interface OptimizedImageProps {
  media: any // Đối tượng Media từ Payload
  size?: 'thumbnail' | 'card' | 'large' // Các size đã định nghĩa trong Media.ts
  alt?: string
  className?: string
  priority?: boolean
}

export const OptimizedImage = ({
  media,
  size = 'card',
  alt,
  className,
  priority = false,
}: OptimizedImageProps) => {
  // 1. Kiểm tra nếu không có media
  if (!media || typeof media !== 'object') {
    return (
      <div className={cn('bg-gray-100 flex items-center justify-center w-full h-full', className)}>
        <Image
          src="/api/media/file/placeholder.jpg"
          alt="Placeholder"
          fill
          className="object-cover"
        />
      </div>
    )
  }

  // 2. Lấy URL theo size yêu cầu, nếu không có thì lấy ảnh gốc (.url)
  const src = media.sizes?.[size]?.url || media.url
  const imageAlt = alt || media.alt || 'MF Paris Product'

  return (
    <div className={cn('relative overflow-hidden w-full h-full', className)}>
      <Image
        src={src}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={
          size === 'thumbnail'
            ? '150px'
            : size === 'card'
              ? '(max-width: 768px) 50vw, 25vw'
              : '100vw'
        }
        className="object-cover transition-transform duration-700 ease-in-out"
        loading={priority ? undefined : 'lazy'}
        quality={85}
      />
    </div>
  )
}
