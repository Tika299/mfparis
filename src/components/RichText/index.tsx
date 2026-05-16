import React, { Fragment } from 'react'
import { cn } from '@/utilities'
import { OptimizedImage } from '@/components/OptimizedImage'

// Định nghĩa các loại Node cơ bản của Lexical
type LexicalNode = {
  type: string
  tag?: string
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  children?: LexicalNode[]
  value?: any // Dùng cho node Upload (Hình ảnh)
  format?: string | number
  [key: string]: any
}

// Hàm chuyển đổi từ JSON sang JSX
function serializeLexical(nodes: LexicalNode[]): React.ReactNode {
  if (!nodes) return null

  return nodes.map((node, i) => {
    if (node.type === 'text') {
      let text: React.ReactNode = <span key={i}>{node.text}</span>

      // Ensure format is a number (it may be undefined or a string)
      const formatNum =
        typeof node.format === 'number' ? node.format : parseInt(String(node.format || ''), 10) || 0

      if (formatNum & 1) text = <strong key={i}>{text}</strong> // Bold
      if (formatNum & 2) text = <em key={i}>{text}</em> // Italic
      if (formatNum & 8) text = <u key={i}>{text}</u> // Underline
      return <Fragment key={i}>{text}</Fragment>
    }

    if (!node) return null

    switch (node.type) {
      case 'h1':
        return <h1 key={i}>{serializeLexical(node.children!)}</h1>
      case 'h2':
        return <h2 key={i}>{serializeLexical(node.children!)}</h2>
      case 'h3':
        return <h3 key={i}>{serializeLexical(node.children!)}</h3>
      case 'list':
        if (node.tag === 'ol') {
          return (
            <ol key={i} className="list-decimal pl-6 my-6 space-y-2">
              {serializeLexical(node.children!)}
            </ol>
          )
        } else {
          return (
            <ul key={i} className="list-disc pl-6 my-6 space-y-2">
              {serializeLexical(node.children!)}
            </ul>
          )
        }
      case 'listitem':
        return (
          <li key={i} className="leading-relaxed text-gray-700">
            {serializeLexical(node.children!)}
          </li>
        )
      case 'quote':
        return <blockquote key={i}>{serializeLexical(node.children!)}</blockquote>

      // XỬ LÝ HÌNH ẢNH CHÈN TRONG BÀI VIẾT
      case 'upload':
        return (
          <div
            key={i}
            className="my-10 w-full aspect-video md:aspect-[21/9] relative rounded-[2rem] overflow-hidden shadow-xl"
          >
            <OptimizedImage
              media={node.value}
              size="large"
              alt={node.value?.alt || 'MF Paris Content Image'}
            />
          </div>
        )

      default:
        return <p key={i}>{serializeLexical(node.children!)}</p>
    }
  })
}

export default function RichText({ content, className }: { content: any; className?: string }) {
  if (!content) return null

  // TRƯỜNG HỢP 1: Dữ liệu Migrated từ WordPress (HTML nằm trong mảng con đầu tiên)
  const firstChildText = content?.root?.children?.[0]?.children?.[0]?.text
  const isMigratedHTML = typeof firstChildText === 'string' && firstChildText.includes('<')

  if (isMigratedHTML) {
    return (
      <div
        className={cn('prose prose-neutral prose-lg max-w-none', className)}
        dangerouslySetInnerHTML={{ __html: firstChildText }}
      />
    )
  }

  // TRƯỜNG HỢP 2: Dữ liệu Lexical chuẩn (Soạn mới hoàn toàn)
  return (
    <div className={cn('prose prose-neutral prose-lg max-w-none', className)}>
      {content.root && serializeLexical(content.root.children)}
    </div>
  )
}
