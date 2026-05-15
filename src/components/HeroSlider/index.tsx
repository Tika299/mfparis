'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

export const HeroSlider = ({ sliders }: { sliders: any[] }) => {
  const plugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }))

  if (!sliders || sliders.length === 0) return null

  return (
    <Carousel plugins={[plugin.current]} className="w-full">
      <CarouselContent>
        {sliders.map((slide, index) => {
          // Lấy URL của 3 phiên bản
          const pcImg = slide.imageDesktop?.url
          const tabletImg = slide.imageTablet?.url
          const mobileImg = slide.imageMobile?.url

          return (
            <CarouselItem key={index}>
              <Link href={slide.link || '#'} className="block relative w-full">
                {/* 1. ẢNH CHO MOBILE (Hiện dưới 768px) */}
                <div className="relative aspect-[3/4] md:hidden w-full">
                  <Image
                    src={mobileImg}
                    alt="Banner Mobile"
                    fill
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>

                {/* 2. ẢNH CHO TABLET (Hiện từ 768px đến 1024px) */}
                <div className="relative hidden md:block lg:hidden aspect-square w-full">
                  <Image
                    src={tabletImg}
                    alt="Banner Tablet"
                    fill
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>

                {/* 3. ẢNH CHO MÁY TÍNH (Hiện trên 1024px) */}
                <div className="relative hidden lg:block aspect-[21/9] w-full">
                  <Image
                    src={pcImg}
                    alt="Banner Desktop"
                    fill
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>
              </Link>
            </CarouselItem>
          )
        })}
      </CarouselContent>
      {/* Nút điều hướng mờ (tùy chọn) */}
      <div className="hidden md:block">
        <CarouselPrevious className="left-10 bg-white/20 border-none text-white hover:bg-white/40" />
        <CarouselNext className="right-10 bg-white/20 border-none text-white hover:bg-white/40" />
      </div>
    </Carousel>
  )
}
