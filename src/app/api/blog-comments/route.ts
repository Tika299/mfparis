import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function getRelationId(
  value: unknown,
): string | number | null {
  if (
    value &&
    typeof value === 'object' &&
    'id' in value
  ) {
    return normalizeId((value as { id?: unknown }).id)
  }

  return normalizeId(value)
}

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  return (
    forwardedFor?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    undefined
  )
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (normalizeText(body?.company, 120)) {
    return NextResponse.json({
      success: true,
      status: 'pending',
    })
  }

  const postId = normalizeId(body?.postId)
  const name = normalizeText(body?.name, 120)
  const email = normalizeText(body?.email, 180).toLowerCase()
  const comment = normalizeText(body?.comment, 2000)
  const parentId = normalizeId(body?.parentId ?? body?.parent)

  if (!postId || !name || !EMAIL_PATTERN.test(email) || comment.length < 5) {
    return NextResponse.json(
      { error: 'Th\u00f4ng tin b\u00ecnh lu\u1eadn ch\u01b0a h\u1ee3p l\u1ec7.' },
      { status: 400 },
    )
  }

  const payload = await getPayload({
    config: configPromise,
  })

  try {
    await payload.findByID({
      collection: 'posts',
      depth: 0,
      id: postId,
      overrideAccess: true,
    })
  } catch {
    return NextResponse.json(
      { error: 'Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i vi\u1ebft.' },
      { status: 404 },
    )
  }

  let parentCommentId: string | number | undefined

  if (parentId) {
    const parentComment = await payload
      .findByID({
        collection: 'blog-comments' as any,
        depth: 0,
        id: parentId,
        overrideAccess: true,
      })
      .catch(() => null)

    if (
      !parentComment ||
      String(getRelationId(parentComment.post)) !== String(postId) ||
      parentComment.status !== 'approved'
    ) {
      return NextResponse.json(
        {
          error:
            'B\u00ecnh lu\u1eadn c\u1ea7n tr\u1ea3 l\u1eddi kh\u00f4ng h\u1ee3p l\u1ec7.',
        },
        { status: 400 },
      )
    }

    parentCommentId = parentComment.id
  }

  await payload.create({
    collection: 'blog-comments' as any,
    data: {
      post: postId,
      parent: parentCommentId,
      name,
      email,
      comment,
      status: 'pending',
      ipAddress: getClientIp(request),
      userAgent:
        request.headers.get('user-agent')?.slice(0, 500) || undefined,
    },
    depth: 0,
    overrideAccess: true,
  })

  return NextResponse.json({
    success: true,
    status: 'pending',
  })
}
