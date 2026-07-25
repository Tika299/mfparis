import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET() {
  return new NextResponse(
    'Danh mục này đã được gỡ khỏi cấu trúc SEO của MF Paris.',
    {
      status: 410,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  )
}
