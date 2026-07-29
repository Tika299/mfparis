'use client'

import React, { useState } from 'react'
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
}

type Props = {
    collection: 'posts' | 'products' | 'categories' | 'brands' | 'post-categories'
}

export function InternalLinkPreview({ collection }: Props) {
    const { id } = useDocumentInfo()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<PreviewResult | null>(null)
    const [error, setError] = useState('')

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
        <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
            <button type="button" onClick={runPreview} disabled={loading || !id}>
                {loading ? 'Đang kiểm tra...' : 'Preview internal links'}
            </button>

            {error ? <p style={{ color: 'red' }}>{error}</p> : null}

            {result ? (
                <div style={{ marginTop: 16 }}>
                    <p>
                        Đã chèn: <strong>{result.stats.totalInserted}</strong> link.
                        Bỏ qua: <strong>{result.stats.totalSkipped}</strong>.
                    </p>

                    <h4>Link sẽ được chèn</h4>
                    <ul>
                        {result.insertions.map((item, index) => (
                            <li key={`${item.targetUrl}-${index}`}>
                                <strong>{item.anchorText}</strong> → {item.targetUrl}
                                {item.ruleTitle ? ` (${item.ruleTitle})` : ''}
                            </li>
                        ))}
                    </ul>

                    <h4>Bị bỏ qua</h4>
                    <ul>
                        {result.skipped.slice(0, 20).map((item, index) => (
                            <li key={index}>
                                {item.keyword || 'Không rõ keyword'} - {item.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}