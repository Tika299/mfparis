'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Eye, FileSearch, Link2, Loader2 } from 'lucide-react'
import { useDocumentInfo } from '@payloadcms/ui'

type PreviewResult = {
    html: string
    insertions: Array<{
        keyword: string
        anchorText: string
        targetUrl: string
        ruleId?: string | number
        ruleTitle?: string
    }>
    skipped: Array<{
        keyword?: string
        targetUrl?: string
        reason: string
        textPreview?: string
    }>
    stats: {
        totalInserted: number
        totalSkipped: number
        rulesMatched: number
        uniqueTargetUrls: number
    }
    log?: {
        runId: string
        logsWritten: number
    }
}

type Props = {
    collection: 'posts' | 'products' | 'categories' | 'brands' | 'post-categories'
}

const reasonLabels: Record<string, string> = {
    self_link: 'Trùng URL hiện tại',
    existing_link: 'Đã nằm trong link',
    heading: 'Nằm trong heading',
    blocked_tag: 'Nằm trong thẻ bị chặn',
    max_links_reached: 'Đạt giới hạn link',
    max_target_reached: 'Đạt giới hạn URL đích',
    max_anchor_reached: 'Đạt giới hạn anchor',
    duplicate_paragraph: 'Đoạn đã có link',
    disabled: 'Đang tắt',
    preview_only: 'Chỉ preview',
    no_rules: 'Không có rule',
    empty_html: 'Nội dung trống',
    excluded_keyword: 'Keyword bị loại trừ',
}

function badgeStyle(kind: 'good' | 'warn' | 'muted'): React.CSSProperties {
    const styles = {
        good: {
            background: '#ecfdf3',
            color: '#027a48',
            borderColor: '#abefc6',
        },
        warn: {
            background: '#fff7ed',
            color: '#c2410c',
            borderColor: '#fed7aa',
        },
        muted: {
            background: '#f8fafc',
            color: '#475569',
            borderColor: '#e2e8f0',
        },
    }

    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: `1px solid ${styles[kind].borderColor}`,
        borderRadius: 999,
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...styles[kind],
    }
}

function cardStyle(): React.CSSProperties {
    return {
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        background: '#fff',
        padding: 14,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    }
}

function shortText(value: string | undefined, maxLength = 130) {
    if (!value) return ''
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

export function InternalLinkPreview({ collection }: Props) {
    const { id } = useDocumentInfo()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<PreviewResult | null>(null)
    const [error, setError] = useState('')

    const skippedByReason = useMemo(() => {
        const counts = new Map<string, number>()

        for (const item of result?.skipped || []) {
            counts.set(item.reason, (counts.get(item.reason) || 0) + 1)
        }

        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    }, [result])

    async function runPreview() {
        if (!id) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/internal-links/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection, id }),
            })

            if (!res.ok) {
                throw new Error('Preview failed')
            }

            const data = (await res.json()) as PreviewResult
            setResult(data)
        } catch {
            setError('Không thể preview internal link.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section style={{ ...cardStyle(), padding: 18 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileSearch size={18} />
                        <strong style={{ fontSize: 15 }}>Internal link preview</strong>
                    </div>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                        Kiểm tra link sẽ được tự động chèn vào nội dung này. Preview có ghi log để audit SEO.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={runPreview}
                    disabled={loading || !id}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 0,
                        borderRadius: 999,
                        background: loading || !id ? '#e5e7eb' : '#b72828',
                        color: loading || !id ? '#64748b' : '#fff',
                        padding: '10px 14px',
                        fontWeight: 800,
                        cursor: loading || !id ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={16} />}
                    {loading ? 'Đang kiểm tra...' : 'Preview internal links'}
                </button>
            </div>

            {error ? (
                <div
                    style={{
                        marginTop: 14,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}
                >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            ) : null}

            {result ? (
                <div style={{ marginTop: 18 }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 10,
                            marginBottom: 16,
                        }}
                    >
                        <div style={cardStyle()}>
                            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Đã chèn</div>
                            <div style={{ marginTop: 5, fontSize: 24, fontWeight: 900, color: '#027a48' }}>
                                {result.stats.totalInserted}
                            </div>
                        </div>

                        <div style={cardStyle()}>
                            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Bỏ qua</div>
                            <div style={{ marginTop: 5, fontSize: 24, fontWeight: 900, color: '#c2410c' }}>
                                {result.stats.totalSkipped}
                            </div>
                        </div>

                        <div style={cardStyle()}>
                            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Rule match</div>
                            <div style={{ marginTop: 5, fontSize: 24, fontWeight: 900 }}>
                                {result.stats.rulesMatched}
                            </div>
                        </div>

                        <div style={cardStyle()}>
                            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>URL đích</div>
                            <div style={{ marginTop: 5, fontSize: 24, fontWeight: 900 }}>
                                {result.stats.uniqueTargetUrls}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {result.log ? (
                            <span style={badgeStyle('good')}>
                                <CheckCircle2 size={14} />
                                Đã ghi {result.log.logsWritten} log
                            </span>
                        ) : (
                            <span style={badgeStyle('muted')}>Chưa có log</span>
                        )}

                        <Link href="/admin/collections/internal-link-logs" style={{ ...badgeStyle('muted'), textDecoration: 'none' }}>
                            Mở Internal Link Logs
                        </Link>
                    </div>

                    <div style={{ display: 'grid', gap: 16 }}>
                        <div style={cardStyle()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <Link2 size={16} />
                                <strong>Link sẽ được chèn</strong>
                            </div>

                            {result.insertions.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', color: '#475569' }}>
                                                <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Anchor</th>
                                                <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Keyword</th>
                                                <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>URL đích</th>
                                                <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' }}>Rule</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.insertions.map((item, index) => (
                                                <tr key={`${item.targetUrl}-${item.keyword}-${index}`}>
                                                    <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>
                                                        {item.anchorText}
                                                    </td>
                                                    <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>{item.keyword}</td>
                                                    <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                                                        <a href={item.targetUrl} target="_blank" rel="noreferrer">
                                                            {item.targetUrl}
                                                        </a>
                                                    </td>
                                                    <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                                                        {item.ruleId ? (
                                                            <a href={`/admin/collections/internal-link-rules/${item.ruleId}`}>
                                                                {item.ruleTitle || `Rule #${item.ruleId}`}
                                                            </a>
                                                        ) : (
                                                            item.ruleTitle || 'Không rõ'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: '#64748b' }}>Chưa có link nào được chèn.</p>
                            )}
                        </div>

                        <div style={cardStyle()}>
                            <strong>Bị bỏ qua</strong>

                            {skippedByReason.length > 0 ? (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                    {skippedByReason.map(([reason, count]) => (
                                        <span key={reason} style={badgeStyle('warn')}>
                                            {reasonLabels[reason] || reason}: {count}
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {result.skipped.length > 0 ? (
                                <ul style={{ margin: '14px 0 0', paddingLeft: 18, color: '#475569', lineHeight: 1.6 }}>
                                    {result.skipped.slice(0, 20).map((item, index) => (
                                        <li key={`${item.reason}-${item.keyword}-${index}`}>
                                            <strong>{item.keyword || 'Không rõ keyword'}</strong> -{' '}
                                            {reasonLabels[item.reason] || item.reason}
                                            {item.targetUrl ? ` - ${item.targetUrl}` : ''}
                                            {item.textPreview ? (
                                                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                                                    {shortText(item.textPreview)}
                                                </div>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ margin: '10px 0 0', color: '#64748b' }}>Không có mục bị bỏ qua.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    )
}