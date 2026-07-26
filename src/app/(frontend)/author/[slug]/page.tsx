import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Mail, PenLine, Sparkles, UserRound } from 'lucide-react'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { JsonLd } from '@/components/JsonLd'
import { OptimizedImage } from '@/components/OptimizedImage'

type AuthorPageProps = {
  params: Promise<{
    slug: string
  }>
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://mfparis.vn'
  ).replace(/\/$/, '')
}

function getMediaUrl(media: unknown): string | undefined {
  if (!media || typeof media !== 'object') return undefined
  const record = media as { url?: string | null }

  if (!record.url) return undefined

  try {
    return new URL(record.url, getSiteUrl()).toString()
  } catch {
    return undefined
  }
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function compact(value: unknown, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim()
}

async function getAuthor(slug: string) {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'blog-authors' as any,
    depth: 1,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
}

async function getAuthorPosts(author: any) {
  const payload = await getPayload({ config: configPromise })
  const where = {
    authorProfile: {
      equals: author.id,
    },
  }

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    overrideAccess: true,
    sort: '-createdAt',
    where,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      thumbnail: true,
      categories: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return posts
}

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params
  const author = await getAuthor(slug)

  if (!author) {
    return {
      title: 'Tác giả không tồn tại | MF Paris',
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const title = compact(author.name, 'Tác giả MF Paris')
  const description =
    compact(author.bio) ||
    title + ' chia sẻ kiến thức nước hoa, mỹ phẩm và chăm sóc sắc đẹp tại MF Paris.'
  const canonical = '/author/' + encodeURIComponent(slug) + '/'
  const avatarUrl = getMediaUrl(author.avatar)

  return {
    title: title + ' | Tác giả MF Paris',
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'profile',
      locale: 'vi_VN',
      url: canonical,
      siteName: 'MF Paris',
      title: title + ' | Tác giả MF Paris',
      description,
      images: avatarUrl
        ? [
            {
              url: avatarUrl,
              alt: title,
            },
          ]
        : undefined,
    },
  }
}

export default async function AuthorPage({
  params,
}: AuthorPageProps) {
  const { slug } = await params
  const author = await getAuthor(slug)

  if (!author) {
    notFound()
  }

  const posts = await getAuthorPosts(author)
  const authorName = compact(author.name, 'MF Paris Editorial')
  const authorTitle = compact(author.title, 'MF Paris Editorial')
  const authorBio =
    compact(author.bio) ||
    'Đội ngũ biên tập MF Paris chia sẻ kiến thức nước hoa, mỹ phẩm và chăm sóc sắc đẹp theo tinh thần dễ hiểu, có chọn lọc và hữu ích cho người đọc.'
  const authorUrl = '/author/' + encodeURIComponent(slug) + '/'
  const sameAs = Array.isArray(author.sameAs)
    ? author.sameAs
        .map((item: any) => compact(item?.url))
        .filter(Boolean)
    : []
  const avatarUrl = getMediaUrl(author.avatar)
  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': getSiteUrl() + authorUrl + '#profile',
        url: getSiteUrl() + authorUrl,
        name: authorName + ' | MF Paris',
        inLanguage: 'vi-VN',
        mainEntity: {
          '@id': getSiteUrl() + authorUrl + '#person',
        },
      },
      {
        '@type': 'Person',
        '@id': getSiteUrl() + authorUrl + '#person',
        name: authorName,
        jobTitle: authorTitle,
        description: authorBio,
        url: getSiteUrl() + authorUrl,
        image: avatarUrl,
        sameAs: sameAs.length ? sameAs : undefined,
        worksFor: {
          '@type': 'Organization',
          name: 'MF Paris',
          url: getSiteUrl(),
        },
      },
      {
        '@type': 'ItemList',
        '@id': getSiteUrl() + authorUrl + '#articles',
        name: 'Bài viết của ' + authorName,
        itemListElement: posts.docs.map((post: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: post.title,
          url: getSiteUrl() + '/blog/' + post.slug,
        })),
      },
    ],
  }

  return (
    <main className="min-h-screen bg-[#FDFBF9] pb-20 font-sans">
      <JsonLd data={schemaGraph} />

      <div className="border-b border-gray-100 bg-white">
        <nav className="container-ux flex h-12 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <Link href="/" className="transition-colors hover:text-black">
            Trang chủ
          </Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="transition-colors hover:text-black">
            Blog
          </Link>
          <ChevronRight size={12} />
          <span className="max-w-[220px] truncate text-black">{authorName}</span>
        </nav>
      </div>

      <section className="container-ux pt-10 md:pt-14">
        <header className="relative overflow-hidden rounded-[2rem] border border-red-100/70 bg-white shadow-sm md:rounded-[2.5rem]">
          <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,#fff3ee_0%,#fff_55%,#ffe8e1_100%)]" />

          <div className="relative grid gap-8 px-5 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:px-10 md:py-12 lg:px-14">
            <div className="flex justify-center md:justify-start">
              <div className="relative h-40 w-40 overflow-hidden rounded-full border-8 border-white bg-[#f4f0ed] shadow-xl md:h-48 md:w-48">
                {author.avatar ? (
                  <OptimizedImage
                    media={author.avatar}
                    alt={authorName}
                    size="card"
                    priority
                    sizes="192px"
                    imageClassName="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary">
                    <UserRound size={64} strokeWidth={1.5} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center text-center md:text-left">
              <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary md:mx-0">
                <PenLine size={13} />
                MF Paris Author
              </div>

              <h1 className="font-sans text-3xl font-black leading-tight text-gray-950 md:text-5xl">
                {authorName}
              </h1>

              <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-primary">
                {authorTitle}
              </p>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-gray-500 md:text-base">
                {authorBio}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff7f3] px-4 py-2 text-xs font-bold text-gray-700">
                  <Sparkles size={14} className="text-primary" />
                  {posts.totalDocs.toLocaleString('vi-VN')} bài viết
                </span>

                {sameAs.slice(0, 3).map((url: string) => (
                  <Link
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full border border-gray-100 bg-white px-4 py-2 text-xs font-bold text-gray-500 transition hover:border-primary hover:text-primary"
                  >
                    Hồ sơ
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10 md:mt-14">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                Beauty Journal
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Bài viết của {authorName}
              </h2>
            </div>

            <Link
              href="/blog"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 transition hover:border-black hover:bg-black hover:text-white"
            >
              Xem tất cả blog
              <ChevronRight size={14} />
            </Link>
          </div>

          {posts.docs.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-7">
              {posts.docs.map((post: any) => (
                <Link
                  href={'/blog/' + post.slug}
                  key={post.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl hover:shadow-red-50/70"
                >
                  <div className="relative aspect-video overflow-hidden bg-[#f4f0ed]">
                    {post.thumbnail ? (
                      <OptimizedImage
                        media={post.thumbnail}
                        alt={post.title}
                        size="blogCard"
                        className="h-full w-full"
                        imageClassName="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#fff3ee] text-primary">
                        <PenLine size={38} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      <span>MF Journal</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>

                    <h3 className="line-clamp-2 text-[20px] font-bold leading-tight text-black transition-colors group-hover:text-primary">
                      {post.title}
                    </h3>

                    {post.excerpt ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                        {post.excerpt}
                      </p>
                    ) : null}

                    <span className="mt-5 inline-flex items-center text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                      Đọc bài viết
                      <ChevronRight size={15} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-primary">
                <Mail size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-gray-950">
                Chưa có bài viết công khai
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
                Các bài viết của tác giả này sẽ được hiển thị tại đây sau khi được xuất bản.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
