import type { Metadata } from 'next'
import type { Where } from 'payload'

import configPromise from '@payload-config'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { JsonLd } from '@/components/JsonLd'
import { OptimizedImage } from '@/components/OptimizedImage'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'
import { buildCollectionPageSchemaGraph } from '@/lib/structured-data'
import { htmlToPlainText, normalizeContentHtml } from '@/lib/html/contentHtml'
import '@/styles/blog.css'
import { applyInternalLinksForRender } from '@/lib/internal-links/applyInternalLinks'
import { getInternalLinkingConfig } from '@/lib/internal-links/getInternalLinkingConfig'

const POSTS_PER_PAGE = 9

type PageProps = {
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<{
    page?: string
  }>
}

type RelationshipValue =
  | string
  | number
  | {
    id?: string | number | null
  }
  | null
  | undefined

type PostCategoryTreeItem = {
  id: string | number
  title?: string | null
  slug?: string | null
  parent?: RelationshipValue
}

type LandingFaqItem = {
  question?: string | null
  answer?: string | null
}

function getRelationshipID(value: RelationshipValue): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (value && typeof value === 'object') {
    const id = value.id

    if (typeof id === 'string' || typeof id === 'number') {
      return String(id)
    }
  }

  return null
}

function normalizePage(value?: string): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function formatDate(date?: string) {
  if (!date) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

function getCategoryDisplayName(category: any): string {
  return (
    category?.h1Override ||
    category?.displayName ||
    category?.title ||
    'Danh mục blog'
  )
}

function getCategoryDescription(category: any): string {
  const description = htmlToPlainText(category?.description)

  if (description) {
    return description.length > 160
      ? `${description.slice(0, 157).trim()}...`
      : description
  }

  return `Các bài viết thuộc chủ đề ${getCategoryDisplayName(category)} tại MF Paris.`
}

function getLandingFaqItems(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item: LandingFaqItem) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
}

function isNoindexCategory(category: any, page: number, totalDocs?: number): boolean {
  const seoIndex = String(category?.seoIndex || 'index')

  if (
    [
      'noindex',
      'noindex-temporary',
      'noindex-after-move',
      'removed',
    ].includes(seoIndex)
  ) {
    return true
  }

  if (page > 1) {
    return true
  }

  if (category?.noindexWhenEmpty && totalDocs === 0) {
    return true
  }

  return false
}

function getPostCategoryScopeIDs(
  rootCategoryID: string | number,
  categories: PostCategoryTreeItem[],
) {
  const rootID = String(rootCategoryID)
  const childrenByParentID = new Map<string, string[]>()

  for (const category of categories) {
    const parentID = getRelationshipID(category.parent)

    if (!parentID) {
      continue
    }

    const children = childrenByParentID.get(parentID) ?? []
    children.push(String(category.id))
    childrenByParentID.set(parentID, children)
  }

  const result = new Set<string>([rootID])
  const queue = [...(childrenByParentID.get(rootID) ?? [])]

  while (queue.length > 0) {
    const categoryID = queue.shift()

    if (!categoryID || result.has(categoryID)) {
      continue
    }

    result.add(categoryID)
    queue.push(...(childrenByParentID.get(categoryID) ?? []))
  }

  return Array.from(result)
}

function buildCategoryContainsWhere(categoryIDs: string[]): Where {
  if (categoryIDs.length <= 1) {
    return {
      categories: {
        contains: categoryIDs[0] ?? '',
      },
    }
  }

  return {
    or: categoryIDs.map((categoryID) => ({
      categories: {
        contains: categoryID,
      },
    })),
  }
}

function buildBlogCategoryBreadcrumb(
  currentCategory: any,
  categories: PostCategoryTreeItem[],
) {
  const byID = new Map<string, PostCategoryTreeItem>()

  for (const category of categories) {
    byID.set(String(category.id), category)
  }

  const chain: PostCategoryTreeItem[] = []
  let parentID = getRelationshipID(currentCategory.parent)
  const visited = new Set<string>()

  while (parentID) {
    if (visited.has(parentID)) {
      break
    }

    visited.add(parentID)
    const parent = byID.get(parentID)

    if (!parent) {
      break
    }

    chain.unshift(parent)
    parentID = getRelationshipID(parent.parent)
  }

  return [
    {
      name: 'Trang chủ',
      url: '/',
    },
    {
      name: 'Blog',
      url: '/blog',
    },
    ...chain
      .filter((category) => category.title && category.slug)
      .map((category) => ({
        name: String(category.title),
        url: `/blog/category/${category.slug}`,
      })),
    {
      name: getCategoryDisplayName(currentCategory),
      url: `/blog/category/${currentCategory.slug}`,
    },
  ]
}

async function getPostCategoryBySlug(slug: string) {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'post-categories',
    depth: 2,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] ?? null
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const currentPage = normalizePage((await searchParams)?.page)
  const category = await getPostCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Danh mục blog không tồn tại | MF Paris',
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const title = `${getCategoryDisplayName(category)} | Blog MF Paris`
  const description = getCategoryDescription(category)
  const canonical = `/blog/category/${encodeURIComponent(slug)}`
  const shouldNoindex = isNoindexCategory(category, currentPage)

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: !shouldNoindex,
      follow: true,
      googleBot: {
        index: !shouldNoindex,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MF Paris',
      title,
      description,
      url: canonical,
    },
  }
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params
  const currentPage = normalizePage((await searchParams)?.page)
  const payload = await getPayload({ config: configPromise })

  const categoryRes = await payload.find({
    collection: 'post-categories',
    depth: 2,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const currentCategory = categoryRes.docs[0]

  if (!currentCategory) {
    notFound()
  }

  const allCategoriesRes = await payload.find({
    collection: 'post-categories',
    depth: 1,
    limit: 500,
    pagination: false,
    overrideAccess: true,
    select: {
      id: true,
      title: true,
      slug: true,
      parent: true,
    },
  })

  const categoryScopeIDs = getPostCategoryScopeIDs(
    currentCategory.id,
    allCategoriesRes.docs as PostCategoryTreeItem[],
  )

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: POSTS_PER_PAGE,
    page: currentPage,
    sort: '-createdAt',
    overrideAccess: true,
    where: buildCategoryContainsWhere(categoryScopeIDs),
  })

  if (currentPage > 1 && posts.docs.length === 0) {
    notFound()
  }

  const totalPages = posts.totalPages || 1
  const categoryUrl = `/blog/category/${encodeURIComponent(slug)}`
  const displayName = getCategoryDisplayName(currentCategory)
  const introHtml = normalizeContentHtml(currentCategory.introHtml)
  const bottomContentHtml = normalizeContentHtml(currentCategory.bottomContentHtml)
  const internalLinkingConfig = getInternalLinkingConfig(currentCategory)

  const linkedCategoryDescription = await applyInternalLinksForRender({
    html: currentCategory.description,
    currentUrl: categoryUrl,
    scope: 'categories',
    payload,
    ...internalLinkingConfig,
  })

  const linkedBottomContent = await applyInternalLinksForRender({
    html: bottomContentHtml,
    currentUrl: categoryUrl,
    scope: 'categories',
    payload,
    ...internalLinkingConfig,
  })

  const linkedIntroContent = await applyInternalLinksForRender({
    html: introHtml,
    currentUrl: categoryUrl,
    scope: 'categories',
    payload,
    ...internalLinkingConfig,
  })
  const faqItems = getLandingFaqItems(currentCategory.faq)
  const breadcrumb = buildBlogCategoryBreadcrumb(
    currentCategory,
    allCategoriesRes.docs as PostCategoryTreeItem[],
  )

  const getPageHref = (page: number) => {
    if (page <= 1) {
      return categoryUrl
    }

    return `${categoryUrl}?page=${page}`
  }

  const schemaGraph = buildCollectionPageSchemaGraph({
    page: {
      url: categoryUrl,
      name: displayName,
      description: getCategoryDescription(currentCategory),
      breadcrumb,
      faq: faqItems.length > 0
        ? {
          questions: faqItems,
        }
        : undefined,
      items: posts.docs.map((post: any) => ({
        name: post.title,
        url: `/blog/${post.slug}`,
      })),
    },
  })

  return (
    <main className="blog-page-bg min-h-screen">
      <JsonLd data={schemaGraph} />

      <section className="container-ux pt-10 pb-16 md:pt-14 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
          {breadcrumb.map((item, index) => (
            <span
              key={item.url}
              className="contents"
            >
              {index > 0 ? <ChevronRight size={12} /> : null}
              <Link
                href={item.url}
                className="transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            </span>
          ))}
        </nav>

        <header className="relative overflow-hidden rounded-[2rem] border border-red-100/70 bg-white px-5 py-12 text-center shadow-sm md:rounded-[2.5rem] md:px-10 md:py-16">
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              <Sparkles size={13} />
              Blog category
            </div>

            <h1 className="font-heading text-4xl font-bold tracking-tight text-black md:text-6xl">
              {displayName}
            </h1>

            <div className="mx-auto mt-5 h-0.5 w-20 bg-primary" />

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-gray-500 md:text-base">
              {getCategoryDescription(currentCategory)}
            </p>
          </div>
        </header>

        {introHtml ? (
          <section className="mt-8 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
              <SafeHtmlContent html={linkedIntroContent.html} />
            </div>
          </section>
        ) : null}

        <section className="mt-10 md:mt-14">
          {posts.docs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-7">
              {posts.docs.map((post: any) => {
                const createdAt = formatDate(post.createdAt)

                return (
                  <Link
                    href={`/blog/${post.slug}`}
                    key={post.id}
                    className="blog-card group block overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl hover:shadow-red-50/70"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#f4f0ed]">
                      {post.thumbnail ? (
                        <OptimizedImage
                          media={post.thumbnail}
                          alt={post.title}
                          size="blogCard"
                          className="h-full w-full"
                          imageClassName="object-contain object-center transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#f8f1ef] px-6 text-center">
                          <span className="font-heading text-2xl font-bold text-primary/80">
                            MF Paris
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 md:p-6">
                      <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                        <span>MF Journal</span>
                        {createdAt ? <span>{createdAt}</span> : null}
                      </div>

                      <h2 className="font-sans text-[22px] font-bold leading-tight text-black transition-colors duration-300 line-clamp-2 group-hover:text-primary">
                        {post.title}
                      </h2>

                      {post.excerpt ? (
                        <p className="mt-3 text-sm leading-6 text-gray-500 line-clamp-3">
                          {post.excerpt}
                        </p>
                      ) : null}

                      <div className="mt-5 inline-flex items-center text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                        Đọc bài viết
                        <ChevronRight
                          size={15}
                          className="ml-1 transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-gray-100 bg-white p-12 text-center shadow-sm">
              <p className="font-heading text-2xl font-bold text-black">
                Chưa có bài viết nào.
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Các bài viết mới sẽ được cập nhật trong thời gian tới.
              </p>
            </div>
          )}
        </section>

        {totalPages > 1 ? (
          <nav className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={getPageHref(currentPage - 1)}
                className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white"
              >
                <ChevronLeft size={14} />
                Trước
              </Link>
            ) : null}

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Link
                key={page}
                href={getPageHref(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={
                  page === currentPage
                    ? 'flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-black text-white shadow-lg shadow-red-100'
                    : 'flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 transition-all hover:bg-black hover:text-white'
                }
              >
                {page}
              </Link>
            ))}

            {currentPage < totalPages ? (
              <Link
                href={getPageHref(currentPage + 1)}
                className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition-all hover:border-black hover:bg-black hover:text-white"
              >
                Sau
                <ChevronRight size={14} />
              </Link>
            ) : null}
          </nav>
        ) : null}

        {bottomContentHtml ? (
          <section className="mt-12 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <div className="prose prose-sm max-w-none text-gray-700 prose-a:font-semibold prose-a:text-primary md:prose-base">
              <SafeHtmlContent html={linkedBottomContent.html} />
            </div>
          </section>
        ) : null}

        {faqItems.length > 0 ? (
          <section className="mt-12 rounded-[2rem] border border-orange-100 bg-orange-50/40 p-6 md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
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
      </section>
    </main>
  )
}
