'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { cn } from '@/utilities'
import { Product } from '@/payload-types'

function getMedia(item: any) {
  if (!item) return null

  if (typeof item.image === 'object' && item.image !== null) {
    return item.image
  }

  if (typeof item === 'object' && item.url) {
    return item
  }

  return null
}

function getImageUrl(item: any, type: 'main' | 'thumb' = 'main') {
  const media = getMedia(item)

  if (!media) return ''

  const sizes: Record<string, any> = media?.sizes || {}

  const firstSizeUrl =
    Object.values(sizes).find((size: any) => size?.url)?.url || ''

  if (type === 'thumb') {
    return (
      sizes?.thumbnail?.url ||
      sizes?.card?.url ||
      sizes?.medium?.url ||
      firstSizeUrl ||
      media?.url ||
      ''
    )
  }

  return (
    sizes?.card?.url ||
    sizes?.medium?.url ||
    sizes?.thumbnail?.url ||
    firstSizeUrl ||
    media?.url ||
    ''
  )
}

function getImageAlt(item: any, fallback = 'Product image') {
  const media = getMedia(item)

  return media?.alt || media?.filename || fallback
}

function shouldBypassNextImage(src: string) {
  return src.startsWith('/api/media/file/')
}

const PRODUCT_VARIANT_SELECTED_EVENT = 'mfparis:product-variant-selected'

type ProductGalleryImages = NonNullable<
  Product['images']
>

type ProductGalleryProps = Readonly<{
  images: ProductGalleryImages
  variants?: NonNullable<Product['variants']>
}>

export const ProductGallery = ({ images, variants = [] }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  const validImages = useMemo(() => {
    const productImages = Array.isArray(images)
      ? images.filter((item) => Boolean(getImageUrl(item)))
      : []

    const variantImages = Array.isArray(variants)
      ? variants
        .filter((variant) => variant?.isActive !== false)
        .map((variant) => ({
          image: variant.image,
          variantId: variant.id ? String(variant.id) : '',
          variantName: variant.name,
        }))
        .filter((item) => item.variantId && Boolean(getImageUrl(item)))
      : []

    return [...productImages, ...variantImages]
  }, [images, variants])

  const totalImages = validImages.length

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      currentIndex >= totalImages ? 0 : currentIndex,
    )
  }, [totalImages])

  useEffect(() => {
    const handleVariantSelected = (event: Event) => {
      const variantId = (event as CustomEvent<{ variantId?: string }>).detail
        ?.variantId

      if (!variantId) return

      setActiveIndex((currentIndex) => {
        const variantImageIndex = validImages.findIndex((item: any) => {
          return item?.variantId === String(variantId)
        })

        return variantImageIndex >= 0 ? variantImageIndex : currentIndex
      })
    }

    window.addEventListener(PRODUCT_VARIANT_SELECTED_EVENT, handleVariantSelected)

    return () => {
      window.removeEventListener(PRODUCT_VARIANT_SELECTED_EVENT, handleVariantSelected)
    }
  }, [validImages])

  const maxVisible = 5
  const visibleThumbnails = validImages.slice(0, maxVisible)
  const remainingCount = totalImages - maxVisible

  const activeImage = validImages[activeIndex]
  const activeImageUrl = getImageUrl(activeImage, 'main')
  const activeImageAlt = getImageAlt(activeImage)

  const nextImage = () => {
    if (totalImages <= 1) return
    setActiveIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    if (totalImages <= 1) return
    setActiveIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1))
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* 1. KHUNG ẢNH CHÍNH */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {activeImageUrl ? (
          <Image
            key={activeImageUrl}
            src={activeImageUrl}
            alt={activeImageAlt}
            fill
            className="object-contain transition-all duration-500"
            priority
            unoptimized={shouldBypassNextImage(activeImageUrl)}
            sizes="(max-width: 768px) 100vw, 700px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
            <ImageIcon size={48} />
          </div>
        )}

        {totalImages > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-md transition-all hover:bg-white group-hover:opacity-100"
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>

            <button
              type="button"
              onClick={nextImage}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-md transition-all hover:bg-white group-hover:opacity-100"
              aria-label="Ảnh sau"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* 2. HÀNG THUMBNAILS */}
      {totalImages > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto py-1">
          {visibleThumbnails.map((item, index) => {
            const thumbUrl = getImageUrl(item, 'thumb')
            const thumbAlt = getImageAlt(item, `Thumb ${index + 1}`)

            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'relative h-[75px] min-w-[75px] overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all md:h-[85px] md:min-w-[85px]',
                  activeIndex === index
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-200',
                )}
                aria-label={`Xem ảnh ${index + 1}`}
              >
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt={thumbAlt}
                    fill
                    className="object-contain p-2"
                    unoptimized={shouldBypassNextImage(thumbUrl)}
                    sizes="85px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ImageIcon size={22} />
                  </div>
                )}
              </button>
            )
          })}

          {remainingCount > 0 && (
            <button
              type="button"
              className="flex h-[75px] min-w-[75px] flex-col items-center justify-center rounded-xl border-2 border-gray-100 bg-white text-gray-500 shadow-sm transition-all hover:bg-gray-50 md:h-[85px] md:min-w-[85px]"
            >
              <ImageIcon size={20} className="mb-1 text-gray-400" />
              <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-tight">
                Xem thêm <br /> {remainingCount} ảnh
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}