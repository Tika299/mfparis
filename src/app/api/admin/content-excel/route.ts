import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import {
  exportContentExcel,
  importContentExcel,
  parseCsvList,
  type ContentExcelExportFormat,
  type ContentExcelExportProfile,
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

function normalizeFormat(value: string | null): ContentExcelExportFormat {
  if (value === 'csv') return 'csv'

  return 'xls'
}

function normalizeProfile(value: string | null): ContentExcelExportProfile {
  if (value === 'google-sheets') return 'google-sheets'

  return 'full'
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
    const format = normalizeFormat(url.searchParams.get('format'))
    const profile = normalizeProfile(url.searchParams.get('profile'))
    const includeContent = url.searchParams.get('includeContent') === 'true'
    const { csv, workbookXml } = await exportContentExcel({
      format,
      includeContent,
      payload: auth.payload,
      only,
      profile,
      productIds: parseCsvList(url.searchParams.get('productIds')),
      productSlugs: parseCsvList(url.searchParams.get('productSlugs')),
      postIds: parseCsvList(url.searchParams.get('postIds')),
      postSlugs: parseCsvList(url.searchParams.get('postSlugs')),
      limit: Number(url.searchParams.get('limit') || 0) || 0,
    })
    const extension = format === 'csv' ? 'csv' : 'xls'
    const fileName = `mfparis-${only}-content-${profile}-${timestampForFileName()}.${extension}`

    return new Response(format === 'csv' ? csv : workbookXml, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type':
          format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/vnd.ms-excel; charset=utf-8',
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
    const fileName = file.name.toLowerCase()
    const format =
      String(formData.get('format') || '').toLowerCase() === 'csv' || fileName.endsWith('.csv')
        ? 'csv'
        : 'xls'
    const dryRun = String(formData.get('dryRun') || 'true') !== 'false'
    const includeReadOnly = String(formData.get('includeReadOnly') || 'false') === 'true'
    const workbookXml = Buffer.from(await file.arrayBuffer()).toString('utf8')
    const result = await importContentExcel({
      format,
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
