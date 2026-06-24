'use client'

import React from 'react'
import Image from 'next/image'
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

function getSlideImageUrl(
  image: SlideMediaRelationship,
): string {
  if (!image || typeof image !== 'object') {
    return ''
  }

  return image.url ?? ''
}

function HeroSlide({
  slide,
  index,
}: {
  slide: HeroSlideItem
  index: number
}) {
  const pcImg =
    getSlideImageUrl(slide.imageDesktop) ||
    '/placeholder.jpg'

  const tabletImg =
    getSlideImageUrl(slide.imageTablet) ||
    pcImg

  const mobileImg =
    getSlideImageUrl(slide.imageMobile) ||
    tabletImg

  const isFirstSlide = index === 0

  return (
    <Link
      href={slide.link || '#'}
      className="block relative w-full"
    >
      <div className="relative aspect-[3/4] md:hidden w-full">
        <Image
          src={mobileImg}
          alt="Banner Mobile"
          fill
          sizes="100vw"
          priority={isFirstSlide}
          fetchPriority={
            isFirstSlide ? 'high' : undefined
          }
          loading={
            isFirstSlide ? undefined : 'lazy'
          }
          className="object-cover"
        />
      </div>

      <div className="relative hidden md:block lg:hidden aspect-square w-full">
        <Image
          src={tabletImg}
          alt="Banner Tablet"
          fill
          sizes="100vw"
          priority={isFirstSlide}
          fetchPriority={
            isFirstSlide ? 'high' : undefined
          }
          loading={
            isFirstSlide ? undefined : 'lazy'
          }
          className="object-cover"
        />
      </div>

      <div className="relative hidden lg:block aspect-[21/9] w-full">
        <Image
          src={pcImg}
          alt="Banner Desktop"
          fill
          sizes="100vw"
          priority={isFirstSlide}
          fetchPriority={
            isFirstSlide ? 'high' : undefined
          }
          loading={
            isFirstSlide ? undefined : 'lazy'
          }
          className="object-cover"
        />
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
        <CarouselPrevious className="left-10 bg-white/20 border-none text-white hover:bg-white/40" />
        <CarouselNext className="right-10 bg-white/20 border-none text-white hover:bg-white/40" />
      </div>
    </Carousel>
  )
}