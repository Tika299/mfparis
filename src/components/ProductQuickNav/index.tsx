'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronUp, List } from 'lucide-react'
import { ExpandableContent } from '@/components/ExpandableContent'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  addHeadingIds,
  extractHtmlHeadings,
  normalizeContentHtml,
} from '@/lib/html/contentHtml'

type ProductQuickNavProps = {
  description?: unknown
}

type ProductHtmlContentProps = {
  description?: unknown
  expandable?: boolean
  maxHeight?: number
}

const PRODUCT_CONTENT_SCROLL_EVENT = 'product-content-scroll-to-heading'
const PRODUCT_DETAIL_CONTENT_ID = 'product-detail-content'

const scrollToHeading = (id: string) => {
  const scroll = (attempt = 0) => {
    const element = document.getElementById(id)

    if (!element) {
      if (attempt < 10) {
        requestAnimationFrame(() => scroll(attempt + 1))
      }

      return
    }

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    window.history.replaceState(null, '', `#${id}`)
  }

  requestAnimationFrame(() => scroll())
}

const requestOpenContentAndScroll = (id: string) => {
  window.dispatchEvent(
    new CustomEvent(PRODUCT_CONTENT_SCROLL_EVENT, {
      detail: { id },
    }),
  )
}

export function ProductQuickNav({ description }: ProductQuickNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [showTopButton, setShowTopButton] = useState(false)

  const items = useMemo(() => extractHtmlHeadings(description), [description])

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY
      const height = document.documentElement.scrollHeight - window.innerHeight
      const progress = height > 0 ? Math.min(100, Math.max(0, (top / height) * 100)) : 0

      setScrollPercent(progress)
      setShowTopButton(top > 700)
    }

    onScroll()

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!items.length && !showTopButton) {
    return null
  }

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-[#b72828] transition-[width] duration-150"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 sm:bottom-5 md:bottom-6 lg:hidden">
        {items.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex h-10 items-center gap-2 rounded-full bg-black px-4 text-[10px] font-black uppercase tracking-wider text-white shadow-lg sm:h-11 sm:text-[11px]">
                <List size={14} />
                Muc luc
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="max-h-[82dvh] rounded-t-3xl bg-white px-5 pb-8 pt-6"
            >
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left">Muc luc noi dung</SheetTitle>
              </SheetHeader>

              <div className="space-y-2 overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSheetOpen(false)

                      setTimeout(() => {
                        requestOpenContentAndScroll(item.id)
                      }, 180)
                    }}
                    className="block w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700"
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {showTopButton && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b72828] text-white shadow-lg sm:h-11 sm:w-11"
            aria-label="Len dau trang"
          >
            <ChevronUp size={18} />
          </button>
        )}
      </div>
    </>
  )
}

export function ProductRichTextContent({
  description,
  expandable = true,
  maxHeight = 1100,
}: ProductHtmlContentProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [contentExpanded, setContentExpanded] = useState(false)

  const tocItems = useMemo(() => extractHtmlHeadings(description), [description])
  const html = useMemo(
    () => addHeadingIds(description, tocItems),
    [description, tocItems],
  )

  const handleTocClick = useCallback((id: string) => {
    setActiveId(id)
    setContentExpanded(true)

    window.setTimeout(() => {
      scrollToHeading(id)
    }, 120)
  }, [])

  useEffect(() => {
    const onRequestScroll = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const id = customEvent.detail?.id

      if (!id) return

      handleTocClick(id)
    }

    window.addEventListener(PRODUCT_CONTENT_SCROLL_EVENT, onRequestScroll)

    return () => {
      window.removeEventListener(PRODUCT_CONTENT_SCROLL_EVENT, onRequestScroll)
    }
  }, [handleTocClick])

  useEffect(() => {
    if (!tocItems.length) return

    if (!activeId && tocItems[0]?.id) {
      setActiveId(tocItems[0].id)
    }

    const headings = tocItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[]

    if (!headings.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        root: null,
        rootMargin: '-120px 0px -65% 0px',
        threshold: 0,
      },
    )

    headings.forEach((heading) => observer.observe(heading))

    return () => observer.disconnect()
  }, [activeId, tocItems])

  if (!normalizeContentHtml(description)) return null

  const content = (
    <div
      className="product-html-content prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )

  if (!tocItems.length) {
    return (
      <section
        id={PRODUCT_DETAIL_CONTENT_ID}
        className="scroll-mt-28 rounded-3xl bg-white p-5 shadow-sm md:p-8 lg:p-10"
      >
        {expandable ? (
          <ExpandableContent
            maxHeight={maxHeight}
            expanded={contentExpanded}
            onExpandedChange={setContentExpanded}
            collapseScrollTargetId={PRODUCT_DETAIL_CONTENT_ID}
          >
            {content}
          </ExpandableContent>
        ) : (
          content
        )}
      </section>
    )
  }

  return (
    <section className="rounded-3xl bg-white shadow-sm">
      <div className="grid grid-cols-1 items-start lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-gray-100 bg-[#F1F3F5] lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
          <div className="p-3">
            <nav className="space-y-1">
              {tocItems.map((item) => {
                const isActive = activeId === item.id
                const level = item.level ?? 2
                const indentClass =
                  level === 4
                    ? 'ml-8 text-[13px]'
                    : level === 3
                      ? 'ml-4 text-[14px]'
                      : 'text-[15px]'

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTocClick(item.id)}
                    className={
                      isActive
                        ? `block w-full rounded-xl bg-white px-4 py-4 text-left font-bold leading-6 text-gray-950 shadow-sm ${indentClass}`
                        : `block w-full rounded-xl px-4 py-4 text-left font-medium leading-6 text-gray-500 transition hover:bg-white hover:text-gray-950 ${indentClass}`
                    }
                  >
                    {item.text}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <div className="border-b border-gray-100 bg-white p-4 lg:hidden">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">
            Muc luc
          </p>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {tocItems.map((item) => {
              const isActive = activeId === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTocClick(item.id)}
                  className={
                    isActive
                      ? 'max-w-[240px] shrink-0 truncate rounded-full bg-[#b72828] px-4 py-2 text-xs font-bold text-white'
                      : 'max-w-[240px] shrink-0 truncate rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600'
                  }
                >
                  {item.text}
                </button>
              )
            })}
          </nav>
        </div>

        <article
          id={PRODUCT_DETAIL_CONTENT_ID}
          className="min-w-0 scroll-mt-28 p-5 md:p-8 lg:p-10"
        >
          {expandable ? (
            <ExpandableContent
              maxHeight={maxHeight}
              expanded={contentExpanded}
              onExpandedChange={setContentExpanded}
              collapseScrollTargetId={PRODUCT_DETAIL_CONTENT_ID}
            >
              {content}
            </ExpandableContent>
          ) : (
            content
          )}
        </article>
      </div>
    </section>
  )
}
