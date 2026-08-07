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
  Search, ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  BlogMobileTocButton,
  BlogRichTextContent,
  BlogTocNav,
} from '@/components/Blog/BlogRichTextContent'
import RelatedPostsCarousel from '@/components/Blog/RelatedPostsCarousel'
import { BlogPostEngagement } from '@/components/Blog/BlogPostEngagement'
import { BlogComments } from '@/components/Blog/BlogComments'
import { BlogShareButtons } from '@/components/Blog/BlogShareButtons'
import { JsonLd } from '@/components/JsonLd'
import { SITE_ORIGIN } from '@/utilities/seo'
import { extractHtmlHeadings, htmlToPlainText } from '@/lib/html/contentHtml'
import { buildBlogPostingSchemaGraph } from '@/lib/structured-data'
import '@/styles/blog.css'
import '@/styles/prose.css'
import '@/styles/carousel-overrides.css'
import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'

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
  sameAs?: string[] | null
}

type BlogBreadcrumbItem = {
  name: string
  url: string
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    SITE_ORIGIN
  )
}

function getCleanPostTitle(title: unknown): string {
  return String(title || '')
    .replace(/\s*\|\s*(?:MF Paris|Marais de France)\s*$/gi, '')
    .trim()
}

function getPostSeoTitle(title: unknown): string {
  const cleanTitle = getCleanPostTitle(title)

  return cleanTitle
    ? `${cleanTitle} | MF Paris`
    : 'Blog MF Paris'
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

function getPostCategoryName(
  category: any,
): string {
  if (!category || typeof category !== 'object') {
    return ''
  }

  return String(
    category.title || category.name || '',
  ).trim()
}

function getPostCategoryUrl(
  category: any,
): string {
  const slug =
    typeof category?.slug === 'string'
      ? category.slug.trim()
      : ''

  return slug
    ? `/blog/category/${encodeURIComponent(slug)}`
    : '/blog'
}

function getPostCategoryParent(
  category: any,
): any | null {
  return category?.parent &&
    typeof category.parent === 'object'
    ? category.parent
    : null
}

function getPostCategoryDepth(
  category: any,
): number {
  let depth = 0
  let currentCategory = getPostCategoryParent(category)
  const visitedIDs = new Set<unknown>([
    category?.id,
  ])

  while (
    currentCategory &&
    !visitedIDs.has(currentCategory.id)
  ) {
    depth += 1
    visitedIDs.add(currentCategory.id)
    currentCategory =
      getPostCategoryParent(currentCategory)
  }

  return depth
}

function getPostCategoryTrail(
  category: any,
): any[] {
  const trail: any[] = []
  let currentCategory = category
  const visitedIDs = new Set<unknown>()

  while (
    currentCategory &&
    typeof currentCategory === 'object' &&
    !visitedIDs.has(currentCategory.id)
  ) {
    if (getPostCategoryName(currentCategory)) {
      trail.unshift(currentCategory)
    }

    visitedIDs.add(currentCategory.id)
    currentCategory =
      getPostCategoryParent(currentCategory)
  }

  return trail
}

function getPostBreadcrumbItems(
  post: any,
): BlogBreadcrumbItem[] {
  const categories = Array.isArray(post?.categories)
    ? post.categories.filter((category: any) =>
      getPostCategoryName(category),
    )
    : []

  if (!categories.length) {
    return []
  }

  const primaryCategory = [...categories].sort(
    (leftCategory: any, rightCategory: any) => {
      const depthDelta =
        getPostCategoryDepth(rightCategory) -
        getPostCategoryDepth(leftCategory)

      if (depthDelta !== 0) {
        return depthDelta
      }

      return getPostCategoryName(
        leftCategory,
      ).localeCompare(
        getPostCategoryName(rightCategory),
        'vi',
      )
    },
  )[0]

  return getPostCategoryTrail(primaryCategory).map(
    (category) => ({
      name: getPostCategoryName(category),
      url: getPostCategoryUrl(category),
    }),
  )
}

function getBlogSchemaBreadcrumbItems(
  post: any,
  canonicalUrl: string,
  categoryBreadcrumbItems: BlogBreadcrumbItem[],
): BlogBreadcrumbItem[] {
  return [
    {
      name: 'Trang chủ',
      url: '/',
    },
    ...categoryBreadcrumbItems,
    {
      name: post.title,
      url: canonicalUrl,
    },
  ]
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

function getStringArrayFromUnknown(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const items = value
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      if (
        item &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).url === 'string'
      ) {
        return (item as Record<string, string>).url
      }

      return ''
    })
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : null
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
    sameAs: getStringArrayFromUnknown(record.sameAs) || fallback.sameAs,
  }
}

function getBlogAuthorProfileInfo(
  value: unknown,
  fallback: BlogPersonInfo,
): BlogPersonInfo {
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const record = value as Record<string, unknown>
  const slug = getOptionalText(record.slug)
  const url =
    getOptionalText(record.url) ||
    (slug ? `/author/${slug}/` : fallback.url)

  return {
    name: getOptionalText(record.name) || fallback.name,
    title: getOptionalText(record.title) || fallback.title,
    url,
    avatarUrl: getMediaUrl(record.avatar as RelationshipMedia) || fallback.avatarUrl,
    bio: getOptionalText(record.bio) || fallback.bio,
    reviewedAt: fallback.reviewedAt,
    sameAs: getStringArrayFromUnknown(record.sameAs) || fallback.sameAs,
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

function BlogPostPager({
  nextPost,
  previousPost,
}: {
  nextPost?: any
  previousPost?: any
}) {
  if (!previousPost && !nextPost) {
    return null
  }

  return (
    <nav
      aria-label="Bài viết trước và sau"
      className="mt-10 grid gap-4 md:grid-cols-2"
    >
      {previousPost ? (
        <Link
          href={`/blog/${previousPost.slug}`}
          className="group flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-red-100 hover:bg-red-50/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors group-hover:bg-white group-hover:text-primary">
            <ChevronLeft
              aria-hidden="true"
              size={18}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
              Bài trước
            </span>
            <span className="mt-1 line-clamp-2 block text-sm font-bold leading-snug text-gray-950 group-hover:text-primary">
              {previousPost.title}
            </span>
            {previousPost.createdAt ? (
              <span className="mt-2 block text-[11px] font-semibold text-gray-400">
                {formatPostDate(previousPost.createdAt)}
              </span>
            ) : null}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {nextPost ? (
        <Link
          href={`/blog/${nextPost.slug}`}
          className="group flex min-h-28 items-center justify-between gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-4 text-right shadow-sm transition-colors hover:border-red-100 hover:bg-red-50/30"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
              Bài sau
            </span>
            <span className="mt-1 line-clamp-2 block text-sm font-bold leading-snug text-gray-950 group-hover:text-primary">
              {nextPost.title}
            </span>
            {nextPost.createdAt ? (
              <span className="mt-2 block text-[11px] font-semibold text-gray-400">
                {formatPostDate(nextPost.createdAt)}
              </span>
            ) : null}
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors group-hover:bg-white group-hover:text-primary">
            <ChevronRight
              aria-hidden="true"
              size={18}
            />
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  )
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

  const cleanTitle = getCleanPostTitle(post.title)
  const title = getPostSeoTitle(post.title)
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
            alt: cleanTitle || post.title,
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
  const cleanPostTitle = getCleanPostTitle(post.title)
  const internalLinkingConfig = getInternalLinkingConfig(post)
  const linkedContent = await applyInternalLinksForRender({
    html: post.content,
    currentUrl: canonicalUrl,
    scope: 'posts',
    payload,
    ...internalLinkingConfig,
  })
  const description = getPostDescription(post)
  const imageUrl = getMediaUrl(post.thumbnail)
  const postPlainText = htmlToPlainText(post.content)
  const wordCount = postPlainText.split(/\s+/u).filter(Boolean).length
  const readingMinutes = getReadingMinutes(wordCount)
  const faqItems = getPostFaqItems(post)
  const defaultAuthorResult = await payload.find({
    collection: 'blog-authors' as any,
    depth: 2,
    limit: 1,
    sort: '-updatedAt',
    where: {
      isDefault: {
        equals: true,
      },
    },
  })
  const siteFallbackAuthor: BlogPersonInfo = {
    name: 'Marais de France',
    title: 'MF Paris Editorial',
    url: '/author/mfparis/',
    avatarUrl: '/api/media/file/logo-thuong-hieu-marais-de-france-1200x1200-1-edited-e1768551529162.webp',
    bio: 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.',
  }
  const defaultAuthorInfo = getBlogAuthorProfileInfo(
    defaultAuthorResult.docs[0],
    siteFallbackAuthor,
  )
  const authorInfo = getBlogAuthorProfileInfo(
    post.authorProfile,
    defaultAuthorInfo,
  )
  const authorHref = authorInfo.url || '/author/mfparis/'
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
  const blogBreadcrumbItems = getPostBreadcrumbItems(post)
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
  const [featuredPosts, relatedPosts, blogComments, previousPosts, nextPosts] =
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
      payload.find({
        collection: 'posts',
        depth: 1,
        limit: 1,
        sort: '-createdAt',
        where: {
          and: [
            {
              slug: {
                not_equals: slug,
              },
            },
            {
              createdAt: {
                less_than: post.createdAt,
              },
            },
          ],
        },
      }),
      payload.find({
        collection: 'posts',
        depth: 1,
        limit: 1,
        sort: 'createdAt',
        where: {
          and: [
            {
              slug: {
                not_equals: slug,
              },
            },
            {
              createdAt: {
                greater_than: post.createdAt,
              },
            },
          ],
        },
      }),
    ])
  const relatedPostDocs = relatedPosts.docs.slice(0, 4)
  const previousPost = previousPosts.docs[0]
  const nextPost = nextPosts.docs[0]
  const approvedBlogComments = blogComments.docs
  const schemaGraph = buildBlogPostingSchemaGraph({
    page: {
      url: canonicalUrl,
      name: cleanPostTitle,
      description,
      type: 'WebPage',
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
    },
    article: {
      url: canonicalUrl,
      headline: cleanPostTitle,
      name: cleanPostTitle,
      description,
      image: imageUrl,
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      authorName: authorInfo.name,
      authorUrl: authorInfo.url,
      authorImage: authorInfo.avatarUrl,
      authorSameAs: authorInfo.sameAs,
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
    breadcrumb: getBlogSchemaBreadcrumbItems(
      post,
      canonicalUrl,
      blogBreadcrumbItems,
    ),
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
      <JsonLd data={schemaGraph} />
      <div className="mx-auto max-w-[1240px] px-4 py-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-10 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400"
        >
          <Link
            href="/"
            className="hover:text-black"
          >
            Trang chủ
          </Link>

          {blogBreadcrumbItems.map((item) => (
            <span
              key={item.url}
              className="contents"
            >
              <ChevronRight size={10} />

              <Link
                href={item.url}
                className="hover:text-black"
              >
                {item.name}
              </Link>
            </span>
          ))}

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
                      <Link
                        key={cat.id}
                        href={getPostCategoryUrl(cat)}
                        className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#E54D2E]"
                      >
                        {cat.title}
                      </Link>
                    ),
                  )}
                </div>

                <h1 className="mb-6 font-sans text-3xl font-bold leading-[1.12] text-gray-900 md:text-5xl">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-[12px] font-medium text-gray-400">
                  <div className="flex items-center gap-2 text-gray-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
                      <User size={16} />
                    </div>
                    <Link
                      href={authorHref}
                      className="transition-colors hover:text-[#E54D2E]"
                    >
                      {authorInfo.name}
                    </Link>
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

              <BlogMobileTocButton tocItems={tocItems} />

              <BlogRichTextContent
                content={linkedContent.html}
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
                      <Link
                        href={authorHref}
                        className="transition-colors hover:text-[#E54D2E]"
                      >
                        {authorInfo.name}
                      </Link>
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
                    <Link
                      href={authorHref}
                      className="mt-4 inline-flex w-fit items-center rounded-full border border-gray-100 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 transition hover:border-[#E54D2E] hover:text-[#E54D2E]"
                    >
                      Xem hồ sơ tác giả
                    </Link>
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
                      <Link
                        key={tag.id}
                        href={getPostCategoryUrl(tag)}
                        className="cursor-pointer rounded-full bg-gray-50 px-4 py-1.5 text-[11px] font-bold lowercase text-gray-500 transition-colors hover:bg-gray-100"
                      >
                        #{tag.title}
                      </Link>
                    ),
                  )}
                </div>

                <BlogShareButtons
                  title={post.title}
                  url={`${getSiteUrl().replace(/\/$/, '')}${canonicalUrl}`}
                />
              </div>
            </article>

            <BlogPostPager
              previousPost={previousPost}
              nextPost={nextPost}
            />

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

            <div className="hidden space-y-10 lg:sticky lg:top-[190px] lg:block">
              {tocItems.length > 0 && (
                <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm">
                  <div className="mb-2 flex items-center gap-3 text-[13px] font-black uppercase tracking-[0.2em] text-gray-900">
                    <span className="h-5 w-1 bg-primary"></span>
                    Mục lục
                  </div>

                  <BlogTocNav tocItems={tocItems} />
                </div>
              )}
            </div>
          </aside>
        </div>

        {relatedPostDocs.length > 0 && (
          <div className="mt-12">
            <RelatedPostsCarousel
              posts={relatedPostDocs}
            />
          </div>
        )}
      </div>
    </div>
  )
}
