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

type SizedImage = {
  url: string
  width?: number
  height?: number
  alt?: string
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

function getExactSizedImage(
  image: SlideMediaRelationship,
  sizeName: 'heroMobile' | 'heroTablet' | 'heroDesktop',
): SizedImage | null {
  if (!isMediaObject(image)) {
    return null
  }

  const sized = image.sizes?.[sizeName]

  if (!sized?.url) {
    return null
  }

  return {
    url: sized.url,
    width: sized.width ?? undefined,
    height: sized.height ?? undefined,
    alt: image.alt ?? '',
  }
}

function getOriginalImage(
  image: SlideMediaRelationship,
): SizedImage | null {
  if (!isMediaObject(image) || !image.url) {
    return null
  }

  return {
    url: image.url,
    width: image.width ?? undefined,
    height: image.height ?? undefined,
    alt: image.alt ?? '',
  }
}

function resolveHeroSources(slide: HeroSlideItem) {
  const mobileSized =
    getExactSizedImage(slide.imageMobile, 'heroMobile')

  const tabletSized =
    getExactSizedImage(slide.imageTablet, 'heroTablet')

  const desktopSized =
    getExactSizedImage(slide.imageDesktop, 'heroDesktop')

  const mobileOriginal =
    getOriginalImage(slide.imageMobile)

  const tabletOriginal =
    getOriginalImage(slide.imageTablet)

  const desktopOriginal =
    getOriginalImage(slide.imageDesktop)

  const mobile =
    mobileSized ??
    mobileOriginal ??
    tabletSized ??
    tabletOriginal ??
    desktopSized ??
    desktopOriginal

  const tablet =
    tabletSized ??
    tabletOriginal ??
    desktopSized ??
    desktopOriginal ??
    mobileSized ??
    mobileOriginal

  const desktop =
    desktopSized ??
    desktopOriginal ??
    tabletSized ??
    tabletOriginal ??
    mobileSized ??
    mobileOriginal

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
            src={mobile?.url}
            alt={alt}
            width={
              mobile?.width ||
              414
            }
            height={
              mobile?.height ||
              552
            }
            loading={isFirstSlide ? 'eager' : 'lazy'}
            fetchPriority={isFirstSlide ? 'high' : 'auto'}
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