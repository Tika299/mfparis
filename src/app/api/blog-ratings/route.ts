import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

function normalizePostId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function normalizeRating(value: unknown): number | null {
  const rating = Number(value)

  if (!Number.isFinite(rating)) {
    return null
  }

  return Math.min(5, Math.max(0.1, Math.round(rating * 10) / 10))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const postId = normalizePostId(body?.postId)
  const rating = normalizeRating(body?.rating)

  if (postId === null || rating === null) {
    return NextResponse.json(
      { error: 'Invalid rating payload' },
      { status: 400 },
    )
  }

  const payload = await getPayload({
    config: configPromise,
  })

  const post = await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: postId,
    overrideAccess: true,
  })

  const currentRating = (post as any).rating || {}
  const total =
    Math.max(0, Number(currentRating.total) || 0) + rating
  const count =
    Math.max(0, Number(currentRating.count) || 0) + 1
  const average =
    Math.round((total / count) * 100) / 100

  await payload.update({
    collection: 'posts',
    data: {
      rating: {
        average,
        count,
        total,
      },
    } as any,
    id: postId,
    overrideAccess: true,
  })

  return NextResponse.json({
    average,
    count,
    total,
  })
}
