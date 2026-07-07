'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
