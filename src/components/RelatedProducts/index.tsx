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

type RelatedProductsProps = {
  products: any[]
  headingId?: string
  eyebrow?: string
  title?: string
  description?: string
  emptyMessage?: string
  className?: string
}

export const RelatedProducts = ({
  products,
  headingId = 'related-products-heading',
  eyebrow = 'Gợi ý thêm',
  title = 'Sản phẩm liên quan',
  description,
  emptyMessage,
  className,
}: RelatedProductsProps) => {
  const normalizedProducts = Array.isArray(products)
    ? products
    : []
  const hasProducts = normalizedProducts.length > 0

  if (!hasProducts && !emptyMessage) return null

  const sectionClassName = [
    'mt-16 md:mt-24',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      aria-labelledby={headingId}
      className={sectionClassName}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#b72828]">
            {eyebrow}
          </p>
          <h2
            id={headingId}
            className="mt-2 text-2xl font-black text-gray-950 md:text-3xl"
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {hasProducts ? (
        <Carousel
          opts={{ align: 'start', loop: normalizedProducts.length > 4 }}
          plugins={[Autoplay({ delay: 4000 })]}
          className="relative w-full"
        >
          <CarouselContent
            as="ul"
            className="-ml-4"
          >
            {normalizedProducts.map((product) => (
              <CarouselItem
                as="li"
                key={product.id}
                className="basis-1/2 pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
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
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-5 py-6 text-sm font-semibold text-gray-500">
          {emptyMessage}
        </div>
      )}
    </section>
  )
}
