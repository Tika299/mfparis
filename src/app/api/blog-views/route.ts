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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const postId = normalizePostId(body?.postId)

  if (postId === null) {
    return NextResponse.json(
      { error: 'Invalid postId' },
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

  const viewCount =
    Math.max(0, Number((post as any).viewCount) || 0) + 1

  await payload.update({
    collection: 'posts',
    data: {
      viewCount,
    } as any,
    id: postId,
    overrideAccess: true,
  })

  return NextResponse.json({ viewCount })
}
