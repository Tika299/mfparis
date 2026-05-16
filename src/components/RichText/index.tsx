import React, { Fragment } from 'react'
import { cn } from '@/utilities'
import { OptimizedImage } from '@/components/OptimizedImage'

function serializeLexical(nodes: any[]): React.ReactNode {
  if (!nodes) return null

  return nodes.map((node, i) => {
    // 1. XỬ LÝ TEXT NODE (Hỗ trợ cả text thường và mã HTML trộn lẫn)
    if (node.type === 'text') {
      const isHTML = node.text?.includes('<') && node.text?.includes('>')

      if (isHTML) {
        return <div key={i} dangerouslySetInnerHTML={{ __html: node.text }} />
      }

      let text: React.ReactNode = <span key={i}>{node.text}</span>
      const formatNum = node.format || 0
      if (formatNum & 1) text = <strong key={i}>{text}</strong>
      if (formatNum & 2) text = <em key={i}>{text}</em>
      if (formatNum & 8) text = <u key={i}>{text}</u>
      return <Fragment key={i}>{text}</Fragment>
    }

    if (!node) return null

    // 2. XỬ LÝ ELEMENT NODE
    switch (node.type) {
      case 'heading': {
        const Tag = (node.tag || 'h2') as any
        return (
          <Tag key={i} className="font-serif italic font-bold mt-10 mb-4">
            {serializeLexical(node.children)}
          </Tag>
        )
      }

      case 'paragraph':
        // Nếu paragraph chỉ chứa 1 con và con đó là HTML, không bọc thẻ <p> nữa để tránh lỗi lồng thẻ
        const isChildHTML = node.children?.[0]?.text?.includes('<')
        if (isChildHTML) {
          return (
            <div key={i} className="my-4">
              {serializeLexical(node.children)}
            </div>
          )
        }
        return (
          <p key={i} className="mb-6 leading-relaxed text-gray-600">
            {serializeLexical(node.children)}
          </p>
        )

      case 'list': {
        const Tag = node.tag === 'ol' ? 'ol' : 'ul'
        return (
          <Tag
            key={i}
            className={cn(node.tag === 'ol' ? 'list-decimal' : 'list-disc', 'pl-8 mb-6 space-y-2')}
          >
            {serializeLexical(node.children)}
          </Tag>
        )
      }

      case 'listitem':
        return <li key={i}>{serializeLexical(node.children)}</li>

      case 'upload': {
        // Fix lỗi Preview: Trong chế độ Edit, node.value có thể là ID (number) hoặc Object
        // Nếu là ID, OptimizedImage sẽ hiện placeholder, nếu là Object sẽ hiện ảnh thật
        return (
          <div
            key={i}
            className="my-12 w-full aspect-video relative rounded-[2rem] overflow-hidden shadow-xl bg-gray-50"
          >
            <OptimizedImage
              media={node.value}
              size="large"
              alt={node.value?.alt || 'MF Paris Content'}
            />
          </div>
        )
      }

      default:
        return node.children ? serializeLexical(node.children) : null
    }
  })
}

export default function RichText({ content, className }: { content: any; className?: string }) {
  if (!content) return null

  // Xử lý trường hợp dữ liệu thô là chuỗi HTML (không phải Object JSON)
  if (typeof content === 'string') {
    return (
      <div
        className={cn('prose max-w-none', className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className={cn('prose prose-neutral prose-lg max-w-none', className)}>
      {content.root && serializeLexical(content.root.children)}
    </div>
  )
}
