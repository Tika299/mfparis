import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type SocketTicketRole = 'admin' | 'customer'

export type SocketTicketClaims = {
  role: SocketTicketRole
  profileId?: string
  iat: number
  exp: number
  nonce: string
}

function signEncodedPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createSocketTicket(
  claims: Omit<SocketTicketClaims, 'iat' | 'exp' | 'nonce'>,
  secret: string,
  ttlSeconds = 60,
) {
  if (!secret) throw new Error('SOCKET_TICKET_SECRET is not configured')

  const now = Math.floor(Date.now() / 1000)
  const payload: SocketTicketClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
    nonce: randomBytes(12).toString('base64url'),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  return `${encodedPayload}.${signEncodedPayload(encodedPayload, secret)}`
}

export function verifySocketTicket(ticket: string, secret: string): SocketTicketClaims | null {
  if (!ticket || !secret) return null

  const [encodedPayload, signature] = ticket.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = signEncodedPayload(encodedPayload, secret)
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const claims = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as SocketTicketClaims
    const now = Math.floor(Date.now() / 1000)

    if (
      (claims.role !== 'admin' && claims.role !== 'customer') ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= now ||
      claims.iat > now + 30 ||
      (claims.role === 'customer' && !claims.profileId)
    ) {
      return null
    }

    return claims
  } catch {
    return null
  }
}
