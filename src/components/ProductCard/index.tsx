import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const ProductCard = ({ product }: { product: any }) => {
  // Lấy ảnh 1 và ảnh 2 để làm hiệu ứng hover swap
  const mainImage = product.images?.[0]?.image?.url
  const hoverImage = product.images?.[1]?.image?.url || mainImage

  const discountPercent = product.price?.salePrice
    ? Math.round(
        ((product.price.basePrice - product.price.salePrice) / product.price.basePrice) * 100,
      )
    : 0

  return (
    <Card className="group border-none shadow-none bg-transparent overflow-hidden">
      <CardContent className="p-0 relative">
        {/* Nhãn giảm giá */}
        {discountPercent > 0 && (
          <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600">
            -{discountPercent}%
          </Badge>
        )}

        {/* Khu vực ảnh - Hiệu ứng Hover đổi ảnh */}
        <Link
          href={`/products/${product.slug}`}
          className="block relative aspect-[3/4] overflow-hidden bg-gray-100"
        >
          <Image
            src={mainImage}
            alt={product.title}
            fill
            className="object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          <Image
            src={hoverImage}
            alt={product.title}
            fill
            className="object-cover absolute top-0 left-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </Link>

        {/* Nút thêm nhanh (Hiện khi hover) */}
        <div className="absolute bottom-4 left-0 right-0 px-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button className="w-full bg-white text-black hover:bg-black hover:text-white border-none shadow-lg text-xs font-bold uppercase">
            Thêm vào giỏ
          </Button>
        </div>
      </CardContent>

      {/* Thông tin sản phẩm */}
      <div className="py-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
          {product.brand?.name}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="block hover:text-blue-600 transition-colors"
        >
          <h3 className="text-sm font-medium line-clamp-2 px-2 mb-2">{product.title}</h3>
        </Link>
        <div className="flex justify-center items-center gap-2">
          {product.price?.salePrice ? (
            <>
              <span className="text-red-600 font-bold text-sm">
                {product.price.salePrice.toLocaleString()}₫
              </span>
              <span className="text-xs text-gray-400 line-through">
                {product.price.basePrice.toLocaleString()}₫
              </span>
            </>
          ) : (
            <span className="font-bold text-sm">{product.price?.basePrice.toLocaleString()}₫</span>
          )}
        </div>
      </div>
    </Card>
  )
}
