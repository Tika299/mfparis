import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET() {
  return new NextResponse('Route nay khong con duoc su dung.', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
