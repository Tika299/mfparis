'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utilities'

interface Props {
  children: React.ReactNode
  maxHeight?: number
  expanded?: boolean
  onExpandedChange?: (value: boolean) => void
}

export const ExpandableContent = ({
  children,
  maxHeight = 1000,
  expanded,
  onExpandedChange,
}: Props) => {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [shouldShowButton, setShouldShowButton] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const isControlled = typeof expanded === 'boolean'
  const isExpanded = isControlled ? expanded : internalExpanded

  const setIsExpanded = (value: boolean) => {
    if (isControlled) {
      onExpandedChange?.(value)
    } else {
      setInternalExpanded(value)
    }
  }

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        setShouldShowButton(contentRef.current.scrollHeight > maxHeight)
      }
    }

    checkHeight()

    window.addEventListener('resize', checkHeight)

    return () => {
      window.removeEventListener('resize', checkHeight)
    }
  }, [maxHeight, children])

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          'relative overflow-hidden transition-all duration-700 ease-in-out',
        )}
        style={{
          maxHeight: !isExpanded && shouldShowButton ? `${maxHeight}px` : 'none',
        }}
      >
        {children}

        {!isExpanded && shouldShowButton && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />
        )}
      </div>

      {shouldShowButton && (
        <div className="relative z-20 mt-8 flex justify-center">
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            className="h-12 cursor-pointer rounded-full border-[#E54D2E] px-10 text-[11px] font-bold uppercase tracking-widest text-[#E54D2E] shadow-md hover:bg-orange-50"
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