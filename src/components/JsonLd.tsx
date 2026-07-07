import React from 'react'

type JsonLdProps = {
  data: Record<string, unknown> | null | undefined
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) {
    return null
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
