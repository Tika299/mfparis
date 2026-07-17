'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  Star,
  UserRound,
} from 'lucide-react'

type BlogPostEngagementProps = Readonly<{
  postId: number | string
  authorName: string
  authorTitle?: string | null
  reviewerName?: string | null
  reviewerTitle?: string | null
  reviewedAt?: string | null
  initialViewCount?: number | null
  initialRatingAverage?: number | null
  initialRatingCount?: number | null
}>

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(5, Math.max(0.1, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatRating(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)
}

function getPointerRating(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement,
) {
  const rect = element.getBoundingClientRect()
  const x = Math.min(
    Math.max(event.clientX - rect.left, 0),
    rect.width,
  )
  const rawRating = (x / rect.width) * 5

  return clampRating(Math.round(rawRating * 10) / 10)
}

export function BlogPostEngagement({
  postId,
  authorName,
  authorTitle,
  reviewerName,
  reviewerTitle,
  reviewedAt,
  initialViewCount = 0,
  initialRatingAverage = 0,
  initialRatingCount = 0,
}: BlogPostEngagementProps) {
  const [viewCount, setViewCount] = useState(
    Number(initialViewCount) || 0,
  )
  const [ratingAverage, setRatingAverage] = useState(
    Number(initialRatingAverage) || 0,
  )
  const [ratingCount, setRatingCount] = useState(
    Number(initialRatingCount) || 0,
  )
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const starRailRef = useRef<HTMLDivElement>(null)

  const storageKey = useMemo(
    () => 'mfparis-blog-rating:' + postId,
    [postId],
  )
  const viewStorageKey = useMemo(
    () => 'mfparis-blog-view:' + postId,
    [postId],
  )
  const displayRating = hoverRating ?? selectedRating ?? ratingAverage

  useEffect(() => {
    const storedRating = window.localStorage.getItem(storageKey)

    if (storedRating) {
      const parsedRating = Number(storedRating)

      if (Number.isFinite(parsedRating)) {
        setSelectedRating(parsedRating)
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (window.sessionStorage.getItem(viewStorageKey)) {
      return
    }

    window.sessionStorage.setItem(viewStorageKey, '1')

    fetch('/api/blog-views', {
      body: JSON.stringify({ postId }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.viewCount === 'number') {
          setViewCount(data.viewCount)
        }
      })
      .catch(() => undefined)
  }, [postId, viewStorageKey])

  async function submitRating(rating: number) {
    const nextRating = clampRating(rating)

    setSelectedRating(nextRating)
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/blog-ratings', {
        body: JSON.stringify({
          postId,
          rating: nextRating,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Cannot submit rating')
      }

      const data = await response.json()

      if (typeof data.average === 'number') {
        setRatingAverage(data.average)
      }

      if (typeof data.count === 'number') {
        setRatingCount(data.count)
      }

      window.localStorage.setItem(storageKey, String(nextRating))
      setMessage('Cảm ơn bạn đã đánh giá bài viết.')
    } catch {
      setMessage('Chưa thể gửi đánh giá, vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!starRailRef.current) {
      return
    }

    setHoverRating(getPointerRating(event, starRailRef.current))
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!starRailRef.current) {
      return
    }

    void submitRating(getPointerRating(event, starRailRef.current))
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    const currentRating =
      (selectedRating ?? hoverRating ?? ratingAverage) || 5

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedRating(clampRating(currentRating - 0.1))
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedRating(clampRating(currentRating + 0.1))
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void submitRating(clampRating(selectedRating ?? currentRating))
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-gray-100 bg-[#fffaf7] p-4 shadow-sm md:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr] xl:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#E54D2E] shadow-sm">
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              Tác giả
            </p>
            <p className="mt-1 truncate text-sm font-bold text-gray-950">
              {authorName}
            </p>
            {authorTitle ? (
              <p className="mt-0.5 text-xs text-gray-500">
                {authorTitle}
              </p>
            ) : null}
          </div>
        </div>

        {reviewerName ? (
          <div className="flex min-w-0 gap-3 items-center">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                Đã kiểm duyệt
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-3 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Eye size={16} />
              <span>{formatNumber(viewCount)} lượt xem</span>
            </div>

            <div className="text-xs font-bold text-gray-950">
              {ratingCount > 0
                ? formatRating(ratingAverage) + '/5'
                : 'Chưa có đánh giá'}
            </div>
          </div>

          <div
            ref={starRailRef}
            aria-label="Đánh giá bài viết"
            aria-valuemax={5}
            aria-valuemin={0.1}
            aria-valuenow={Number(displayRating.toFixed(1))}
            className="flex w-fit cursor-pointer touch-none items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-[#E54D2E] focus-visible:ring-offset-2"
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerLeave={() => setHoverRating(null)}
            onPointerMove={handlePointerMove}
            role="slider"
            tabIndex={0}
          >
            {[1, 2, 3, 4, 5].map((starIndex) => {
              const fill = Math.max(
                0,
                Math.min(1, displayRating - (starIndex - 1)),
              )

              return (
                <span
                  aria-hidden="true"
                  className="relative block h-7 w-7 text-gray-200"
                  key={starIndex}
                >
                  <Star
                    className="absolute inset-0"
                    fill="currentColor"
                    size={28}
                    strokeWidth={1.5}
                  />
                  <span
                    className="absolute inset-0 overflow-hidden text-yellow-400"
                    style={{
                      width: String(fill * 100) + '%',
                    }}
                  >
                    <Star
                      fill="currentColor"
                      size={28}
                      strokeWidth={1.5}
                    />
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
