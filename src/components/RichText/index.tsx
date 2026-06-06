'use client'
import React, { useState } from 'react'
import { ExpandableContent } from '@/components/ExpandableContent'

type LexicalNode = Record<string, any>

type RichTextProps = {
  data?: any
  content?: any
  className?: string
  showToc?: boolean
  expandable?: boolean
  maxHeight?: number
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
        text,
      }
    })
    .filter(Boolean) as Array<{ id: string; text: string }>
}

const renderFormattedText = (node: LexicalNode, index: number) => {
  let content: React.ReactNode = node.text || ''

  // Lexical format bitmask
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

  return <React.Fragment key={index}>{content}</React.Fragment>
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

  if (node.type === 'link') {
    const url = node.fields?.url || '#'

    return (
      <a
        key={index}
        href={url}
        target={node.fields?.newTab ? '_blank' : undefined}
        rel={node.fields?.newTab ? 'noopener noreferrer' : undefined}
        className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
      >
        {renderChildren(node.children)}
      </a>
    )
  }

  if (node.type === 'paragraph') {
    const hasContent =
      getTextFromNode(node).trim() ||
      node.children?.some((child: LexicalNode) => child.type === 'upload')

    if (!hasContent) return null

    return (
      <p key={index} className="mb-4 leading-8 text-gray-700">
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
          className="scroll-mt-28 mt-10 mb-4 text-2xl font-bold leading-snug text-gray-900"
        >
          {renderChildren(node.children)}
        </h2>
      )
    }

    if (node.tag === 'h3') {
      return (
        <h3
          key={index}
          className="mt-7 mb-3 text-xl font-semibold leading-snug text-gray-900"
        >
          {renderChildren(node.children)}
        </h3>
      )
    }

    return (
      <h2
        key={index}
        id={headingId}
        className="scroll-mt-28 mt-10 mb-4 text-2xl font-bold text-gray-900"
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
            ? 'mb-5 list-decimal space-y-2 pl-6 text-gray-700'
            : 'mb-5 list-disc space-y-2 pl-6 text-gray-700'
        }
      >
        {renderChildren(node.children)}
      </Tag>
    )
  }

  if (node.type === 'listitem') {
    return (
      <li key={index} className="leading-8">
        {renderChildren(node.children)}
      </li>
    )
  }

  // Nếu còn upload pending từ WP thì bỏ qua để frontend không lỗi
  if (node.type === 'upload') {
    return null
  }

  return null
}

export const RichText = ({
  data,
  content,
  className = '',
  showToc = true,
  expandable = false,
  maxHeight = 1000,
}: RichTextProps) => {
  const richText = data || content
  const children = richText?.root?.children || []

  const [isExpanded, setIsExpanded] = useState(false)

  if (!children.length) return null

  const tocItems = buildTocItems(children)
  const shouldShowToc = showToc && tocItems.length > 0

  const scrollToHeading = (id: string) => {
    setIsExpanded(true)

    setTimeout(() => {
      const element = document.getElementById(id)

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })

        window.history.replaceState(null, '', `#${id}`)
      }
    }, 100)
  }

  let h2Index = 0

  const articleContent = children.map((node: LexicalNode, index: number) => {
    let headingId: string | undefined

    if (node.type === 'heading' && node.tag === 'h2') {
      headingId = tocItems[h2Index]?.id
      h2Index++
    }

    return renderNode(node, index, headingId)
  })

  return (
    <div className={className}>
      {shouldShowToc && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-base font-bold text-gray-900">
            Mục lục
          </div>

          <nav className="space-y-2">
            {tocItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToHeading(item.id)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm leading-6 text-gray-700 transition hover:bg-gray-50 hover:text-primary"
              >
                {index + 1}. {item.text}
              </button>
            ))}
          </nav>
        </div>
      )}

      {expandable ? (
        <ExpandableContent
          maxHeight={maxHeight}
          expanded={isExpanded}
          onExpandedChange={setIsExpanded}
        >
          <div>{articleContent}</div>
        </ExpandableContent>
      ) : (
        <div>{articleContent}</div>
      )}
    </div>
  )
}

export default RichText