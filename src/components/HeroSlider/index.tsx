'use client'
import * as React from 'react'
import Autoplay from 'embla-carousel-autoplay'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import Image from 'next/image'
import Link from 'next/link'

export function HeroSlider({ sliders }: { sliders: any[] }) {
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }))

  if (!sliders || sliders.length === 0) return null

  return (
    <Carousel plugins={[plugin.current]} className="w-full">
      <CarouselContent>
        {sliders.map((slide, index) => (
          <CarouselItem key={index}>
            <Link href={slide.link || '#'}>
              <div className="relative h-[50vh] md:h-[80vh] w-full">
                <Image
                  src={slide.image.url}
                  alt={slide.title || 'Banner'}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                {slide.title && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <h2 className="text-white text-4xl font-bold uppercase tracking-widest">
                      {slide.title}
                    </h2>
                  </div>
                )}
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
