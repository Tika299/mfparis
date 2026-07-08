import React from 'react'

type JsonLdProps = {
  data: Record<string, unknown> | null | undefined
}

function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) {
    return null
  }

  const graph = data['@graph']

  if (Array.isArray(graph)) {
    return (
      <>
        {graph.map((item, index) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null
          }

          const node = item as Record<string, unknown>
          const key =
            typeof node['@id'] === 'string'
              ? node['@id']
              : `${typeof node['@type'] === 'string' ? node['@type'] : 'jsonld'}-${index}`

          return (
            <script
              key={key}
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd({
                  '@context': data['@context'] || 'https://schema.org',
                  ...node,
                }),
              }}
            />
          )
        })}
      </>
    )
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  )
}
