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
    <section className="mt-16 md:mt-24">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#b72828]">
            Gợi ý thêm
          </p>
          <h2 className="mt-2 text-2xl font-black text-gray-950 md:text-3xl">
            Sản phẩm liên quan
          </h2>
        </div>
      </div>

      <Carousel
        opts={{ align: 'start', loop: products.length > 4 }}
        plugins={[Autoplay({ delay: 4000 })]}
        className="relative w-full"
      >
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-full pl-4 sm:basis-full md:basis-1/3 lg:basis-1/4 xl:basis-1/4"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="hidden lg:block">
          <CarouselPrevious className="-left-5 bg-white shadow-md xl:-left-6" />
          <CarouselNext className="-right-5 bg-white shadow-md xl:-right-6" />
        </div>
      </Carousel>
    </section>
  )
}