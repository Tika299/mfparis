'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { MessageCircle, Reply, Send, X } from 'lucide-react'

type CommentRelation =
  | string
  | number
  | { id?: string | number | null }
  | null
  | undefined

type BlogComment = {
  id: string | number
  parent?: CommentRelation
  name?: string | null
  comment?: string | null
  createdAt?: string | null
}

type BlogCommentNode = BlogComment & {
  replies: BlogCommentNode[]
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
  replyPlaceholder: 'Nh\u1eadp ph\u1ea3n h\u1ed3i c\u1ee7a b\u1ea1n...',
  namePlaceholder: 'T\u00ean c\u1ee7a b\u1ea1n',
  emailPlaceholder: 'Email c\u1ee7a b\u1ea1n',
  success:
    'C\u1ea3m \u01a1n b\u1ea1n. B\u00ecnh lu\u1eadn \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi v\u00e0 \u0111ang ch\u1edd MF Paris duy\u1ec7t.',
  replySuccess:
    'C\u1ea3m \u01a1n b\u1ea1n. Ph\u1ea3n h\u1ed3i \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi v\u00e0 \u0111ang ch\u1edd MF Paris duy\u1ec7t.',
  fallbackError: 'Ch\u01b0a th\u1ec3 g\u1eedi b\u00ecnh lu\u1eadn, vui l\u00f2ng th\u1eed l\u1ea1i.',
  submitting: '\u0110ang g\u1eedi...',
  submit: 'G\u1eedi b\u00ecnh lu\u1eadn',
  submitReply: 'G\u1eedi tr\u1ea3 l\u1eddi',
  reply: 'Tr\u1ea3 l\u1eddi',
  cancelReply: 'H\u1ee7y',
  replyTo: 'Tr\u1ea3 l\u1eddi',
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

function getRelationId(value: CommentRelation): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'id' in value
  ) {
    return value.id == null ? null : String(value.id)
  }

  return value == null ? null : String(value)
}

function getFormText(
  formData: FormData,
  fieldName: string,
): string {
  const value = formData.get(fieldName)

  return typeof value === 'string' ? value : ''
}

function getTime(value?: string | null) {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()

  return Number.isFinite(time) ? time : 0
}

export function BlogComments({
  postId,
  comments,
}: BlogCommentsProps) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingTarget, setSubmittingTarget] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { visibleCount, visibleComments } = useMemo(() => {
    const approvedComments = comments
      .filter(
        (item) =>
          typeof item.comment === 'string' &&
          item.comment.trim().length > 0,
      )
      .slice()
      .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt))

    const nodes: BlogCommentNode[] = approvedComments.map((item) => ({
      ...item,
      replies: [],
    }))
    const nodeById = new Map(
      nodes.map((item) => [String(item.id), item]),
    )
    const roots: BlogCommentNode[] = []

    for (const item of nodes) {
      const parentId = getRelationId(item.parent)
      const parent = parentId ? nodeById.get(parentId) : undefined

      if (parent && parentId !== String(item.id)) {
        parent.replies.push(item)
      } else {
        roots.push(item)
      }
    }

    return {
      visibleComments: roots,
      visibleCount: approvedComments.length,
    }
  }, [comments])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    parentId?: string | number,
  ) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const target = parentId == null ? 'root' : String(parentId)

    setIsSubmitting(true)
    setSubmittingTarget(target)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/blog-comments', {
        body: JSON.stringify({
          postId,
          parentId,
          name: getFormText(formData, 'name'),
          email: getFormText(formData, 'email'),
          comment: getFormText(formData, 'comment'),
          company: getFormText(formData, 'company'),
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

      form.reset()
      setReplyingToId(null)
      setMessage(parentId == null ? TEXT.success : TEXT.replySuccess)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : TEXT.fallbackError,
      )
    } finally {
      setIsSubmitting(false)
      setSubmittingTarget(null)
    }
  }

  function renderComment(item: BlogCommentNode, level = 0) {
    const itemId = String(item.id)
    const authorName = item.name || TEXT.fallbackName
    const isReplying = replyingToId === itemId
    const isReplySubmitting = isSubmitting && submittingTarget === itemId

    return (
      <li
        className={
          level > 0
            ? 'border-l border-[#F2D8CE] pl-4 sm:pl-5'
            : undefined
        }
        key={item.id}
      >
        <article className="rounded-3xl border border-gray-100 bg-[#FDFBF9] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="font-bold text-gray-950"
              id={`blog-comment-${itemId}`}
            >
              {authorName}
            </h3>
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

          <button
            aria-expanded={isReplying}
            aria-controls={`blog-comment-reply-${itemId}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 transition hover:border-[#E54D2E] hover:text-[#E54D2E]"
            onClick={() => setReplyingToId(isReplying ? null : itemId)}
            type="button"
          >
            <Reply size={14} />
            {TEXT.reply}
          </button>

          {isReplying ? (
            <form
              className="mt-5 grid gap-3 rounded-3xl border border-[#F2D8CE] bg-white p-4"
              id={`blog-comment-reply-${itemId}`}
              onSubmit={(event) => handleSubmit(event, item.id)}
            >
              <input
                autoComplete="off"
                className="hidden"
                name="company"
                tabIndex={-1}
              />
              <p className="text-xs font-bold text-gray-500">
                {TEXT.replyTo} {authorName}
              </p>
              <textarea
                className="min-h-24 rounded-2xl border border-gray-100 bg-[#FDFBF9] p-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
                maxLength={2000}
                name="comment"
                placeholder={TEXT.replyPlaceholder}
                required
                rows={4}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
                  maxLength={120}
                  name="name"
                  placeholder={TEXT.namePlaceholder}
                  required
                />
                <input
                  className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
                  name="email"
                  placeholder={TEXT.emailPlaceholder}
                  required
                  type="email"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E54D2E] px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#C83C21] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <Send size={15} />
                  {isReplySubmitting ? TEXT.submitting : TEXT.submitReply}
                </button>
                <button
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-100 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-gray-500 transition hover:border-gray-200 hover:text-gray-900"
                  onClick={() => setReplyingToId(null)}
                  type="button"
                >
                  <X size={15} />
                  {TEXT.cancelReply}
                </button>
              </div>
            </form>
          ) : null}
        </article>

        {item.replies.length > 0 ? (
          <ol
            aria-label={`Ph\u1ea3n h\u1ed3i cho ${authorName}`}
            className="mt-4 space-y-4"
          >
            {item.replies.map((reply) => renderComment(reply, level + 1))}
          </ol>
        ) : null}
      </li>
    )
  }

  const isRootSubmitting = isSubmitting && submittingTarget === 'root'

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
          {visibleCount} {TEXT.countLabel}
        </div>
      </div>

      <div className="mt-7 space-y-4">
        {visibleComments.length > 0 ? (
          <ol className="space-y-4">
            {visibleComments.map((item) => renderComment(item))}
          </ol>
        ) : (
          <p className="rounded-3xl border border-dashed border-gray-200 bg-[#FDFBF9] p-5 text-sm leading-7 text-gray-500">
            {TEXT.empty}
          </p>
        )}
      </div>

      {message ? (
        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        <input
          autoComplete="off"
          className="hidden"
          name="company"
          tabIndex={-1}
        />
        <textarea
          className="min-h-32 rounded-2xl border border-gray-100 bg-[#FDFBF9] p-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
          maxLength={2000}
          name="comment"
          placeholder={TEXT.commentPlaceholder}
          required
          rows={5}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
            maxLength={120}
            name="name"
            placeholder={TEXT.namePlaceholder}
            required
          />
          <input
            className="h-12 rounded-2xl border border-gray-100 bg-[#FDFBF9] px-4 text-sm outline-none transition focus:border-[#E54D2E] focus:bg-white"
            name="email"
            placeholder={TEXT.emailPlaceholder}
            required
            type="email"
          />
        </div>

        <button
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E54D2E] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#C83C21] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          <Send size={16} />
          {isRootSubmitting ? TEXT.submitting : TEXT.submit}
        </button>
      </form>
    </section>
  )
}
