import type { Metadata } from 'next'
import type { Where } from 'payload'

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
import {
  BlogRichTextContent,
  BlogTocNav,
} from '@/components/Blog/BlogRichTextContent'
import RelatedPostsCarousel from '@/components/Blog/RelatedPostsCarousel'
import { BlogPostEngagement } from '@/components/Blog/BlogPostEngagement'
import { BlogComments } from '@/components/Blog/BlogComments'
import { SITE_ORIGIN } from '@/utilities/seo'
import { extractHtmlHeadings, htmlToPlainText } from '@/lib/html/contentHtml'
import { buildBlogPostingSchemaGraph } from '@/lib/structured-data'
import '@/styles/blog.css'
import '@/styles/prose.css'
import '@/styles/carousel-overrides.css'

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

type BlogFaqItem = {
  question: string
  answer: string
}

type BlogPersonInfo = {
  name: string
  title?: string | null
  url?: string | null
  avatarUrl?: string | null
  bio?: string | null
  reviewedAt?: string | null
}

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

  const contentText = htmlToPlainText(post.content)

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

function getBlogHeadingClassName(tag?: string) {
  if (tag === 'h2') {
    return 'scroll-mt-28 mt-12 mb-5 text-2xl font-black leading-tight text-gray-950 md:text-3xl'
  }

  if (tag === 'h3') {
    return 'mt-9 mb-4 text-xl font-bold leading-snug text-gray-900 md:text-2xl'
  }

  return 'mt-8 mb-4 text-lg font-bold leading-snug text-gray-900'
}

function getPostFaqItems(post: any): BlogFaqItem[] {
  if (!Array.isArray(post?.faq)) {
    return []
  }

  return post.faq
    .map((item: any) => ({
      question:
        typeof item?.question === 'string'
          ? item.question.trim()
          : '',
      answer:
        typeof item?.answer === 'string'
          ? item.answer.trim()
          : '',
    }))
    .filter(
      (item: BlogFaqItem) =>
        item.question.length > 0 &&
        item.answer.length > 0,
    )
}

function getPostSeoKeywords(post: any): string[] {
  const keywords = post?.seo?.keywords

  if (!Array.isArray(keywords)) {
    return []
  }

  return keywords
    .map((item: any) => {
      if (typeof item === 'string') {
        return item
      }

      if (typeof item?.keyword === 'string') {
        return item.keyword
      }

      return ''
    })
    .map((item: string) => item.trim())
    .filter(Boolean)
}

function getReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 220))
}

function getOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function getBlogPersonInfo(
  value: unknown,
  fallback: BlogPersonInfo,
): BlogPersonInfo {
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const record = value as Record<string, unknown>

  return {
    name: getOptionalText(record.name) || fallback.name,
    title: getOptionalText(record.title) || fallback.title,
    url: getOptionalText(record.url) || fallback.url,
    avatarUrl: getMediaUrl(record.avatar as RelationshipMedia) || fallback.avatarUrl,
    bio: getOptionalText(record.bio) || fallback.bio,
    reviewedAt: getOptionalText(record.reviewedAt) || fallback.reviewedAt,
  }
}

function getPostRatingStats(post: any) {
  const rating = post?.rating || {}
  const average = Math.min(
    5,
    Math.max(0, Number(rating.average) || 0),
  )
  const count = Math.max(0, Number(rating.count) || 0)

  return {
    average,
    count,
  }
}

function getPostViewCount(post: any): number {
  return Math.max(0, Number(post?.viewCount) || 0)
}

function formatPostDate(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('vi-VN')
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
    Array.isArray(post.categories)
      ? post.categories
        .map((cat: any) => cat?.id)
        .filter(Boolean)
      : []

  const tocItems = extractHtmlHeadings(post.content)

  const contentChildren =
    post.content?.root?.children || []

  const headingIdByNode = new Map<LexicalNode, string>()

  contentChildren.forEach((node: LexicalNode) => {
    if (node?.type !== 'heading' || node?.tag !== 'h2') {
      return
    }

    const text = getTextFromNode(node).trim()
    const item = tocItems.find(
      (tocItem) => tocItem.text === text,
    )

    if (item) {
      headingIdByNode.set(node, item.id)
    }
  })

  const richTextConverters = ({ defaultConverters }: any) => ({
    ...defaultConverters,

    heading: ({ node, nodesToJSX }: any) => {
      const Tag = node.tag || 'h2'
      const id =
        node.tag === 'h2'
          ? headingIdByNode.get(node)
          : undefined

      return (
        <Tag
          id={id}
          className={getBlogHeadingClassName(node.tag)}
        >
          {nodesToJSX({ nodes: node.children })}
        </Tag>
      )
    },
  })

  const canonicalUrl = `/blog/${encodeURIComponent(slug)}`
  const description = getPostDescription(post)
  const imageUrl = getMediaUrl(post.thumbnail)
  const postPlainText = htmlToPlainText(post.content)
  const wordCount = postPlainText.split(/\s+/u).filter(Boolean).length
  const readingMinutes = getReadingMinutes(wordCount)
  const faqItems = getPostFaqItems(post)
  const authorInfo = getBlogPersonInfo(post.author, {
    name: 'Marais de France',
    title: 'MF Paris Editorial',
    url: '/author/mfparis/',
    avatarUrl: '/api/media/file/logo-thuong-hieu-marais-de-france-1200x1200-1-edited-e1768551529162.png',
    bio: 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.',
  })
  const reviewerInfo = getBlogPersonInfo(post.reviewer, {
    name: 'Marais de France',
    title: 'Content Reviewer',
    url: '/about',
  })
  const ratingStats = getPostRatingStats(post)
  const viewCount = getPostViewCount(post)
  const articleSection = Array.isArray(post.categories)
    ? post.categories
      .map((category: any) => category?.title || category?.name)
      .filter(Boolean)
      .join(', ')
    : undefined
  let relatedPostsWhere: Where = {
    slug: {
      not_equals: slug,
    },
  }

  if (categoryIds.length > 0) {
    relatedPostsWhere = {
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
    }
  }
  const [featuredPosts, relatedPosts, blogComments] =
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
        limit: categoryIds.length > 0 ? 16 : 8,
        depth: 1,
        sort: '-createdAt',
        where: relatedPostsWhere,
      }),
      payload.find({
        collection: 'blog-comments' as any,
        depth: 0,
        limit: 30,
        sort: '-createdAt',
        where: {
          and: [
            {
              post: {
                equals: post.id,
              },
            },
            {
              status: {
                equals: 'approved',
              },
            },
          ],
        },
      }),
    ])
  const relatedPostDocs = relatedPosts.docs.slice(0, 4)
  const approvedBlogComments = blogComments.docs
  const schemaGraph = buildBlogPostingSchemaGraph({
    page: {
      url: canonicalUrl,
      name: post.title,
      description,
      type: 'WebPage',
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
    },
    article: {
      url: canonicalUrl,
      headline: post.title,
      description,
      image: imageUrl,
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      authorName: authorInfo.name,
      authorUrl: authorInfo.url,
      authorImage: authorInfo.avatarUrl,
      reviewerName: reviewerInfo.name,
      reviewerUrl: reviewerInfo.url,
      dateReviewed: reviewerInfo.reviewedAt,
      articleSection,
      keywords: [
        ...getPostSeoKeywords(post),
        ...(Array.isArray(post.categories)
          ? post.categories.map((category: any) => category?.title || category?.name).filter(Boolean)
          : []),
      ],
      wordCount,
      faq: faqItems.length > 0
        ? {
          questions: faqItems,
        }
        : undefined,
    },
    breadcrumb: [
      {
        name: 'Trang chủ',
        url: '/',
      },
      {
        name: 'Blog',
        url: '/blog',
      },
      {
        name: post.title,
        url: canonicalUrl,
      },
    ],
    relatedItems: relatedPostDocs.map((relatedPost: any) => ({
      url: `/blog/${relatedPost.slug}`,
      name: relatedPost.title,
      description: getPostDescription(relatedPost),
      image: getMediaUrl(relatedPost.thumbnail),
      type: 'BlogPosting',
      datePublished: relatedPost.createdAt,
      dateModified: relatedPost.updatedAt,
    })),
  })

  return (
    <div className="min-h-screen bg-[#FDFBF9] pb-20 font-sans">
      <script
        type="application/ld+json"
        className="rank-math-schema-pro"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaGraph).replace(/</gu, '\\u003c'),
        }}
      />
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
                    <span>{authorInfo.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Ngày đăng: {formatPostDate(post.createdAt)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Cập nhật: {formatPostDate(post.updatedAt || post.createdAt)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock size={14} /> {readingMinutes} phút đọc
                  </div>
                </div>
                <BlogPostEngagement
                  authorName={authorInfo.name}
                  authorTitle={authorInfo.title}
                  initialRatingAverage={ratingStats.average}
                  initialRatingCount={ratingStats.count}
                  initialViewCount={viewCount}
                  postId={post.id}
                  reviewedAt={reviewerInfo.reviewedAt}
                  reviewerName={reviewerInfo.name}
                  reviewerTitle={reviewerInfo.title}
                />
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

              <BlogRichTextContent
                content={post.content}
                tocItems={tocItems}
                maxHeight={500}
              />


              <section
                className="mt-14 rounded-[2rem] border border-gray-100 bg-[#fffaf7] p-6 md:p-8"
                aria-labelledby="blog-author-heading"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[#E54D2E] shadow-sm">
                    {authorInfo.avatarUrl ? (
                      <img
                        src={authorInfo.avatarUrl}
                        alt={authorInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={26} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#E54D2E]">
                      Tác giả
                    </p>
                    <h2
                      id="blog-author-heading"
                      className="mt-1 text-xl font-black text-gray-950"
                    >
                      {authorInfo.name}
                    </h2>
                    {authorInfo.title ? (
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {authorInfo.title}
                      </p>
                    ) : null}
                    {authorInfo.bio ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                        {authorInfo.bio}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              {faqItems.length > 0 ? (
                <section
                  className="mt-14 rounded-[2rem] border border-orange-100 bg-orange-50/40 p-6 md:p-8"
                  aria-labelledby="post-faq-heading"
                >
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E54D2E]">
                    FAQ
                  </p>

                  <h2
                    id="post-faq-heading"
                    className="mt-2 text-2xl font-black tracking-tight text-gray-950 md:text-3xl"
                  >
                    Câu hỏi thường gặp
                  </h2>

                  <div className="mt-6 divide-y divide-orange-100">
                    {faqItems.map((item, index) => (
                      <details
                        key={`${item.question}-${index}`}
                        className="group py-4"
                      >
                        <summary className="cursor-pointer list-none text-base font-bold text-gray-950 marker:hidden">
                          {item.question}
                        </summary>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                          {item.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

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

            {relatedPostDocs.length > 0 && (
              <RelatedPostsCarousel
                posts={relatedPostDocs}
              />
            )}

            <BlogComments
              comments={approvedBlogComments}
              postId={post.id}
            />

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

                  <BlogTocNav tocItems={tocItems} />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

