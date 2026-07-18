'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'

type BlogComment = {
  id: string | number
  name?: string | null
  comment?: string | null
  createdAt?: string | null
}

type BlogCommentsProps = Readonly<{
  postId: string | number
  comments: BlogComment[]
}>

const TEXT = {
  heading: 'B\u00ecnh lu\u1eadn cu\u1ed1i b\u00e0i',
  description:
    'Chia s\u1ebb c\u00e2u h\u1ecfi ho\u1eb7c tr\u1ea3i nghi\u1ec7m c\u1ee7a b\u1ea1n. B\u00ecnh lu\u1eadn s\u1ebd \u0111\u01b0\u1ee3c ki\u1ec3m duy\u1ec7t tr\u01b0\u1edbc khi hi\u1ec3n th\u1ecb c\u00f4ng khai.',
  countLabel: 'b\u00ecnh lu\u1eadn',
  fallbackName: 'B\u1ea1n \u0111\u1ecdc MF Paris',
  empty:
    'Ch\u01b0a c\u00f3 b\u00ecnh lu\u1eadn n\u00e0o \u0111\u01b0\u1ee3c duy\u1ec7t. B\u1ea1n c\u00f3 th\u1ec3 l\u00e0 ng\u01b0\u1eddi m\u1edf \u0111\u1ea7u cu\u1ed9c tr\u00f2 chuy\u1ec7n n\u00e0y.',
  commentPlaceholder: 'Nh\u1eadp b\u00ecnh lu\u1eadn c\u1ee7a b\u1ea1n...',
  namePlaceholder: 'T\u00ean c\u1ee7a b\u1ea1n',
  emailPlaceholder: 'Email c\u1ee7a b\u1ea1n',
  success:
    'C\u1ea3m \u01a1n b\u1ea1n. B\u00ecnh lu\u1eadn \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi v\u00e0 \u0111ang ch\u1edd MF Paris duy\u1ec7t.',
  fallbackError: 'Ch\u01b0a th\u1ec3 g\u1eedi b\u00ecnh lu\u1eadn, vui l\u00f2ng th\u1eed l\u1ea1i.',
  submitting: '\u0110ang g\u1eedi...',
  submit: 'G\u1eedi b\u00ecnh lu\u1eadn',
}

function formatDate(value?: string | null) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function BlogComments({
  postId,
  comments,
}: BlogCommentsProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [company, setCompany] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleComments = useMemo(
    () =>
      comments.filter(
        (item) =>
          typeof item.comment === 'string' &&
          item.comment.trim().length > 0,
      ),
    [comments],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/blog-comments', {
        body: JSON.stringify({
          postId,
          name,
          email,
          comment,
          company,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || TEXT.fallbackError)
      }

      setName('')
      setEmail('')
      setComment('')
      setCompany('')
      setMessage(TEXT.success)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : TEXT.fallbackError,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="blog-comments-heading"
      className="mt-12 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#E54D2E]">
            Discussion
          </p>
          <h2
            className="mt-2 text-2xl font-black tracking-tight text-gray-950"
            id="blog-comments-heading"
          >
            {TEXT.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            {TEXT.description}
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#FFF3EE] px-4 py-2 text-xs font-bold text-[#C83C21]">
          <MessageCircle size={16} />
          {visibleComments.length} {TEXT.countLabel}
        </div>
      </div>

      <div className="mt-7 space-y-4">
        {visibleComments.length > 0 ? (
          <ul className="space-y-4">
            {visibleComments.map((item) => (
              <li
                className="rounded-3xl border border-gray-100 bg-[#FDFBF9] p-5"
                key={item.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-950">
                    {item.name || TEXT.fallbackName}
                  </p>
                  {item.createdAt ? (
                    <time
                      className="text-xs font-semibold text-gray-400"
                      dateTime={item.createdAt}
                    >
                      {formatDate(item.createdAt)}
                    </time>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                  {item.comment}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed border-gray-200 bg-[#FDFBF9] p-5 text-sm leading-7 text-gray-500">
            {TEXT.empty}
          </p>
        )}
      </div>

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        <input
          autoComplete="off"
          className="hidden"
          name="company"
          onChange={(event) => setCompany(event.target.value)}
          tabIndex={-1}
          value={company}
        />
        <textarea
          className="min-h-32 rounded-2xl border border-gray-100 bg-[#FDFBF9] p-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
          maxLength={2000}
          name="comment"
          onChange={(event) => setComment(event.target.value)}
          placeholder={TEXT.commentPlaceholder}
          required
          rows={5}
          value={comment}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder={TEXT.namePlaceholder}
            required
            value={name}
          />
          <input
            className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={TEXT.emailPlaceholder}
            required
            type="email"
            value={email}
          />
        </div>

        {message ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E54D2E] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#C83C21] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          <Send size={16} />
          {isSubmitting ? TEXT.submitting : TEXT.submit}
        </button>
      </form>
    </section>
  )
}
