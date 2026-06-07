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

type LexicalNode = Record<string, any>

type ProductQuickNavProps = {
  description?: any
}

type ProductRichTextContentProps = {
  description?: any
  expandable?: boolean
  maxHeight?: number
}

const hasRichTextContent = (content: any) => {
  return (
    content &&
    typeof content === 'object' &&
    Array.isArray(content.root?.children) &&
    content.root.children.length > 0
  )
}

const getTextFromNode = (node: LexicalNode): string => {
  if (!node) return ''

  if (typeof node.text === 'string') return node.text

  if (Array.isArray(node.children)) {
    return node.children.map(getTextFromNode).join('')
  }

  return ''
}

const slugify = (text: string) => {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const buildTocItems = (children: LexicalNode[]) => {
  const used = new Map<string, number>()

  return children
    .map((node) => {
      if (node?.type !== 'heading' || node?.tag !== 'h2') return null

      const text = getTextFromNode(node).trim()
      if (!text) return null

      const baseId = slugify(text) || 'section'
      const count = used.get(baseId) || 0

      used.set(baseId, count + 1)

      return {
        id: count === 0 ? baseId : `${baseId}-${count + 1}`,
        title: text,
      }
    })
    .filter(Boolean) as Array<{ id: string; title: string }>
}

const scrollToHeading = (id: string) => {
  const element = document.getElementById(id)

  if (!element) return

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })

  window.history.replaceState(null, '', `#${id}`)
}

const PRODUCT_CONTENT_SCROLL_EVENT = 'product-content-scroll-to-heading'
const PRODUCT_DETAIL_CONTENT_ID = 'product-detail-content'

const requestOpenContentAndScroll = (id: string) => {
  window.dispatchEvent(
    new CustomEvent(PRODUCT_CONTENT_SCROLL_EVENT, {
      detail: { id },
    }),
  )
}

const renderFormattedText = (node: LexicalNode, index: number) => {
  let content: React.ReactNode = node.text || ''

  if (node.format & 1) content = <strong>{content}</strong>
  if (node.format & 2) content = <em>{content}</em>
  if (node.format & 8) content = <u>{content}</u>
  if (node.format & 16) {
    content = (
      <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
        {content}
      </code>
    )
  }

  return <span key={index}>{content}</span>
}

const renderChildren = (children: LexicalNode[] = []) => {
  return children.map((child, index) => renderNode(child, index))
}

const renderNode = (
  node: LexicalNode,
  index: number,
  headingId?: string,
): React.ReactNode => {
  if (!node?.type) return null

  if (node.type === 'text') {
    return renderFormattedText(node, index)
  }

  if (node.type === 'linebreak') {
    return <br key={index} />
  }

  if (node.type === 'link') {
    return (
      <a
        key={index}
        href={node.fields?.url || '#'}
        target={node.fields?.newTab ? '_blank' : undefined}
        rel={node.fields?.newTab ? 'noopener noreferrer' : undefined}
        className="font-medium text-blue-600 underline underline-offset-4 hover:text-[#b72828]"
      >
        {renderChildren(node.children)}
      </a>
    )
  }

  if (node.type === 'paragraph') {
    const hasContent = getTextFromNode(node).trim()

    if (!hasContent) return null

    return (
      <p key={index} className="mb-4 text-[15px] leading-8 text-gray-700 md:text-base">
        {renderChildren(node.children)}
      </p>
    )
  }

  if (node.type === 'heading') {
    if (node.tag === 'h2') {
      return (
        <h2
          key={index}
          id={headingId}
          className="scroll-mt-28 mt-8 mb-4 text-[22px] font-black leading-snug text-gray-950 md:text-2xl"
        >
          {renderChildren(node.children)}
        </h2>
      )
    }

    if (node.tag === 'h3') {
      return (
        <h3
          key={index}
          className="mt-6 mb-3 text-[18px] font-bold leading-snug text-gray-900 md:text-xl"
        >
          {renderChildren(node.children)}
        </h3>
      )
    }

    return (
      <h2
        key={index}
        id={headingId}
        className="scroll-mt-28 mt-8 mb-4 text-[22px] font-black text-gray-950 md:text-2xl"
      >
        {renderChildren(node.children)}
      </h2>
    )
  }

  if (node.type === 'list') {
    const Tag = node.tag === 'ol' || node.listType === 'number' ? 'ol' : 'ul'

    return (
      <Tag
        key={index}
        className={
          Tag === 'ol'
            ? 'mb-5 list-decimal space-y-2 pl-6 text-[15px] leading-8 text-gray-700 md:text-base'
            : 'mb-5 list-disc space-y-2 pl-6 text-[15px] leading-8 text-gray-700 md:text-base'
        }
      >
        {renderChildren(node.children)}
      </Tag>
    )
  }

  if (node.type === 'listitem') {
    return (
      <li key={index} className="pl-1">
        {renderChildren(node.children)}
      </li>
    )
  }

  if (node.type === 'quote') {
    return (
      <blockquote
        key={index}
        className="my-6 rounded-2xl border-l-4 border-[#b72828] bg-red-50/60 px-5 py-4 text-[15px] italic leading-8 text-gray-700"
      >
        {renderChildren(node.children)}
      </blockquote>
    )
  }

  if (node.type === 'horizontalrule') {
    return <hr key={index} className="my-8 border-gray-200" />
  }

  if (node.type === 'table') {
    return (
      <div key={index} className="my-6 overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
          <tbody>{renderChildren(node.children)}</tbody>
        </table>
      </div>
    )
  }

  if (node.type === 'tablerow') {
    return <tr key={index}>{renderChildren(node.children)}</tr>
  }

  if (node.type === 'tablecell') {
    const isHeader = node.headerState && node.headerState !== 0
    const CellTag = isHeader ? 'th' : 'td'

    return (
      <CellTag
        key={index}
        colSpan={node.colSpan || 1}
        rowSpan={node.rowSpan || 1}
        className={
          isHeader
            ? 'border border-gray-200 bg-gray-50 px-4 py-3 text-left font-bold text-gray-900'
            : 'border border-gray-200 px-4 py-3 text-gray-700'
        }
      >
        {renderChildren(node.children)}
      </CellTag>
    )
  }

  if (node.type === 'upload') {
    return null
  }

  return null
}

export function ProductQuickNav({ description }: ProductQuickNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [showTopButton, setShowTopButton] = useState(false)

  const children = description?.root?.children || []

  const items = useMemo(() => buildTocItems(children), [children])

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
                Mục lục
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="max-h-[82dvh] rounded-t-3xl bg-white px-5 pb-8 pt-6"
            >
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left">Mục lục nội dung</SheetTitle>
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
                    {item.title}
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
            aria-label="Lên đầu trang"
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
}: ProductRichTextContentProps) {
  const [activeId, setActiveId] = useState<string>('')

  const [contentExpanded, setContentExpanded] = useState(false)

  const handleTocClick = useCallback((id: string) => {
    setActiveId(id)
    setContentExpanded(true)

    window.setTimeout(() => {
      scrollToHeading(id)
    }, 120)
  }, [])

  const children = description?.root?.children || []

  const tocItems = useMemo(() => buildTocItems(children), [children])

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
  }, [tocItems.length])

  if (!hasRichTextContent(description)) return null

  let h2Index = 0

  const articleContent = children.map((node: LexicalNode, index: number) => {
    let headingId: string | undefined

    if (node.type === 'heading' && node.tag === 'h2') {
      headingId = tocItems[h2Index]?.id
      h2Index++
    }

    return renderNode(node, index, headingId)
  })

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
            <div>{articleContent}</div>
          </ExpandableContent>
        ) : (
          <div>{articleContent}</div>
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

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTocClick(item.id)}
                    className={
                      isActive
                        ? 'block w-full rounded-xl bg-white px-4 py-4 text-left text-[15px] font-bold leading-6 text-gray-950 shadow-sm'
                        : 'block w-full rounded-xl px-4 py-4 text-left text-[15px] font-medium leading-6 text-gray-500 transition hover:bg-white hover:text-gray-950'
                    }
                  >
                    {item.title}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <div className="border-b border-gray-100 bg-white p-4 lg:hidden">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">
            Mục lục
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
                      ? 'shrink-0 rounded-full bg-[#b72828] px-4 py-2 text-xs font-bold text-white'
                      : 'shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600'
                  }
                >
                  {item.title}
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
              <div>{articleContent}</div>
            </ExpandableContent>
          ) : (
            <div>{articleContent}</div>
          )}
        </article>
      </div>
    </section>
  )
}