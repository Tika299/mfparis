import type { Metadata } from 'next'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import {
  Calendar,
  User,
  Clock,
  Search,
  Share2,
  X,
  Link as LinkIcon,
  ChevronRight,
} from 'lucide-react'
import RichText from '@/components/RichText'
import { ExpandableContent } from '@/components/ExpandableContent'
import RelatedPostsCarousel from '@/components/Blog/RelatedPostsCarousel'
import { SITE_ORIGIN } from '@/utilities/seo'

type BlogPostPageProps = {
  params: Promise<{
    slug: string
  }>
}

type RelationshipMedia =
  | number
  | {
    url?: string | null
  }
  | null
  | undefined

type LexicalNode = Record<string, any>

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    SITE_ORIGIN
  )
}

async function getPostBySlug(slug: string) {
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    pagination: false,
    depth: 2,
  })

  return result.docs[0] ?? null
}

function extractPlainTextFromRichText(
  value: unknown,
): string {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const visit = (node: unknown): string[] => {
    if (!node || typeof node !== 'object') {
      return []
    }

    const record = node as Record<string, unknown>
    const parts: string[] = []

    if (typeof record.text === 'string') {
      const text = record.text.trim()

      if (text) {
        parts.push(text)
      }
    }

    if (Array.isArray(record.children)) {
      for (const child of record.children) {
        parts.push(...visit(child))
      }
    }

    return parts
  }

  const text = visit(value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

function truncateText(
  value: string,
  maxLength: number,
): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value
    .slice(0, maxLength - 1)
    .trim()}…`
}

function getPostDescription(
  post: {
    title?: string | null
    excerpt?: string | null
    content?: unknown
  },
): string {
  if (
    typeof post.excerpt === 'string' &&
    post.excerpt.trim()
  ) {
    return truncateText(
      post.excerpt.trim(),
      160,
    )
  }

  const contentText =
    extractPlainTextFromRichText(
      post.content,
    )

  if (contentText) {
    return truncateText(contentText, 160)
  }

  return `Khám phá bài viết ${post.title ?? 'mới nhất'} tại MF Paris.`
}

function getMediaUrl(
  media: RelationshipMedia,
): string | undefined {
  if (!media || typeof media !== 'object') {
    return undefined
  }

  if (
    typeof media.url !== 'string' ||
    !media.url.trim()
  ) {
    return undefined
  }

  try {
    return new URL(
      media.url,
      getSiteUrl(),
    ).toString()
  } catch {
    return undefined
  }
}

function getTextFromNode(node: LexicalNode): string {
  if (!node) return ''

  if (typeof node.text === 'string') {
    return node.text
  }

  if (Array.isArray(node.children)) {
    return node.children
      .map(getTextFromNode)
      .join('')
  }

  return ''
}

function slugify(text: string): string {
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

function buildTocItems(children: LexicalNode[]) {
  const used = new Map<string, number>()

  return children
    .map((node) => {
      if (
        node?.type !== 'heading' ||
        node?.tag !== 'h2'
      ) {
        return null
      }

      const text = getTextFromNode(node).trim()

      if (!text) {
        return null
      }

      const baseId =
        slugify(text) || 'section'
      const count =
        used.get(baseId) || 0

      used.set(baseId, count + 1)

      return {
        id:
          count === 0
            ? baseId
            : `${baseId}-${count + 1}`,
        text,
      }
    })
    .filter(Boolean) as Array<{
      id: string
      text: string
    }>
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params

  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Bài viết không tồn tại | MF Paris',
      description:
        'Bài viết bạn đang tìm kiếm hiện không tồn tại tại MF Paris.',
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const title = `${post.title} | MF Paris`
  const description =
    getPostDescription(post)
  const canonicalUrl = `/blog/${encodeURIComponent(
    slug,
  )}`
  const imageUrl = getMediaUrl(
    (post as any).thumbnail,
  )

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      locale: 'vi_VN',
      url: canonicalUrl,
      siteName: 'MF Paris',
      title,
      description,
      images: imageUrl
        ? [
          {
            url: imageUrl,
            alt: post.title,
          },
        ]
        : undefined,
    },
    twitter: {
      card: imageUrl
        ? 'summary_large_image'
        : 'summary',
      title,
      description,
      images: imageUrl
        ? [imageUrl]
        : undefined,
    },
  }
}

export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { slug } = await params
  const payload = await getPayload({
    config: configPromise,
  })

  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    depth: 2,
  })

  const post: any = result.docs[0]
  if (!post) notFound()

  const categoryIds =
    post.categories?.map(
      (cat: any) => cat.id,
    ) || []

  const tocItems = buildTocItems(
    post.content?.root?.children || [],
  )

  const [featuredPosts, relatedPosts] =
    await Promise.all([
      payload.find({
        collection: 'posts',
        limit: 5,
        sort: '-createdAt',
        where: {
          slug: { not_equals: slug },
        },
      }),
      payload.find({
        collection: 'posts',
        limit: 8,
        depth: 1,
        sort: '-createdAt',
        where: {
          and: [
            {
              slug: {
                not_equals: slug,
              },
            },
            {
              categories: {
                in: categoryIds,
              },
            },
          ],
        },
      }),
    ])

  return (
    <div className="min-h-screen bg-[#FDFBF9] pb-20 font-sans">
      <div className="mx-auto max-w-[1240px] px-4 py-6">
        <nav className="mb-10 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Link
            href="/"
            className="hover:text-black"
          >
            Trang chủ
          </Link>

          <ChevronRight size={10} />

          <Link
            href="/blog"
            className="hover:text-black"
          >
            Blog
          </Link>

          <ChevronRight size={10} />

          <span className="max-w-[300px] truncate text-gray-900">
            {post.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <article className="rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-sm md:p-12">
              <header className="mb-10">
                <div className="mb-4 flex gap-2">
                  {post.categories?.map(
                    (cat: any) => (
                      <span
                        key={cat.id}
                        className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#E54D2E]"
                      >
                        {cat.title}
                      </span>
                    ),
                  )}
                </div>

                <h1 className="mb-8 text-3xl font-bold leading-[1.1] tracking-tighter text-gray-900 md:text-5xl">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-[12px] font-medium text-gray-400">
                  <div className="flex items-center gap-2 text-gray-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
                      <User size={16} />
                    </div>
                    <span>MF Paris Editorial</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />{' '}
                    {new Date(
                      post.createdAt,
                    ).toLocaleDateString(
                      'vi-VN',
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock size={14} /> 4 phút đọc
                  </div>
                </div>
              </header>

              <div className="relative mb-12 aspect-video w-full overflow-hidden rounded-[2rem] bg-[#f4f0ed] shadow-xl">
                <OptimizedImage
                  media={post.thumbnail}
                  size="large"
                  alt={post.title}
                  priority
                  className="h-full w-full object-cover object-center"
                />
              </div>

              <div className="max-w-none">
                <ExpandableContent maxHeight={500}>
                  <RichText
                    content={post.content}
                    showToc={false}
                  />
                </ExpandableContent>
              </div>

              <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-gray-100 pt-10 md:flex-row">
                <div
                  className="flex flex-wrap gap-2"
                  style={{
                    alignItems: 'center',
                  }}
                >
                  <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Tags:
                  </span>

                  {post.categories?.map(
                    (tag: any) => (
                      <span
                        key={tag.id}
                        className="cursor-pointer rounded-full bg-gray-50 px-4 py-1.5 text-[11px] font-bold lowercase text-gray-500 transition-colors hover:bg-gray-100"
                      >
                        #{tag.title}
                      </span>
                    ),
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-3">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 transition-all hover:bg-[#1877F2] hover:text-white">
                      <Share2 size={18} />
                    </button>

                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 transition-all hover:bg-black hover:text-white">
                      <X size={18} />
                    </button>

                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 transition-all hover:bg-orange-600 hover:text-white">
                      <LinkIcon size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {relatedPosts.docs.length > 0 && (
              <RelatedPostsCarousel
                posts={relatedPosts.docs}
              />
            )}
          </div>

          <aside className="lg:col-span-4 space-y-10">
            <form
              action="/blog"
              className="group relative flex items-center"
            >
              <input
                name="q"
                type="text"
                placeholder="Tìm bài viết..."
                className="h-12 w-full rounded-2xl border border-gray-100 bg-white pl-5 pr-12 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-100"
              />

              <button
                type="submit"
                className="absolute right-3 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-primary"
                aria-label="Tìm bài viết"
              >
                <Search size={18} />
              </button>
            </form>

            {tocItems.length > 0 && (
              <div className="lg:sticky lg:top-[190px]">
                <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm">
                  <h3 className="mb-6 flex items-center gap-3 text-[13px] font-black uppercase tracking-[0.2em] text-gray-900">
                    <span className="h-5 w-1 bg-primary"></span>
                    Mục lục
                  </h3>

                  <nav className="space-y-2">
                    {tocItems.map((item, index) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block rounded-xl px-3 py-2 text-sm leading-6 text-gray-700 transition hover:bg-gray-50 hover:text-primary"
                      >
                        {index + 1}. {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}