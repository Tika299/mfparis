import { NextResponse } from 'next/server'

import {
  cancelInternalLinkScan,
  getInternalLinkScanStatus,
  InternalLinkScanError,
  listInternalLinkScanResults,
  normalizeInternalLinkScanSourceTypes,
  resumeInternalLinkScan,
  runInternalLinkScanBatch,
  startInternalLinkScan,
  updateInternalLinkScanReview,
  type InternalLinkScanResultMode,
} from '@/lib/internal-links/scan'
import { getAuthenticatedAdminPayload } from '@/utilities/adminAuth'

export const maxDuration = 60

type ScanRequestBody = {
  action?: 'batch' | 'cancel' | 'resume' | 'review' | 'start'
  batchSize?: number
  resultId?: number | string
  reviewStatus?: 'dismissed' | 'new' | 'resolved' | 'reviewed'
  runId?: number | string
  sourceTypes?: unknown
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) return fallback

  return Math.min(max, Math.max(1, Math.floor(parsed)))
}

function errorResponse(error: unknown) {
  if (error instanceof InternalLinkScanError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    )
  }

  console.error('[internal-links-scan]', error)

  return NextResponse.json(
    { success: false, error: 'Không thể xử lý lần quét internal link.' },
    { status: 500 },
  )
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const url = new URL(req.url)
    const mode = url.searchParams.get('mode')
    const runId = url.searchParams.get('runId')

    if (
      mode === 'pages' ||
      mode === 'issues' ||
      mode === 'inserted' ||
      mode === 'skipped'
    ) {
      if (!runId) {
        throw new InternalLinkScanError('Thiếu Run ID.')
      }

      const data = await listInternalLinkScanResults({
        payload: auth.payload,
        runId,
        mode: mode as InternalLinkScanResultMode,
        page: positiveInteger(url.searchParams.get('page'), 1, 100000),
        limit: positiveInteger(url.searchParams.get('limit'), 25, 100),
        sourceType: url.searchParams.get('sourceType'),
        reviewStatus: url.searchParams.get('reviewStatus'),
        search: url.searchParams.get('search'),
      })

      return NextResponse.json({
        success: true,
        run: data.run,
        results: data.results.docs,
        pagination: {
          page: data.results.page,
          totalPages: data.results.totalPages,
          totalDocs: data.results.totalDocs,
          hasNextPage: data.results.hasNextPage,
          hasPrevPage: data.results.hasPrevPage,
        },
      })
    }

    const run = await getInternalLinkScanStatus(
      auth.payload,
      runId,
    )

    return NextResponse.json({ success: true, run })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedAdminPayload(req)
    if ('error' in auth) return auth.error

    const body = (await req.json()) as ScanRequestBody

    switch (body.action) {
      case 'start': {
        const sourceTypes = normalizeInternalLinkScanSourceTypes(
          body.sourceTypes,
        )
        const run = await startInternalLinkScan({
          payload: auth.payload,
          requestedBy: auth.user.id,
          sourceTypes,
        })

        return NextResponse.json({ success: true, run }, { status: 201 })
      }

      case 'batch': {
        const requestedBatchSize = Number(body.batchSize || 5)
        const batchSize = Math.min(
          20,
          Math.max(
            1,
            Number.isFinite(requestedBatchSize)
              ? Math.floor(requestedBatchSize)
              : 5,
          ),
        )
        const run = await runInternalLinkScanBatch({
          batchSize,
          payload: auth.payload,
          runId: body.runId,
        })

        return NextResponse.json({ success: true, run })
      }

      case 'cancel': {
        const run = await cancelInternalLinkScan(
          auth.payload,
          body.runId,
        )

        return NextResponse.json({ success: true, run })
      }

      case 'resume': {
        const run = await resumeInternalLinkScan(
          auth.payload,
          body.runId,
        )

        return NextResponse.json({ success: true, run })
      }

      case 'review': {
        const result = await updateInternalLinkScanReview({
          payload: auth.payload,
          resultId: body.resultId,
          reviewStatus: body.reviewStatus,
        })

        return NextResponse.json({ success: true, result })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Action không hợp lệ.' },
          { status: 400 },
        )
    }
  } catch (error) {
    return errorResponse(error)
  }
}
