import type { Payload } from 'payload'

import { normalizeVietnameseText } from './normalizeVietnamese'
import type {
  ApplyInternalLinksResult,
  InternalLinkInsertion,
  InternalLinkScope,
  InternalLinkSkippedItem,
} from './types'

type RecordInternalLinkPreviewInput = {
  payload: Payload
  sourceType: InternalLinkScope
  sourceId: string | number
  sourceTitle?: string | null
  sourceUrl: string
  result: ApplyInternalLinksResult
}

type AggregatedLogItem = {
  logKey: string
  summary: string
  sourceType: InternalLinkScope
  sourceId: string
  sourceTitle?: string | null
  sourceUrl: string
  ruleId?: string | number
  ruleTitle?: string
  keyword: string
  anchorText?: string
  targetUrl: string
  insertedCount: number
  skippedCount: number
  skipReasons: Set<string>
  lastTextPreview?: string
}

function stablePart(value: unknown): string {
  return normalizeVietnameseText(String(value ?? '').trim())
    .replace(/[^a-z0-9/_:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

function makeLogKey(input: {
  sourceType: string
  sourceId: string
  ruleId?: string | number
  keyword: string
  targetUrl: string
}): string {
  return [
    input.sourceType,
    input.sourceId,
    input.ruleId ? String(input.ruleId) : 'no-rule',
    stablePart(input.keyword),
    stablePart(input.targetUrl),
  ].join('::')
}

function labelForSource(sourceType: InternalLinkScope): string {
  if (sourceType === 'posts') return 'Bai viet'
  if (sourceType === 'products') return 'San pham'
  if (sourceType === 'categories') return 'Danh muc san pham'
  if (sourceType === 'brands') return 'Thuong hieu'
  return 'Danh muc bai viet'
}

function makeSummary(item: AggregatedLogItem): string {
  const sourceLabel = labelForSource(item.sourceType)
  const keyword = item.anchorText || item.keyword

  return `${sourceLabel} #${item.sourceId}: ${keyword} -> ${item.targetUrl}`
}

function addInsertion(
  map: Map<string, AggregatedLogItem>,
  base: Omit<
    AggregatedLogItem,
    | 'logKey'
    | 'summary'
    | 'ruleId'
    | 'ruleTitle'
    | 'keyword'
    | 'anchorText'
    | 'targetUrl'
    | 'insertedCount'
    | 'skippedCount'
    | 'skipReasons'
  >,
  insertion: InternalLinkInsertion,
): void {
  const logKey = makeLogKey({
    sourceType: base.sourceType,
    sourceId: base.sourceId,
    ruleId: insertion.ruleId,
    keyword: insertion.keyword,
    targetUrl: insertion.targetUrl,
  })

  const existing = map.get(logKey)

  if (existing) {
    existing.insertedCount += 1
    existing.anchorText = existing.anchorText || insertion.anchorText
    return
  }

  const item: AggregatedLogItem = {
    ...base,
    logKey,
    summary: '',
    ruleId: insertion.ruleId,
    ruleTitle: insertion.ruleTitle,
    keyword: insertion.keyword,
    anchorText: insertion.anchorText,
    targetUrl: insertion.targetUrl,
    insertedCount: 1,
    skippedCount: 0,
    skipReasons: new Set(),
  }

  item.summary = makeSummary(item)
  map.set(logKey, item)
}

function addSkipped(
  map: Map<string, AggregatedLogItem>,
  base: Omit<
    AggregatedLogItem,
    | 'logKey'
    | 'summary'
    | 'ruleId'
    | 'ruleTitle'
    | 'keyword'
    | 'anchorText'
    | 'targetUrl'
    | 'insertedCount'
    | 'skippedCount'
    | 'skipReasons'
  >,
  skipped: InternalLinkSkippedItem,
): void {
  if (!skipped.keyword || !skipped.targetUrl) return

  const logKey = makeLogKey({
    sourceType: base.sourceType,
    sourceId: base.sourceId,
    ruleId: skipped.ruleId,
    keyword: skipped.keyword,
    targetUrl: skipped.targetUrl,
  })

  const existing = map.get(logKey)

  if (existing) {
    existing.skippedCount += 1
    existing.skipReasons.add(skipped.reason)
    existing.lastTextPreview =
      existing.lastTextPreview || skipped.textPreview
    return
  }

  const item: AggregatedLogItem = {
    ...base,
    logKey,
    summary: '',
    ruleId: skipped.ruleId,
    ruleTitle: skipped.ruleTitle,
    keyword: skipped.keyword,
    anchorText: skipped.anchorText,
    targetUrl: skipped.targetUrl,
    insertedCount: 0,
    skippedCount: 1,
    skipReasons: new Set([skipped.reason]),
    lastTextPreview: skipped.textPreview,
  }

  item.summary = makeSummary(item)
  map.set(logKey, item)
}

async function findExistingLog(payload: Payload, logKey: string) {
  const result = await payload.find({
    collection: 'internal-link-logs' as any,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: {
      logKey: {
        equals: logKey,
      },
    },
  })

  return result.docs[0] as
    | {
        id: string | number
        totalInsertedCount?: number | null
        previewCount?: number | null
      }
    | undefined
}

async function updateRuleCounters(
  payload: Payload,
  insertions: InternalLinkInsertion[],
  checkedAt: string,
): Promise<void> {
  const insertedByRule = new Map<string | number, number>()

  for (const insertion of insertions) {
    if (!insertion.ruleId) continue

    insertedByRule.set(
      insertion.ruleId,
      (insertedByRule.get(insertion.ruleId) || 0) + 1,
    )
  }

  for (const [ruleId, insertedCount] of insertedByRule) {
    const rule = (await payload.findByID({
      collection: 'internal-link-rules' as any,
      id: ruleId,
      depth: 0,
      overrideAccess: true,
    })) as {
      totalInsertions?: number | null
    }

    const currentTotal =
      typeof rule.totalInsertions === 'number' &&
      Number.isFinite(rule.totalInsertions)
        ? rule.totalInsertions
        : 0

    await payload.update({
      collection: 'internal-link-rules' as any,
      id: ruleId,
      depth: 0,
      overrideAccess: true,
      data: {
        totalInsertions: currentTotal + insertedCount,
        lastUsedAt: checkedAt,
      },
    })
  }
}

export async function recordInternalLinkPreview({
  payload,
  sourceType,
  sourceId,
  sourceTitle,
  sourceUrl,
  result,
}: RecordInternalLinkPreviewInput): Promise<{
  runId: string
  logsWritten: number
}> {
  const checkedAt = new Date().toISOString()
  const runId = `internal-links-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`

  const sourceIdText = String(sourceId)

  const base = {
    sourceType,
    sourceId: sourceIdText,
    sourceTitle,
    sourceUrl,
    lastTextPreview: undefined,
  }

  const aggregated = new Map<string, AggregatedLogItem>()

  for (const insertion of result.insertions) {
    addInsertion(aggregated, base, insertion)
  }

  for (const skipped of result.skipped) {
    addSkipped(aggregated, base, skipped)
  }

  let logsWritten = 0

  for (const item of aggregated.values()) {
    const existing = await findExistingLog(payload, item.logKey)
    const previousTotal =
      typeof existing?.totalInsertedCount === 'number' &&
      Number.isFinite(existing.totalInsertedCount)
        ? existing.totalInsertedCount
        : 0
    const previousPreviewCount =
      typeof existing?.previewCount === 'number' &&
      Number.isFinite(existing.previewCount)
        ? existing.previewCount
        : 0

    const data = {
      summary: item.summary,
      logKey: item.logKey,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      sourceTitle: item.sourceTitle || null,
      sourceUrl: item.sourceUrl,
      rule: item.ruleId || null,
      ruleTitle: item.ruleTitle || null,
      keyword: item.keyword,
      anchorText: item.anchorText || null,
      targetUrl: item.targetUrl,
      insertedCount: item.insertedCount,
      skippedCount: item.skippedCount,
      totalInsertedCount: previousTotal + item.insertedCount,
      previewCount: previousPreviewCount + 1,
      skipReasons: Array.from(item.skipReasons).join(', '),
      lastTextPreview: item.lastTextPreview || null,
      lastRunId: runId,
      lastCheckedAt: checkedAt,
    }

    if (existing) {
      await payload.update({
        collection: 'internal-link-logs' as any,
        id: existing.id,
        depth: 0,
        overrideAccess: true,
        data,
      })
    } else {
      await payload.create({
        collection: 'internal-link-logs' as any,
        depth: 0,
        overrideAccess: true,
        data,
      })
    }

    logsWritten += 1
  }

  await updateRuleCounters(payload, result.insertions, checkedAt)

  return {
    runId,
    logsWritten,
  }
}

