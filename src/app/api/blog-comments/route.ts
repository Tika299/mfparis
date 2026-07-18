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

  if (!postId || !name || !EMAIL_PATTERN.test(email) || comment.length < 5) {
    return NextResponse.json(
      { error: 'Th\u00f4ng tin b\u00ecnh lu\u1eadn ch\u01b0a h\u1ee3p l\u1ec7.' },
      { status: 400 },
    )
  }

  const payload = await getPayload({
    config: configPromise,
  })

  await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: postId,
    overrideAccess: true,
  })

  await payload.create({
    collection: 'blog-comments' as any,
    data: {
      post: postId,
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
