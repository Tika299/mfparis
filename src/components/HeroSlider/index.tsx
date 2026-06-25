'use client'

import React from 'react'
import Image, { getImageProps } from 'next/image'
import Link from 'next/link'
import type { Media } from '@/payload-types'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

type SlideMediaRelationship = number | Media | null | undefined

type HeroSlideItem = {
  link?: string | null
  imageDesktop?: SlideMediaRelationship
  imageTablet?: SlideMediaRelationship
  imageMobile?: SlideMediaRelationship
}

type HeroSliderProps = {
  sliders: HeroSlideItem[]
}

type PayloadMediaWithSizes = Media & {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: {
    heroMobile?: {
      url?: string | null
      width?: number | null
      height?: number | null
    } | null
    heroTablet?: {
      url?: string | null
      width?: number | null
      height?: number | null
    } | null
    heroDesktop?: {
      url?: string | null
      width?: number | null
      height?: number | null
    } | null
  } | null
}

function isMediaObject(
  value: SlideMediaRelationship,
): value is PayloadMediaWithSizes {
  return !!value && typeof value === 'object'
}

function getSizedImage(
  image: SlideMediaRelationship,
  sizeName: 'heroMobile' | 'heroTablet' | 'heroDesktop',
) {
  if (!isMediaObject(image)) {
    return null
  }

  const sized = image.sizes?.[sizeName]

  if (sized?.url) {
    return {
      url: sized.url,
      width: sized.width ?? image.width ?? undefined,
      height: sized.height ?? image.height ?? undefined,
      alt: image.alt ?? '',
    }
  }

  if (image.url) {
    return {
      url: image.url,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      alt: image.alt ?? '',
    }
  }

  return null
}

function buildHeroSources(slide: HeroSlideItem) {
  const desktop =
    getSizedImage(slide.imageDesktop, 'heroDesktop') ??
    getSizedImage(slide.imageTablet, 'heroDesktop') ??
    getSizedImage(slide.imageMobile, 'heroDesktop')

  const tablet =
    getSizedImage(slide.imageTablet, 'heroTablet') ??
    getSizedImage(slide.imageDesktop, 'heroTablet') ??
    getSizedImage(slide.imageMobile, 'heroTablet') ??
    desktop

  const mobile =
    getSizedImage(slide.imageMobile, 'heroMobile') ??
    getSizedImage(slide.imageTablet, 'heroMobile') ??
    getSizedImage(slide.imageDesktop, 'heroMobile') ??
    tablet ??
    desktop

  return {
    mobile,
    tablet,
    desktop,
  }
}

function HeroSlide({
  slide,
  index,
}: {
  slide: HeroSlideItem
  index: number
}) {
  const { mobile, tablet, desktop } =
    buildHeroSources(slide)

  const fallback = desktop ?? tablet ?? mobile

  if (!fallback?.url) {
    return null
  }

  const isFirstSlide = index === 0
  const alt =
    mobile?.alt ||
    tablet?.alt ||
    desktop?.alt ||
    'Hero banner'

  const mobileImage = getImageProps({
    alt,
    src: mobile?.url || fallback.url,
    width: mobile?.width || 600,
    height: mobile?.height || 800,
    sizes: '100vw',
    priority: isFirstSlide,
    quality: 82,
  }).props

  const tabletImage = getImageProps({
    alt,
    src: tablet?.url || fallback.url,
    width: tablet?.width || 1024,
    height: tablet?.height || 1024,
    sizes: '100vw',
    priority: isFirstSlide,
    quality: 82,
  }).props

  const desktopImage = getImageProps({
    alt,
    src: desktop?.url || fallback.url,
    width: desktop?.width || 1920,
    height: desktop?.height || 800,
    sizes: '100vw',
    priority: isFirstSlide,
    quality: 82,
  }).props

  return (
    <Link
      href={slide.link || '#'}
      className="relative block w-full"
      aria-label={alt}
    >
      <div className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-[21/9]">
        <picture>
          <source
            media="(min-width: 1024px)"
            srcSet={desktopImage.srcSet}
            sizes="100vw"
          />
          <source
            media="(min-width: 768px)"
            srcSet={tabletImage.srcSet}
            sizes="100vw"
          />
          <img
            src={mobileImage.src}
            srcSet={mobileImage.srcSet}
            sizes="100vw"
            alt={alt}
            loading={isFirstSlide ? 'eager' : 'lazy'}
            fetchPriority={
              isFirstSlide ? 'high' : 'auto'
            }
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      </div>
    </Link>
  )
}

export const HeroSlider = ({
  sliders,
}: HeroSliderProps) => {
  const plugin = React.useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: true,
    }),
  )

  const [isHydrated, setIsHydrated] =
    React.useState(false)

  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!sliders || sliders.length === 0) {
    return null
  }

  if (!isHydrated) {
    return (
      <div className="w-full">
        <HeroSlide
          slide={sliders[0]}
          index={0}
        />
      </div>
    )
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
    >
      <CarouselContent>
        {sliders.map((slide, index) => (
          <CarouselItem key={index}>
            <HeroSlide
              slide={slide}
              index={index}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="hidden md:block">
        <CarouselPrevious className="left-10 border-none bg-white/20 text-white hover:bg-white/40" />
        <CarouselNext className="right-10 border-none bg-white/20 text-white hover:bg-white/40" />
      </div>
    </Carousel>
  )
}