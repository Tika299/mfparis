'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utilities'

interface Props {
  children: React.ReactNode
  maxHeight?: number // Chiều cao giới hạn (mặc định 1000px)
}

export const ExpandableContent = ({ children, maxHeight = 1000 }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldShowButton, setShouldShowButton] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      // Nếu chiều cao thực tế lớn hơn giới hạn thì mới hiện nút
      if (contentRef.current.scrollHeight > maxHeight) {
        setShouldShowButton(true)
      }
    }
  }, [maxHeight])

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          'relative transition-all duration-700 ease-in-out overflow-hidden',
          !isExpanded && shouldShowButton ? 'max-h-[1000px]' : 'max-h-full',
        )}
        style={{ maxHeight: !isExpanded && shouldShowButton ? `${maxHeight}px` : 'none' }}
      >
        {children}

        {/* Hiệu ứng mờ dần ở đáy khi chưa mở rộng */}
        {!isExpanded && shouldShowButton && (
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
        )}
      </div>

      {shouldShowButton && (
        <div className="flex justify-center mt-8 relative z-20">
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            className="rounded-full px-10 h-12 border-[#E54D2E] text-[#E54D2E] hover:bg-orange-50 font-bold uppercase text-[11px] tracking-widest shadow-md cursor-pointer"
          >
            {isExpanded ? (
              <>
                Thu gọn bài viết <ChevronUp className="ml-2" size={16} />
              </>
            ) : (
              <>
                Xem thêm nội dung <ChevronDown className="ml-2" size={16} />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
