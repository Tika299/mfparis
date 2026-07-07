import { normalizeContentHtml } from '@/lib/html/contentHtml'

type SafeHtmlContentProps = {
  html?: unknown
  className?: string
}

export function SafeHtmlContent({
  html,
  className,
}: SafeHtmlContentProps) {
  const cleanHtml = normalizeContentHtml(html)

  if (!cleanHtml) {
    return null
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  )
}
