import type { ReactNode } from 'react'

import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

type PolicyDocumentProps = Readonly<{
  path: string
  title: string
  description: string
  contentHtml: string
  eyebrow?: string
}>

export function PolicyDocument({
  path,
  title,
  description,
  contentHtml,
  eyebrow = 'MF Paris',
}: PolicyDocumentProps): ReactNode {
  const schemaGraph = buildStaticPageSchemaGraph({
    page: { url: path, name: title, description, type: 'WebPage' },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: title, url: path },
    ],
  })

  return (
    <main className="bg-[#f7f7f7] py-12">
      <JsonLd data={schemaGraph} />
      <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
        <p className="text-sm font-bold uppercase tracking-widest text-[#b72828]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black text-gray-950">{title}</h1>
        <div
          className="policy-document mt-8 text-sm leading-7 text-gray-700 md:text-base [&_h1]:mb-5 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-gray-950 [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-gray-950 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-gray-950 [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:font-bold [&_h4]:text-gray-950 [&_p]:mb-4 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_a]:text-[#b72828] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </main>
  )
}
