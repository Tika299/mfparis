'use client'

import React from 'react'
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

type SlideMediaRelationship =
  | number
  | Media
  | null
  | undefined

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

type ResolvedHeroImage = {
  url: string
  width?: number
  height?: number
  alt: string
}

function isMediaObject(
  value: SlideMediaRelationship,
): value is PayloadMediaWithSizes {
  return !!value && typeof value === 'object'
}

function toResolvedImage(
  image: SlideMediaRelationship,
  sizeName: 'heroMobile' | 'heroTablet' | 'heroDesktop',
): ResolvedHeroImage | null {
  if (!isMediaObject(image)) {
    return null
  }

  const sizedImage = image.sizes?.[sizeName]

  if (sizedImage?.url) {
    return {
      url: sizedImage.url,
      width: sizedImage.width ?? image.width ?? undefined,
      height: sizedImage.height ?? image.height ?? undefined,
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

function resolveHeroSources(slide: HeroSlideItem) {
  const desktop =
    toResolvedImage(slide.imageDesktop, 'heroDesktop') ??
    toResolvedImage(slide.imageTablet, 'heroDesktop') ??
    toResolvedImage(slide.imageMobile, 'heroDesktop')

  const tablet =
    toResolvedImage(slide.imageTablet, 'heroTablet') ??
    toResolvedImage(slide.imageDesktop, 'heroTablet') ??
    toResolvedImage(slide.imageMobile, 'heroTablet') ??
    desktop

  const mobile =
    toResolvedImage(slide.imageMobile, 'heroMobile') ??
    toResolvedImage(slide.imageTablet, 'heroMobile') ??
    toResolvedImage(slide.imageDesktop, 'heroMobile') ??
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
}: Readonly<{
  slide: HeroSlideItem
  index: number
}>) {
  const { mobile, tablet, desktop } =
    resolveHeroSources(slide)

  const fallback =
    mobile ?? tablet ?? desktop

  if (!fallback?.url) {
    return null
  }

  const isFirstSlide = index === 0
  const alt =
    mobile?.alt ||
    tablet?.alt ||
    desktop?.alt ||
    'Hero banner'

  return (
    <Link
      href={slide.link || '#'}
      className="relative block w-full"
      aria-label={alt}
    >
      <div className="relative w-full aspect-[3/4] md:aspect-square lg:aspect-[21/9]">
        <picture>
          {desktop?.url ? (
            <source
              media="(min-width: 1024px)"
              srcSet={desktop.url}
            />
          ) : null}

          {tablet?.url ? (
            <source
              media="(min-width: 768px)"
              srcSet={tablet.url}
            />
          ) : null}

          <img
            src={mobile?.url || fallback.url}
            alt={alt}
            width={
              mobile?.width ||
              fallback.width ||
              414
            }
            height={
              mobile?.height ||
              fallback.height ||
              552
            }
            loading={
              isFirstSlide ? 'eager' : 'lazy'
            }
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

  if (!sliders?.length) {
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