'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListTree, X } from 'lucide-react'
import { ExpandableContent } from '@/components/ExpandableContent'
import { addHeadingIds } from '@/lib/html/contentHtml'

type TocItem = {
  id: string
  text: string
}

type BlogRichTextContentProps = {
  content: unknown
  tocItems: TocItem[]
  maxHeight?: number
}

type BlogTocNavProps = {
  tocItems: TocItem[]
}

const BLOG_TOC_SCROLL_EVENT = 'blog-toc-scroll-to-heading'

function scrollToHeading(id: string) {
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

export function BlogRichTextContent({
  content,
  tocItems,
  maxHeight = 500,
}: BlogRichTextContentProps) {
  const [expanded, setExpanded] = useState(false)
  const html = useMemo(() => addHeadingIds(content, tocItems), [content, tocItems])

  const openAndScrollTo = useCallback((id: string) => {
    setExpanded(true)

    window.setTimeout(() => {
      scrollToHeading(id)
    }, 160)
  }, [])

  useEffect(() => {
    const handleTocScroll = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>
      const id = customEvent.detail?.id

      if (!id) return

      openAndScrollTo(id)
    }

    window.addEventListener(BLOG_TOC_SCROLL_EVENT, handleTocScroll)

    return () => {
      window.removeEventListener(BLOG_TOC_SCROLL_EVENT, handleTocScroll)
    }
  }, [openAndScrollTo])

  return (
    <div className="blog-content prose max-w-none">
      <ExpandableContent
        maxHeight={maxHeight}
        expanded={expanded}
        onExpandedChange={setExpanded}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </ExpandableContent>
    </div>
  )
}


export function BlogMobileTocButton({ tocItems }: BlogTocNavProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (tocItems.length === 0) {
    return null
  }

  const selectHeading = (id: string) => {
    setOpen(false)

    window.dispatchEvent(
      new CustomEvent(BLOG_TOC_SCROLL_EVENT, {
        detail: { id },
      }),
    )
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed left-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[65] inline-flex h-11 items-center gap-2 rounded-full bg-[#E54D2E] px-4 text-[12px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(229,77,46,0.34)] transition hover:bg-[#d43f22] focus:outline-none focus:ring-4 focus:ring-red-100"
      >
        <ListTree size={17} strokeWidth={2.2} />
        Mục lục
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] bg-black/35 px-3 pb-4 pt-20 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Mục lục bài viết"
          onClick={() => setOpen(false)}
        >
          <div
            className="ml-auto flex max-h-[72vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-gray-950">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[#E54D2E]">
                  <ListTree size={17} strokeWidth={2.2} />
                </span>
                Mục lục bài viết
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng mục lục"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-50 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="overflow-y-auto px-3 py-3">
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectHeading(item.id)}
                  className="flex w-full gap-3 rounded-2xl px-3 py-3 text-left text-sm leading-6 text-gray-700 transition hover:bg-red-50 hover:text-[#E54D2E]"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-black text-gray-500">
                    {index + 1}
                  </span>
                  <span className="font-semibold">{item.text}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function BlogTocNav({ tocItems }: BlogTocNavProps) {
  return (
    <nav className="space-y-2">
      {tocItems.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent(BLOG_TOC_SCROLL_EVENT, {
                detail: { id: item.id },
              }),
            )
          }}
          className="block w-full rounded-xl px-3 py-2 text-left text-sm leading-6 text-gray-700 transition hover:bg-gray-50 hover:text-primary"
        >
          {index + 1}. {item.text}
        </button>
      ))}
    </nav>
  )
}
