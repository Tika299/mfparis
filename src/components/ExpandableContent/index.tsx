'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type ExpandableContentProps = {
  children: React.ReactNode
  maxHeight?: number
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  collapseScrollTargetId?: string
}

export function ExpandableContent({
  children,
  maxHeight = 1100,
  expanded,
  onExpandedChange,
  collapseScrollTargetId,
}: ExpandableContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const [internalExpanded, setInternalExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  const isControlled = typeof expanded === 'boolean'
  const isExpanded = isControlled ? expanded : internalExpanded

  const setExpanded = (value: boolean) => {
    if (!isControlled) {
      setInternalExpanded(value)
    }

    onExpandedChange?.(value)
  }

  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    const checkHeight = () => {
      setCanExpand(element.scrollHeight > maxHeight + 40)
    }

    checkHeight()

    const observer = new ResizeObserver(checkHeight)
    observer.observe(element)

    window.addEventListener('resize', checkHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', checkHeight)
    }
  }, [children, maxHeight])

  const handleToggle = () => {
    const nextExpanded = !isExpanded

    setExpanded(nextExpanded)

    if (!nextExpanded && collapseScrollTargetId) {
      window.setTimeout(() => {
        document.getElementById(collapseScrollTargetId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 80)
    }
  }

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{
          maxHeight: isExpanded || !canExpand ? 'none' : `${maxHeight}px`,
        }}
      >
        {children}
      </div>

      {canExpand && !isExpanded && (
        <div className="pointer-events-none absolute bottom-16 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      )}

      {canExpand && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b72828] px-7 text-sm font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-black"
          >
            {isExpanded ? (
              <>
                Thu gọn nội dung
                <ChevronUp size={17} />
              </>
            ) : (
              <>
                Xem thêm nội dung
                <ChevronDown size={17} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}