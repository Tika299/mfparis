import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

import {
  CHAT_AUTH_COOKIE,
  consumeChatRateLimit,
  getRequestAddress,
  toPublicChatProfile,
} from '@/utilities/chatAuth'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/

function setChatCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: CHAT_AUTH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function POST(req: Request) {
  try {
    const address = getRequestAddress(req)

    if (!consumeChatRateLimit(`chat-auth:${address}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Bạn thử lại sau ít phút.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const action = body?.action

    if (action === 'logout') {
      const response = NextResponse.json({ success: true })
      response.cookies.set({
        name: CHAT_AUTH_COOKIE,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return response
    }

    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!['login', 'register'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Yêu cầu không hợp lệ.' }, { status: 400 })
    }

    const invalidCredentials =
      username.length < 3 ||
      username.length > 64 ||
      !USERNAME_PATTERN.test(username) ||
      password.length === 0 ||
      password.length > 128

    if (invalidCredentials) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tên đăng nhập hoặc mật khẩu không đúng định dạng.',
        },
        { status: 400 },
      )
    }

    if (action === 'register' && password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 8 ký tự.' },
        { status: 400 },
      )
    }

    if (action === 'register' && (name.length < 2 || name.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập họ tên hợp lệ.' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: configPromise })

    if (action === 'register') {
      await payload.create({
        collection: 'chat-profiles',
        data: {
          name,
          username,
          password,
          email: `${username}@chat.mfparis.vn`,
        },
        // Public registration is intentionally handled here, not through
        // the public Payload collection endpoint.
        overrideAccess: true,
      })
    }

    const result = await payload.login({
      collection: 'chat-profiles',
      data: { username, password },
    })

    const user = toPublicChatProfile(result.user)

    if (!result.token || !user) {
      return NextResponse.json(
        { success: false, error: 'Không thể xác thực tài khoản.' },
        { status: 401 },
      )
    }

    const response = NextResponse.json({
      success: true,
      user,
    })

    setChatCookie(response, result.token)
    return response
  } catch (error: unknown) {
    console.error('Chat authentication failed', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã tồn tại.',
      },
      { status: 400 },
    )
  }
}
