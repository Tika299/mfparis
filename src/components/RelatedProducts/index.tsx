'use client'
import React from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ProductCard } from '@/components/ProductCard'
import Autoplay from 'embla-carousel-autoplay'

export const RelatedProducts = ({ products }: { products: any[] }) => {
  if (!products || products.length === 0) return null

  return (
    <section className="mt-24 md:mt-32">
      <Carousel
        opts={{ align: 'start', loop: true }}
        plugins={[Autoplay({ delay: 4000 })]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Nút điều hướng sẽ tự động nằm ở 2 bên cạnh của Slider */}
        <div className="hidden md:block">
          <CarouselPrevious className="-left-12 bg-white" />
          <CarouselNext className="-right-12 bg-white" />
        </div>
      </Carousel>
    </section>
  )
}
