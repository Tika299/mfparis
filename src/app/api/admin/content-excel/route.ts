import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import {
  exportContentExcel,
  importContentExcel,
  parseCsvList,
  type ContentExcelOnly,
} from '@/lib/content-excel/contentExcel'

async function getAuthenticatedPayload(request: Request) {
  const payload = await getPayload({ config: configPromise })
  const authentication = await payload.auth({ headers: request.headers })

  if (!authentication.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      payload,
    }
  }

  return { payload }
}

function normalizeOnly(value: string | null): ContentExcelOnly {
  if (value === 'products' || value === 'posts' || value === 'all') return value

  return 'all'
}

function timestampForFileName() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedPayload(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const only = normalizeOnly(url.searchParams.get('only'))
    const { workbookXml } = await exportContentExcel({
      payload: auth.payload,
      only,
      productIds: parseCsvList(url.searchParams.get('productIds')),
      productSlugs: parseCsvList(url.searchParams.get('productSlugs')),
      postIds: parseCsvList(url.searchParams.get('postIds')),
      postSlugs: parseCsvList(url.searchParams.get('postSlugs')),
      limit: Number(url.searchParams.get('limit') || 0) || 0,
    })
    const fileName = `mfparis-${only}-content-${timestampForFileName()}.xls`

    return new Response(workbookXml, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[content-excel-export]', error)

    return NextResponse.json(
      { error: 'Cannot export content Excel' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedPayload(request)
    if (auth.error) return auth.error

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing Excel file' }, { status: 400 })
    }

    const only = normalizeOnly(String(formData.get('only') || 'all'))
    const dryRun = String(formData.get('dryRun') || 'true') !== 'false'
    const includeReadOnly = String(formData.get('includeReadOnly') || 'false') === 'true'
    const workbookXml = Buffer.from(await file.arrayBuffer()).toString('utf8')
    const result = await importContentExcel({
      payload: auth.payload,
      workbookXml,
      only,
      dryRun,
      includeReadOnly,
    })

    return NextResponse.json({
      dryRun,
      fileName: file.name,
      result,
      success: true,
    })
  } catch (error) {
    console.error('[content-excel-import]', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Cannot import content Excel',
        success: false,
      },
      { status: 500 },
    )
  }
}
