'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/utilities/formatPrice'

export const ProductCard = ({ product }: { product: any }) => {
  const mainImage =
    product.images?.[0]?.image && typeof product.images[0].image === 'object'
      ? product.images[0].image.url
      : 'http://localhost:3000/api/media/file/placeholder.jpg'

  const salePrice = product.price?.salePrice
  const basePrice = product.price?.basePrice

  return (
    <div className="group cursor-pointer">
      <div className="relative bg-white rounded-2xl overflow-hidden mb-5 aspect-square border border-gray-50 shadow-sm">
        {salePrice && basePrice && (
          <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            -{Math.round(((basePrice - salePrice) / basePrice) * 100)}%
          </span>
        )}
        <Link href={`/products/${product.slug}`}>
          <Image
            src={mainImage}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition duration-700"
          />
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none">
          {product.brand?.name || 'Authentic'}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-bold text-sm text-gray-800 line-clamp-2 hover:text-amber-800 transition-colors h-10 leading-tight">
            {product.title}
          </h3>
        </Link>
        <div className="pt-1">
          {salePrice ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-black text-sm">{formatPrice(salePrice)}₫</span>
              <span className="text-gray-300 line-through text-[11px]">
                {formatPrice(basePrice)}₫
              </span>
            </div>
          ) : (
            <span className="font-black text-sm">{formatPrice(basePrice)}₫</span>
          )}
        </div>
      </div>
    </div>
  )
}
