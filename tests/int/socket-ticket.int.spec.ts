import { describe, expect, it } from 'vitest'

import {
  createSocketTicket,
  verifySocketTicket,
} from '@/utilities/socketTicket'

describe('socket tickets', () => {
  const secret = 'test-socket-ticket-secret'

  it('creates a customer ticket that can be verified', () => {
    const ticket = createSocketTicket(
      { role: 'customer', profileId: '40132' },
      secret,
    )

    expect(verifySocketTicket(ticket, secret)).toMatchObject({
      role: 'customer',
      profileId: '40132',
    })
  })

  it('rejects a ticket signed with another secret', () => {
    const ticket = createSocketTicket({ role: 'admin' }, secret)

    expect(verifySocketTicket(ticket, 'wrong-secret')).toBeNull()
  })

  it('rejects an expired ticket', () => {
    const ticket = createSocketTicket({ role: 'admin' }, secret, 0)

    expect(verifySocketTicket(ticket, secret)).toBeNull()
  })
})
