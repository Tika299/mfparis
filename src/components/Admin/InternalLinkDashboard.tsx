'use client'

import { useAuth } from '@payloadcms/ui'
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { AdminAuthRequired } from './AdminAuthRequired'

type SourceType = 'brands' | 'categories' | 'posts' | 'products'
type ResultMode = 'inserted' | 'issues' | 'pages' | 'skipped'
type ReviewStatus = 'dismissed' | 'new' | 'resolved' | 'reviewed'

type ScanRun = {
  id: number
  status: 'cancelled' | 'completed' | 'failed' | 'running'
  sourceTypes: SourceType[]
  currentSourceTypeIndex?: number | null
  currentPage?: number | null
  pagesScanned?: number | null
  fieldsScanned?: number | null
  candidateLinks?: number | null
  insertedCandidates?: number | null
  skippedCandidates?: number | null
  issueCount?: number | null
  startedAt: string
  finishedAt?: string | null
  errorMessage?: string | null
}

type ScanResult = {
  id: number
  rowType: 'inserted' | 'page' | 'skipped'
  sourceType: SourceType
  sourceId: string
  sourceTitle?: string | null
  sourceUrl: string
  sourceField: string
  sourceFieldLabel?: string | null
  wordCount?: number | null
  linkCount?: number | null
  linksPerHundredWords?: number | null
  rule?: number | { id: number; title?: string | null } | null
  ruleTitle?: string | null
  keyword?: string | null
  anchorText?: string | null
  targetUrl?: string | null
  contextExcerpt?: string | null
  skipReason?: string | null
  issueFlags?: unknown
  reviewStatus?: ReviewStatus | null
}

type Pagination = {
  page: number
  totalPages: number
  totalDocs: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const sourceOptions: Array<{ label: string; value: SourceType }> = [
  { label: 'Bài viết', value: 'posts' },
  { label: 'Sản phẩm', value: 'products' },
  { label: 'Danh mục sản phẩm', value: 'categories' },
  { label: 'Thương hiệu', value: 'brands' },
]

const modeOptions: Array<{ label: string; value: ResultMode }> = [
  { label: 'Trang đã quét', value: 'pages' },
  { label: 'Cảnh báo', value: 'issues' },
  { label: 'Link dự kiến', value: 'inserted' },
  { label: 'Match bị bỏ qua', value: 'skipped' },
]

const statusLabels: Record<ScanRun['status'], string> = {
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  running: 'Đang chạy',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
  padding: 18,
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid #d0d5dd',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 650,
  padding: '9px 14px',
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function getIssueFlags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function getRuleId(rule: ScanResult['rule']) {
  if (typeof rule === 'number') return rule
  if (rule && typeof rule === 'object') return rule.id
  return null
}

async function readJson(response: Response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || 'Yêu cầu không thành công.')
  }

  return data
}

export function InternalLinkDashboard() {
  const { user } = useAuth()
  const didInitialLoadRef = useRef(false)
  const stopAfterBatchRef = useRef(false)
  const [run, setRun] = useState<ScanRun | null>(null)
  const [results, setResults] = useState<ScanResult[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    totalDocs: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([
    'posts',
  ])
  const [batchSize, setBatchSize] = useState(5)
  const [mode, setMode] = useState<ResultMode>('pages')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [expandedSourceKey, setExpandedSourceKey] = useState<string | null>(null)
  const [expandedLinks, setExpandedLinks] = useState<Record<string, ScanResult[]>>({})
  const [loadingSourceKey, setLoadingSourceKey] = useState<string | null>(null)

  const activeSourceLabel = useMemo(() => {
    if (!run || run.status !== 'running') return null

    const sourceType = run.sourceTypes[run.currentSourceTypeIndex || 0]

    return sourceOptions.find((item) => item.value === sourceType)?.label || sourceType
  }, [run])

  const loadResults = useCallback(async (runId: number, requestedPage = 1) => {
    const params = new URLSearchParams({
      runId: String(runId),
      mode,
      page: String(requestedPage),
      limit: '25',
    })

    if (sourceFilter !== 'all') params.set('sourceType', sourceFilter)
    if (reviewFilter !== 'all') params.set('reviewStatus', reviewFilter)
    if (search.trim()) params.set('search', search.trim())

    const data = await readJson(
      await fetch(`/api/internal-links/scan?${params.toString()}`, {
        cache: 'no-store',
      }),
    )

    setRun(data.run)
    setResults(Array.isArray(data.results) ? data.results : [])
    setPagination(data.pagination)
  }, [mode, reviewFilter, search, sourceFilter])

  const loadLatestRun = useCallback(async () => {
    setLoading(true)

    try {
      const data = await readJson(
        await fetch('/api/internal-links/scan', { cache: 'no-store' }),
      )
      const latestRun = data.run as ScanRun | null

      setRun(latestRun)
      if (latestRun) await loadResults(latestRun.id)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải dashboard.')
    } finally {
      setLoading(false)
    }
  }, [loadResults])

  async function postAction(body: Record<string, unknown>) {
    return readJson(
      await fetch('/api/internal-links/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }

  async function runUntilStopped(initialRun: ScanRun) {
    let currentRun = initialRun

    stopAfterBatchRef.current = false
    setScanning(true)

    try {
      while (currentRun.status === 'running' && !stopAfterBatchRef.current) {
        const data = await postAction({
          action: 'batch',
          batchSize,
          runId: currentRun.id,
        })

        currentRun = data.run
        setRun(currentRun)
      }

      if (stopAfterBatchRef.current && currentRun.status === 'running') {
        const data = await postAction({
          action: 'cancel',
          runId: currentRun.id,
        })

        currentRun = data.run
        setRun(currentRun)
      }

      await loadResults(currentRun.id)
      setMessage(
        currentRun.status === 'completed'
          ? 'Lần quét đã hoàn tất.'
          : currentRun.status === 'cancelled'
            ? 'Đã dừng sau batch hiện tại.'
            : '',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lần quét gặp lỗi.')
      await loadLatestRun()
    } finally {
      setScanning(false)
    }
  }

  async function startScan() {
    if (!selectedSources.length) {
      setMessage('Hãy chọn ít nhất một loại nội dung.')
      return
    }

    setMessage('')

    try {
      const data = await postAction({
        action: 'start',
        sourceTypes: selectedSources,
      })

      setRun(data.run)
      await runUntilStopped(data.run)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể bắt đầu quét.')
    }
  }

  async function resumeScan() {
    if (!run) return

    setMessage('')

    try {
      const data = await postAction({ action: 'resume', runId: run.id })

      setRun(data.run)
      await runUntilStopped(data.run)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tiếp tục quét.')
    }
  }

  async function stopScan() {
    if (!run) return

    if (scanning) {
      stopAfterBatchRef.current = true
      setMessage('Sẽ dừng sau khi batch hiện tại hoàn tất.')
      return
    }

    try {
      const data = await postAction({ action: 'cancel', runId: run.id })
      setRun(data.run)
      setMessage('Đã hủy lần quét.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy lần quét.')
    }
  }

  async function updateReview(resultId: number, reviewStatus: ReviewStatus) {
    try {
      await postAction({ action: 'review', resultId, reviewStatus })
      if (run) await loadResults(run.id, pagination.page)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật review.')
    }
  }

  async function togglePageLinks(result: ScanResult) {
    const sourceKey = `${result.sourceType}:${result.sourceId}`

    if (expandedSourceKey === sourceKey) {
      setExpandedSourceKey(null)
      return
    }

    setExpandedSourceKey(sourceKey)

    if (expandedLinks[sourceKey] || !run) return

    setLoadingSourceKey(sourceKey)

    try {
      const params = new URLSearchParams({
        runId: String(run.id),
        mode: 'inserted',
        sourceType: result.sourceType,
        sourceId: result.sourceId,
        limit: '100',
      })
      const data = await readJson(
        await fetch(`/api/internal-links/scan?${params.toString()}`, {
          cache: 'no-store',
        }),
      )

      setExpandedLinks((current) => ({
        ...current,
        [sourceKey]: Array.isArray(data.results) ? data.results : [],
      }))
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể tải link của trang này.',
      )
    } finally {
      setLoadingSourceKey(null)
    }
  }

  function toggleSource(sourceType: SourceType, checked: boolean) {
    setSelectedSources((current) =>
      checked
        ? Array.from(new Set([...current, sourceType]))
        : current.filter((item) => item !== sourceType),
    )
  }

  useEffect(() => {
    if (!user) {
      didInitialLoadRef.current = false
      return
    }

    if (didInitialLoadRef.current) return
    didInitialLoadRef.current = true

    const timer = window.setTimeout(() => {
      void loadLatestRun()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadLatestRun, user])

  return (
    <AdminAuthRequired description="Bạn cần đăng nhập admin để quét và xem báo cáo internal link.">
      <main style={{ maxWidth: 1440, padding: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Internal Link Dashboard</h1>
        <p style={{ color: '#667085', marginBottom: 24 }}>
          Kết quả là link dự kiến được render theo nội dung và rule tại thời điểm quét,
          không phải lượt xem hoặc lượt click.
        </p>

        <section style={{ ...cardStyle, marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {sourceOptions.map((option) => (
              <label key={option.value} style={{ display: 'flex', gap: 7 }}>
                <input
                  checked={selectedSources.includes(option.value)}
                  disabled={scanning}
                  type="checkbox"
                  onChange={(event) =>
                    toggleSource(option.value, event.target.checked)
                  }
                />
                {option.label}
              </label>
            ))}

            <label style={{ display: 'flex', gap: 8 }}>
              Batch
              <select
                disabled={scanning}
                value={batchSize}
                onChange={(event) => setBatchSize(Number(event.target.value))}
              >
                {[3, 5, 10, 20].map((value) => (
                  <option key={value} value={value}>{value} trang</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            <button
              disabled={scanning || run?.status === 'running'}
              style={{ ...buttonStyle, background: '#b42318', color: '#fff' }}
              type="button"
              onClick={startScan}
            >
              {scanning ? 'Đang quét…' : 'Bắt đầu lần quét mới'}
            </button>

            {run && (run.status === 'failed' || run.status === 'cancelled') ? (
              <button style={buttonStyle} type="button" onClick={resumeScan}>
                Tiếp tục lần quét #{run.id}
              </button>
            ) : null}

            {run?.status === 'running' ? (
              <button style={buttonStyle} type="button" onClick={stopScan}>
                {scanning ? 'Dừng sau batch' : 'Hủy lần quét'}
              </button>
            ) : null}

            <button disabled={loading || scanning} style={buttonStyle} type="button" onClick={loadLatestRun}>
              Làm mới
            </button>
          </div>

          {message ? (
            <p style={{ color: message.includes('lỗi') || message.includes('Không') ? '#b42318' : '#067647', marginBottom: 0, marginTop: 14 }}>
              {message}
            </p>
          ) : null}
        </section>

        {run ? (
          <>
            <section style={{ ...cardStyle, marginBottom: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between' }}>
                <div>
                  <strong>Lần quét #{run.id}</strong>
                  <div style={{ color: '#667085', marginTop: 4 }}>
                    {statusLabels[run.status]}
                    {activeSourceLabel ? ` · ${activeSourceLabel}, trang batch ${run.currentPage || 1}` : ''}
                  </div>
                </div>
                <div style={{ color: '#667085' }}>
                  Bắt đầu {formatDate(run.startedAt)} · Kết thúc {formatDate(run.finishedAt)}
                </div>
              </div>
              {run.errorMessage ? (
                <p style={{ color: '#b42318', marginBottom: 0 }}>{run.errorMessage}</p>
              ) : null}
            </section>

            <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 18 }}>
              {[
                ['Trang đã quét', run.pagesScanned || 0],
                ['Field đã quét', run.fieldsScanned || 0],
                ['Link dự kiến', run.insertedCandidates || 0],
                ['Match bỏ qua', run.skippedCandidates || 0],
                ['Cảnh báo', run.issueCount || 0],
              ].map(([label, value]) => (
                <div key={label} style={cardStyle}>
                  <div style={{ color: '#667085', fontSize: 13 }}>{label}</div>
                  <strong style={{ display: 'block', fontSize: 26, marginTop: 6 }}>{value}</strong>
                </div>
              ))}
            </section>

            <section style={{ ...cardStyle, marginBottom: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <select value={mode} onChange={(event) => setMode(event.target.value as ResultMode)}>
                  {modeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="all">Tất cả loại nội dung</option>
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}>
                  <option value="all">Tất cả review</option>
                  <option value="new">Mới</option>
                  <option value="reviewed">Đã xem</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="dismissed">Bỏ qua</option>
                </select>
                <input
                  placeholder="Tìm nguồn, anchor hoặc URL…"
                  style={{ minWidth: 280, padding: '8px 10px' }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void loadResults(run.id)
                  }}
                />
                <button style={buttonStyle} type="button" onClick={() => loadResults(run.id)}>
                  Lọc
                </button>
              </div>
            </section>

            <section style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 1050, width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    {['Nguồn', 'Loại / field', mode === 'pages' ? 'Mật độ' : 'Anchor / lý do', 'Đích / cảnh báo', 'Review', 'Thao tác'].map((heading) => (
                      <th key={heading} style={{ borderBottom: '1px solid #e5e7eb', padding: 12 }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const flags = getIssueFlags(result.issueFlags)
                    const ruleId = getRuleId(result.rule)
                    const sourceKey = `${result.sourceType}:${result.sourceId}`
                    const isExpanded = expandedSourceKey === sourceKey
                    const pageLinks = expandedLinks[sourceKey] || []

                    return (
                      <React.Fragment key={result.id}>
                        <tr>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            <strong>{result.sourceTitle || `#${result.sourceId}`}</strong>
                            <div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>{result.sourceUrl}</div>
                            {result.contextExcerpt ? (
                              <div style={{ color: '#475467', fontSize: 12, marginTop: 8, maxWidth: 360 }}>{result.contextExcerpt}</div>
                            ) : null}
                          </td>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            {result.sourceType}<br />
                            <span style={{ color: '#667085', fontSize: 12 }}>{result.sourceFieldLabel || result.sourceField}</span>
                          </td>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            {mode === 'pages' ? (
                              <>
                                <strong>{result.linkCount || 0} link</strong>
                                <div>{result.wordCount || 0} từ</div>
                                <div>{result.linksPerHundredWords || 0} link / 100 từ</div>
                              </>
                            ) : (
                              <>
                                <strong>{result.anchorText || result.keyword || '—'}</strong>
                                <div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>{result.skipReason || result.rowType}</div>
                              </>
                            )}
                          </td>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            <div>{result.targetUrl || '—'}</div>
                            {flags.map((flag) => (
                              <span key={flag} style={{ background: '#fef3f2', borderRadius: 999, color: '#b42318', display: 'inline-block', fontSize: 11, marginRight: 5, marginTop: 6, padding: '3px 7px' }}>
                                {flag}
                              </span>
                            ))}
                          </td>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            {result.reviewStatus || '—'}
                          </td>
                          <td style={{ borderBottom: '1px solid #eef2f6', padding: 12, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {mode === 'pages' ? (
                                <button
                                  disabled={!result.linkCount}
                                  type="button"
                                  onClick={() => togglePageLinks(result)}
                                >
                                  {loadingSourceKey === sourceKey
                                    ? 'Đang tải…'
                                    : isExpanded
                                      ? 'Ẩn link'
                                      : `Xem ${result.linkCount || 0} link`}
                                </button>
                              ) : null}
                              <a href={result.sourceUrl} rel="noreferrer" target="_blank">Frontend</a>
                              <a href={`/admin/collections/${result.sourceType}/${result.sourceId}`}>Sửa nguồn</a>
                              {ruleId ? <a href={`/admin/collections/internal-link-rules/${ruleId}`}>Mở rule</a> : null}
                              {mode !== 'pages' ? (
                                <>
                                  <button type="button" onClick={() => updateReview(result.id, 'reviewed')}>Đã xem</button>
                                  <button type="button" onClick={() => updateReview(result.id, 'dismissed')}>Bỏ qua</button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        {mode === 'pages' && isExpanded ? (
                          <tr>
                            <td colSpan={6} style={{ background: '#f8fafc', borderBottom: '1px solid #d0d5dd', padding: 16 }}>
                              <div style={{ fontWeight: 700, marginBottom: 10 }}>
                                Các link dự kiến trên “{result.sourceTitle || result.sourceUrl}”
                              </div>
                              {loadingSourceKey === sourceKey ? (
                                <div style={{ color: '#667085' }}>Đang tải chi tiết link…</div>
                              ) : pageLinks.length ? (
                                <div style={{ display: 'grid', gap: 10 }}>
                                  {pageLinks.map((link, index) => {
                                    const nestedRuleId = getRuleId(link.rule)

                                    return (
                                      <div key={link.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                                        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                          <strong>{index + 1}. “{link.anchorText || link.keyword || 'Không rõ anchor'}”</strong>
                                          <span aria-hidden="true">→</span>
                                          <a href={link.targetUrl || '#'} rel="noreferrer" target="_blank">
                                            {link.targetUrl || 'Không có URL đích'}
                                          </a>
                                          {nestedRuleId ? (
                                            <a href={`/admin/collections/internal-link-rules/${nestedRuleId}`}>
                                              Mở rule
                                            </a>
                                          ) : null}
                                        </div>
                                        <div style={{ color: '#667085', fontSize: 12, marginTop: 5 }}>
                                          Field: {link.sourceFieldLabel || link.sourceField}
                                          {link.ruleTitle ? ` · Rule: ${link.ruleTitle}` : ''}
                                        </div>
                                        {link.contextExcerpt ? (
                                          <div style={{ color: '#344054', fontSize: 13, lineHeight: 1.55, marginTop: 8 }}>
                                            “…{link.contextExcerpt.replace(/^…|…$/gu, '')}…”
                                          </div>
                                        ) : null}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div style={{ color: '#667085' }}>Trang này không có link dự kiến.</div>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                  {!results.length ? (
                    <tr>
                      <td colSpan={6} style={{ color: '#667085', padding: 24, textAlign: 'center' }}>
                        Chưa có dữ liệu phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            <div style={{ alignItems: 'center', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <span>{pagination.totalDocs} kết quả · trang {pagination.page}/{Math.max(1, pagination.totalPages)}</span>
              <button disabled={!pagination.hasPrevPage} style={buttonStyle} type="button" onClick={() => loadResults(run.id, pagination.page - 1)}>Trước</button>
              <button disabled={!pagination.hasNextPage} style={buttonStyle} type="button" onClick={() => loadResults(run.id, pagination.page + 1)}>Sau</button>
            </div>
          </>
        ) : (
          <section style={cardStyle}>Chưa có lần quét nào.</section>
        )}
      </main>
    </AdminAuthRequired>
  )
}
