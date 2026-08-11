import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload, type Payload } from 'payload'

type AuthenticatedPayload = {
  payload: Payload
  user: NonNullable<Awaited<ReturnType<Payload['auth']>>['user']>
}

type UnauthenticatedPayload = {
  error: NextResponse
  payload: Payload
}

export async function getAuthenticatedAdminPayload(
  request: Request,
): Promise<AuthenticatedPayload | UnauthenticatedPayload> {
  const payload = await getPayload({ config: configPromise })
  const authentication = await payload.auth({ headers: request.headers })

  if (!authentication.user) {
    return {
      error: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Bạn cần đăng nhập admin để sử dụng chức năng này.',
        },
        { status: 401 },
      ),
      payload,
    }
  }

  return {
    payload,
    user: authentication.user,
  }
}

export async function isAuthenticatedAdminRequest(request: Request) {
  const auth = await getAuthenticatedAdminPayload(request)

  return !('error' in auth)
}
