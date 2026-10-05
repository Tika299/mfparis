import type { Payload } from 'payload'

export const CHAT_AUTH_COOKIE = 'mf_chat_token'

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

type ChatProfileUser = {
  id: string | number
  collection?: string
  name?: string
  username?: string
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null

  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!value) return null

  try {
    return decodeURIComponent(value.slice(name.length + 1))
  } catch {
    return null
  }
}

export function getRequestAddress(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * A small process-local guard for the single web instance. The reverse proxy
 * should still provide the primary rate limit in a multi-instance setup.
 */
export function consumeChatRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = rateLimitBuckets.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= limit) return false

  current.count += 1

  if (rateLimitBuckets.size > 1000) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey)
    }
  }

  return true
}

export function isAdminUser(user: unknown) {
  return (
    typeof user === 'object' &&
    user !== null &&
    'collection' in user &&
    (user as { collection?: unknown }).collection === 'users'
  )
}

export function toPublicChatProfile(user: unknown) {
  if (!user || typeof user !== 'object') return null

  const profile = user as ChatProfileUser

  if (!profile.id) return null

  return {
    id: String(profile.id),
    name: typeof profile.name === 'string' ? profile.name : '',
    username: typeof profile.username === 'string' ? profile.username : undefined,
  }
}

/**
 * Authenticate a customer using the HttpOnly chat cookie. The profile id
 * must always come from this authenticated user, never from request input.
 */
export async function getAuthenticatedChatProfile(payload: Payload, request: Request) {
  const token = readCookie(request.headers.get('cookie'), CHAT_AUTH_COOKIE)

  if (!token) return null

  try {
    const headers = new Headers(request.headers)
    headers.set('authorization', `JWT ${token}`)

    const authentication = await payload.auth({ headers })
    const user = authentication.user

    if (!user || user.collection !== 'chat-profiles') return null

    return user
  } catch {
    return null
  }
}
