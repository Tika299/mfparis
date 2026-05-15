'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { cn } from '@/utilities'

export const ProductGallery = ({ images }: { images: any[] }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const totalImages = images?.length || 0

  // Giới hạn hiển thị tối đa 5 thumbnail, còn lại sẽ vào ô "Xem thêm"
  const maxVisible = 5
  const visibleThumbnails = images?.slice(0, maxVisible) || []
  const remainingCount = totalImages - maxVisible

  const nextImage = () => setActiveIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1))
  const prevImage = () => setActiveIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1))

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. KHUNG ẢNH CHÍNH (Tỉ lệ 1:1) */}
      <div className="relative aspect-square w-full bg-white rounded-3xl overflow-hidden border border-gray-100 group shadow-sm">
        {images && images[activeIndex] ? (
          <Image
            src={images[activeIndex].image.url}
            alt="Product image"
            fill
            className="object-contain p-10 transition-all duration-500"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
            <ImageIcon size={48} />
          </div>
        )}

        {/* Nút điều hướng ảnh chính */}
        {totalImages > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* 2. HÀNG THUMBNAILS (Mẫu Long Châu) */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {visibleThumbnails.map((item, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'relative min-w-[75px] h-[75px] md:min-w-[85px] md:h-[85px] rounded-xl overflow-hidden border-2 bg-white transition-all shadow-sm',
              activeIndex === index
                ? 'border-blue-500'
                : 'border-transparent hover:border-gray-200',
            )}
          >
            <Image
              src={item.image.url}
              alt={`Thumb ${index}`}
              fill
              className="object-contain p-2"
            />
          </button>
        ))}

        {/* Ô "Xem thêm" nếu số lượng ảnh > 5 */}
        {remainingCount > 0 && (
          <button className="min-w-[75px] h-[75px] md:min-w-[85px] md:h-[85px] rounded-xl border-2 border-gray-100 bg-white flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
            <ImageIcon size={20} className="mb-1 text-gray-400" />
            <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-tight">
              Xem thêm <br /> {remainingCount} ảnh
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
