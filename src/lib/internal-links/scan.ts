import pLimit from 'p-limit'
import type { Payload, Where } from 'payload'

import type { InternalLinkScanRun } from '@/payload-types'
import { stripHtmlToText } from '@/utilities/autoSummary'

import { applyInternalLinksForRender } from './applyInternalLinks'
import { getInternalLinkingConfig } from './getInternalLinkingConfig'
import { normalizeVietnameseText } from './normalizeVietnamese'
import {
  getInternalLinkDocumentUrl,
  INTERNAL_LINK_PREVIEW_FIELDS,
} from './previewFields'
import {
  countInternalLinkWords,
  getInternalLinkContextExcerpt,
  getInternalLinkInsertionIssueFlags,
  getInternalLinkSkipIssueFlags,
  shouldStoreInternalLinkSkip,
} from './scanUtils'
import type {
  InternalLinkInsertion,
  InternalLinkSkippedItem,
} from './types'

export const INTERNAL_LINK_SCAN_SOURCE_TYPES = [
  'posts',
  'products',
  'categories',
  'brands',
] as const

export type InternalLinkScanSourceType =
  (typeof INTERNAL_LINK_SCAN_SOURCE_TYPES)[number]

export type InternalLinkScanResultMode =
  | 'inserted'
  | 'issues'
  | 'pages'
  | 'skipped'

const DOCUMENT_MARKER_FIELD = '__document__'
const RESULT_WRITE_CONCURRENCY = 6

type ScanResultData = {
  anchorText?: string | null
  contextExcerpt?: string | null
  issueFlags?: string[] | null
  keyword?: string | null
  linkCount?: number | null
  linksPerHundredWords?: number | null
  paragraphIndex?: number | null
  recordKey: string
  reviewStatus?: 'new' | 'reviewed' | 'resolved' | 'dismissed'
  rowType: 'page' | 'inserted' | 'skipped'
  rule?: number | null
  ruleTitle?: string | null
  scanRun: number
  skipReason?: string | null
  sourceField: string
  sourceFieldLabel?: string | null
  sourceId: string
  sourceTitle?: string | null
  sourceType: InternalLinkScanSourceType
  sourceUrl: string
  targetUrl?: string | null
  wordCount?: number | null
}

export class InternalLinkScanError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'InternalLinkScanError'
    this.status = status
  }
}

export function isInternalLinkScanSourceType(
  value: unknown,
): value is InternalLinkScanSourceType {
  return INTERNAL_LINK_SCAN_SOURCE_TYPES.includes(
    value as InternalLinkScanSourceType,
  )
}

export function normalizeInternalLinkScanSourceTypes(
  value: unknown,
): InternalLinkScanSourceType[] {
  if (value === undefined) return [...INTERNAL_LINK_SCAN_SOURCE_TYPES]
  if (!Array.isArray(value)) return []

  return Array.from(new Set(value.filter(isInternalLinkScanSourceType)))
}

function getRunId(value: unknown): number {
  const id = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(id) || id <= 0) {
    throw new InternalLinkScanError('Run ID không hợp lệ.')
  }

  return id
}

function getSourceTitle(doc: Record<string, unknown>): string | null {
  if (typeof doc.title === 'string') return doc.title
  if (typeof doc.name === 'string') return doc.name
  return null
}

function getPublishedWhere(sourceType: InternalLinkScanSourceType) {
  if (sourceType === 'posts' || sourceType === 'products') {
    return { status: { equals: 'published' } }
  }

  return undefined
}

function createRecordKey(parts: Array<number | string>): string {
  return parts.map((part) => String(part)).join(':')
}

function getRuleId(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
}

async function upsertScanResult(
  payload: Payload,
  data: ScanResultData,
): Promise<void> {
  const existing = await payload.find({
    collection: 'internal-link-scan-results',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      recordKey: { equals: data.recordKey },
    },
  })

  const existingResult = existing.docs[0]

  if (existingResult) {
    const { reviewStatus: _reviewStatus, ...retryData } = data

    await payload.update({
      collection: 'internal-link-scan-results',
      id: existingResult.id,
      depth: 0,
      overrideAccess: true,
      data: retryData,
    })
    return
  }

  try {
    await payload.create({
      collection: 'internal-link-scan-results',
      depth: 0,
      overrideAccess: true,
      data,
    })
  } catch (error) {
    const createdByConcurrentRequest = await payload.find({
      collection: 'internal-link-scan-results',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: {
        recordKey: { equals: data.recordKey },
      },
    })

    if (!createdByConcurrentRequest.docs[0]) throw error
  }
}

function countByValue(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1)
  }

  return counts
}

function buildInsertionResults(args: {
  fieldName: string
  fieldLabel: string
  insertions: InternalLinkInsertion[]
  plainText: string
  runId: number
  sourceId: string
  sourceTitle: string | null
  sourceType: InternalLinkScanSourceType
  sourceUrl: string
}): ScanResultData[] {
  const targetCounts = countByValue(
    args.insertions.map((item) => item.targetUrl),
  )
  const anchorCounts = countByValue(
    args.insertions.map((item) => normalizeVietnameseText(item.anchorText)),
  )

  return args.insertions.map((item, index) => {
    const issueFlags = getInternalLinkInsertionIssueFlags(
      item,
      targetCounts,
      anchorCounts,
    )

    return {
      recordKey: createRecordKey([
        args.runId,
        args.sourceType,
        args.sourceId,
        args.fieldName,
        'inserted',
        index,
      ]),
      scanRun: args.runId,
      rowType: 'inserted',
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      sourceTitle: args.sourceTitle,
      sourceUrl: args.sourceUrl,
      sourceField: args.fieldName,
      sourceFieldLabel: args.fieldLabel,
      rule: getRuleId(item.ruleId),
      ruleTitle: item.ruleTitle || null,
      keyword: item.keyword,
      anchorText: item.anchorText,
      targetUrl: item.targetUrl,
      paragraphIndex: item.paragraphIndex ?? null,
      contextExcerpt: getInternalLinkContextExcerpt(
        args.plainText,
        item.anchorText,
      ),
      issueFlags: issueFlags.length ? issueFlags : null,
      reviewStatus: 'new',
    }
  })
}

function buildSkippedResults(args: {
  fieldName: string
  fieldLabel: string
  plainText: string
  runId: number
  skipped: InternalLinkSkippedItem[]
  sourceId: string
  sourceTitle: string | null
  sourceType: InternalLinkScanSourceType
  sourceUrl: string
}): ScanResultData[] {
  return args.skipped
    .filter((item) => shouldStoreInternalLinkSkip(item, args.plainText))
    .map((item, index) => {
      const issueFlags = getInternalLinkSkipIssueFlags(item)

      return {
        recordKey: createRecordKey([
          args.runId,
          args.sourceType,
          args.sourceId,
          args.fieldName,
          'skipped',
          index,
        ]),
        scanRun: args.runId,
        rowType: 'skipped',
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        sourceTitle: args.sourceTitle,
        sourceUrl: args.sourceUrl,
        sourceField: args.fieldName,
        sourceFieldLabel: args.fieldLabel,
        rule: getRuleId(item.ruleId),
        ruleTitle: item.ruleTitle || null,
        keyword: item.keyword || null,
        anchorText: item.anchorText || null,
        targetUrl: item.targetUrl || null,
        contextExcerpt:
          item.textPreview ||
          getInternalLinkContextExcerpt(args.plainText, item.anchorText),
        skipReason: item.reason,
        issueFlags: issueFlags.length ? issueFlags : null,
        reviewStatus: 'new',
      }
    })
}

async function buildDocumentResults(args: {
  doc: Record<string, unknown>
  payload: Payload
  runId: number
  sourceType: InternalLinkScanSourceType
}): Promise<ScanResultData[]> {
  const docId = String(args.doc.id)
  const sourceTitle = getSourceTitle(args.doc)
  const slug = typeof args.doc.slug === 'string' ? args.doc.slug : ''
  const sourceUrl = slug
    ? getInternalLinkDocumentUrl(args.sourceType, slug)
    : '/'
  const settings = getInternalLinkingConfig(args.doc)
  const results: ScanResultData[] = []
  let documentLinkCount = 0
  let documentWordCount = 0

  for (const field of INTERNAL_LINK_PREVIEW_FIELDS[args.sourceType]) {
    const html =
      typeof args.doc[field.name] === 'string'
        ? args.doc[field.name]
        : ''
    const plainText = stripHtmlToText(html)
    const wordCount = countInternalLinkWords(plainText)
    const scanResult = await applyInternalLinksForRender({
      html,
      currentUrl: sourceUrl,
      forcePreview: true,
      payload: args.payload,
      scope: args.sourceType,
      ...settings,
    })
    const skippedResults = buildSkippedResults({
      fieldName: field.name,
      fieldLabel: field.label,
      plainText,
      runId: args.runId,
      skipped: scanResult.skipped,
      sourceId: docId,
      sourceTitle,
      sourceType: args.sourceType,
      sourceUrl,
    })
    const insertionResults = buildInsertionResults({
      fieldName: field.name,
      fieldLabel: field.label,
      insertions: scanResult.insertions,
      plainText,
      runId: args.runId,
      sourceId: docId,
      sourceTitle,
      sourceType: args.sourceType,
      sourceUrl,
    })
    const linkCount = insertionResults.length
    const linksPerHundredWords = wordCount
      ? Number(((linkCount / wordCount) * 100).toFixed(2))
      : 0

    results.push({
      recordKey: createRecordKey([
        args.runId,
        args.sourceType,
        docId,
        field.name,
        'page',
      ]),
      scanRun: args.runId,
      rowType: 'page',
      sourceType: args.sourceType,
      sourceId: docId,
      sourceTitle,
      sourceUrl,
      sourceField: field.name,
      sourceFieldLabel: field.label,
      wordCount,
      linkCount,
      linksPerHundredWords,
      issueFlags: null,
    })
    results.push(...insertionResults, ...skippedResults)

    documentLinkCount += linkCount
    documentWordCount += wordCount
  }

  results.push({
    recordKey: createRecordKey([
      args.runId,
      args.sourceType,
      docId,
      DOCUMENT_MARKER_FIELD,
      'page',
    ]),
    scanRun: args.runId,
    rowType: 'page',
    sourceType: args.sourceType,
    sourceId: docId,
    sourceTitle,
    sourceUrl,
    sourceField: DOCUMENT_MARKER_FIELD,
    sourceFieldLabel: 'Tổng trang',
    wordCount: documentWordCount,
    linkCount: documentLinkCount,
    linksPerHundredWords: documentWordCount
      ? Number(((documentLinkCount / documentWordCount) * 100).toFixed(2))
      : 0,
    issueFlags: null,
  })

  return results
}

async function getScanRun(
  payload: Payload,
  runIdInput: unknown,
): Promise<InternalLinkScanRun> {
  const runId = getRunId(runIdInput)

  try {
    return await payload.findByID({
      collection: 'internal-link-scan-runs',
      id: runId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    throw new InternalLinkScanError('Không tìm thấy lần quét.', 404)
  }
}

async function getRunCounts(payload: Payload, runId: number) {
  const runWhere = { scanRun: { equals: runId } }
  const [pages, fields, inserted, skipped, issues] = await Promise.all([
    payload.count({
      collection: 'internal-link-scan-results',
      overrideAccess: true,
      where: {
        and: [
          runWhere,
          { rowType: { equals: 'page' } },
          { sourceField: { equals: DOCUMENT_MARKER_FIELD } },
        ],
      },
    }),
    payload.count({
      collection: 'internal-link-scan-results',
      overrideAccess: true,
      where: {
        and: [
          runWhere,
          { rowType: { equals: 'page' } },
          { sourceField: { not_equals: DOCUMENT_MARKER_FIELD } },
        ],
      },
    }),
    payload.count({
      collection: 'internal-link-scan-results',
      overrideAccess: true,
      where: {
        and: [runWhere, { rowType: { equals: 'inserted' } }],
      },
    }),
    payload.count({
      collection: 'internal-link-scan-results',
      overrideAccess: true,
      where: {
        and: [runWhere, { rowType: { equals: 'skipped' } }],
      },
    }),
    payload.count({
      collection: 'internal-link-scan-results',
      overrideAccess: true,
      where: {
        and: [runWhere, { issueFlags: { exists: true } }],
      },
    }),
  ])

  return {
    pagesScanned: pages.totalDocs,
    fieldsScanned: fields.totalDocs,
    candidateLinks: inserted.totalDocs + skipped.totalDocs,
    insertedCandidates: inserted.totalDocs,
    skippedCandidates: skipped.totalDocs,
    issueCount: issues.totalDocs,
  }
}

export async function startInternalLinkScan(args: {
  payload: Payload
  requestedBy: number
  sourceTypes: InternalLinkScanSourceType[]
}): Promise<InternalLinkScanRun> {
  if (!args.sourceTypes.length) {
    throw new InternalLinkScanError(
      'Cần chọn ít nhất một loại nội dung để quét.',
    )
  }

  const running = await args.payload.find({
    collection: 'internal-link-scan-runs',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    sort: '-startedAt',
    where: { status: { equals: 'running' } },
  })

  if (running.docs[0]) {
    throw new InternalLinkScanError(
      `Lần quét #${running.docs[0].id} đang chạy.`,
      409,
    )
  }

  return args.payload.create({
    collection: 'internal-link-scan-runs',
    depth: 0,
    overrideAccess: true,
    data: {
      status: 'running',
      requestedBy: args.requestedBy,
      sourceTypes: args.sourceTypes,
      currentSourceTypeIndex: 0,
      currentPage: 1,
      pagesScanned: 0,
      fieldsScanned: 0,
      candidateLinks: 0,
      insertedCandidates: 0,
      skippedCandidates: 0,
      issueCount: 0,
      startedAt: new Date().toISOString(),
    },
  })
}

export async function runInternalLinkScanBatch(args: {
  batchSize: number
  payload: Payload
  runId: unknown
}): Promise<InternalLinkScanRun> {
  const run = await getScanRun(args.payload, args.runId)

  if (run.status !== 'running') {
    throw new InternalLinkScanError(
      `Không thể chạy batch khi trạng thái là ${run.status}.`,
      409,
    )
  }

  const sourceTypes = run.sourceTypes.filter(isInternalLinkScanSourceType)
  const sourceTypeIndex = Math.max(0, run.currentSourceTypeIndex || 0)
  const currentPage = Math.max(1, run.currentPage || 1)
  const sourceType = sourceTypes[sourceTypeIndex]

  if (!sourceType) {
    return args.payload.update({
      collection: 'internal-link-scan-runs',
      id: run.id,
      depth: 0,
      overrideAccess: true,
      data: {
        status: 'completed',
        finishedAt: new Date().toISOString(),
      },
    })
  }

  try {
    const page = await args.payload.find({
      collection: sourceType,
      depth: 0,
      limit: args.batchSize,
      overrideAccess: true,
      page: currentPage,
      sort: 'id',
      where: getPublishedWhere(sourceType),
    })
    const resultGroups = await Promise.all(
      page.docs.map((doc) =>
        buildDocumentResults({
          doc: doc as unknown as Record<string, unknown>,
          payload: args.payload,
          runId: run.id,
          sourceType,
        }),
      ),
    )
    const limiter = pLimit(RESULT_WRITE_CONCURRENCY)

    await Promise.all(
      resultGroups
        .flat()
        .map((data) => limiter(() => upsertScanResult(args.payload, data))),
    )

    const counts = await getRunCounts(args.payload, run.id)
    const sourceComplete = page.hasNextPage !== true
    const nextSourceTypeIndex = sourceComplete
      ? sourceTypeIndex + 1
      : sourceTypeIndex
    const completed = nextSourceTypeIndex >= sourceTypes.length

    return await args.payload.update({
      collection: 'internal-link-scan-runs',
      id: run.id,
      depth: 0,
      overrideAccess: true,
      data: {
        ...counts,
        currentSourceTypeIndex: nextSourceTypeIndex,
        currentPage: sourceComplete ? 1 : currentPage + 1,
        status: completed ? 'completed' : 'running',
        finishedAt: completed ? new Date().toISOString() : null,
        errorMessage: null,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : 'Unknown scan error'

    await args.payload.update({
      collection: 'internal-link-scan-runs',
      id: run.id,
      depth: 0,
      overrideAccess: true,
      data: {
        status: 'failed',
        errorMessage: message,
        finishedAt: new Date().toISOString(),
      },
    })

    throw error
  }
}

export async function cancelInternalLinkScan(
  payload: Payload,
  runIdInput: unknown,
): Promise<InternalLinkScanRun> {
  const run = await getScanRun(payload, runIdInput)

  if (run.status !== 'running') {
    throw new InternalLinkScanError(
      `Chỉ có thể hủy lần quét đang chạy; trạng thái hiện tại là ${run.status}.`,
      409,
    )
  }

  return payload.update({
    collection: 'internal-link-scan-runs',
    id: run.id,
    depth: 0,
    overrideAccess: true,
    data: {
      status: 'cancelled',
      finishedAt: new Date().toISOString(),
    },
  })
}

export async function resumeInternalLinkScan(
  payload: Payload,
  runIdInput: unknown,
): Promise<InternalLinkScanRun> {
  const run = await getScanRun(payload, runIdInput)

  if (run.status !== 'failed' && run.status !== 'cancelled') {
    throw new InternalLinkScanError(
      `Chỉ có thể tiếp tục lần quét thất bại hoặc đã hủy; trạng thái hiện tại là ${run.status}.`,
      409,
    )
  }

  const otherRunning = await payload.find({
    collection: 'internal-link-scan-runs',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      and: [
        { status: { equals: 'running' } },
        { id: { not_equals: run.id } },
      ],
    },
  })

  if (otherRunning.docs[0]) {
    throw new InternalLinkScanError(
      `Lần quét #${otherRunning.docs[0].id} đang chạy.`,
      409,
    )
  }

  return payload.update({
    collection: 'internal-link-scan-runs',
    id: run.id,
    depth: 0,
    overrideAccess: true,
    data: {
      status: 'running',
      errorMessage: null,
      finishedAt: null,
    },
  })
}

export async function getInternalLinkScanStatus(
  payload: Payload,
  runIdInput?: unknown,
): Promise<InternalLinkScanRun | null> {
  if (runIdInput !== undefined && runIdInput !== null && runIdInput !== '') {
    return getScanRun(payload, runIdInput)
  }

  const latest = await payload.find({
    collection: 'internal-link-scan-runs',
    depth: 1,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    sort: '-startedAt',
  })

  return latest.docs[0] || null
}

export async function listInternalLinkScanResults(args: {
  limit: number
  mode: InternalLinkScanResultMode
  page: number
  payload: Payload
  reviewStatus?: string | null
  runId: unknown
  search?: string | null
  sourceId?: string | null
  sourceType?: string | null
}) {
  const run = await getScanRun(args.payload, args.runId)
  const conditions: Where[] = [
    { scanRun: { equals: run.id } },
  ]

  if (args.mode === 'pages') {
    conditions.push(
      { rowType: { equals: 'page' } },
      { sourceField: { equals: DOCUMENT_MARKER_FIELD } },
    )
  } else if (args.mode === 'issues') {
    conditions.push({ issueFlags: { exists: true } })
  } else {
    conditions.push({ rowType: { equals: args.mode } })
  }

  if (isInternalLinkScanSourceType(args.sourceType)) {
    conditions.push({ sourceType: { equals: args.sourceType } })
  }

  if (args.sourceId?.trim()) {
    conditions.push({ sourceId: { equals: args.sourceId.trim() } })
  }

  if (
    args.reviewStatus === 'new' ||
    args.reviewStatus === 'reviewed' ||
    args.reviewStatus === 'resolved' ||
    args.reviewStatus === 'dismissed'
  ) {
    conditions.push({ reviewStatus: { equals: args.reviewStatus } })
  }

  const search = args.search?.trim().slice(0, 120)

  if (search) {
    conditions.push({
      or: [
        { sourceTitle: { contains: search } },
        { sourceUrl: { contains: search } },
        { anchorText: { contains: search } },
        { keyword: { contains: search } },
        { targetUrl: { contains: search } },
      ],
    })
  }

  const results = await args.payload.find({
    collection: 'internal-link-scan-results',
    depth: 1,
    limit: args.limit,
    overrideAccess: true,
    page: args.page,
    sort: args.mode === 'pages' ? 'sourceTitle' : '-createdAt',
    where: { and: conditions },
  })

  return { results, run }
}

export async function updateInternalLinkScanReview(args: {
  payload: Payload
  resultId: unknown
  reviewStatus: unknown
}) {
  const resultId = getRunId(args.resultId)

  if (
    args.reviewStatus !== 'new' &&
    args.reviewStatus !== 'reviewed' &&
    args.reviewStatus !== 'resolved' &&
    args.reviewStatus !== 'dismissed'
  ) {
    throw new InternalLinkScanError('Trạng thái review không hợp lệ.')
  }

  try {
    return await args.payload.update({
      collection: 'internal-link-scan-results',
      id: resultId,
      depth: 1,
      overrideAccess: true,
      data: { reviewStatus: args.reviewStatus },
    })
  } catch {
    throw new InternalLinkScanError('Không tìm thấy kết quả quét.', 404)
  }
}
