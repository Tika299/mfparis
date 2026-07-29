'use client'

import React, { useEffect, useMemo, useState } from 'react'

type SourceType = 'all' | 'brands' | 'categories' | 'products' | 'posts' | 'post-categories'

type Suggestion = {
    id: string
    sourceType: string
    sourceId: string | number
    sourceTitle: string
    targetUrl: string
    priority: string
    keywords: Array<{
        keyword: string
        matchType: 'contains' | 'phrase'
        weight: number
    }>
    score: number
    reason: string
    exists: boolean
}

export function InternalLinkSuggestions() {
    const [sourceType, setSourceType] = useState<SourceType>('all')
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [message, setMessage] = useState('')

    const selectedSuggestions = useMemo(
        () => suggestions.filter((item) => selectedIds.includes(item.id)),
        [suggestions, selectedIds],
    )

    async function loadSuggestions() {
        setLoading(true)
        setMessage('')

        try {
            const res = await fetch(
                `/api/internal-links/preview?sourceType=${sourceType}&limit=100`,
            )
            const data = await res.json()

            if (!res.ok) throw new Error(data?.error || 'Load failed')

            setSuggestions(data.suggestions || [])
            setSelectedIds([])
        } catch {
            setMessage('Không thể tải gợi ý internal link.')
        } finally {
            setLoading(false)
        }
    }

    async function createRules() {
        if (selectedSuggestions.length === 0) return

        setCreating(true)
        setMessage('')

        try {
            const res = await fetch('/api/internal-links/preview', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suggestions: selectedSuggestions }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data?.error || 'Create failed')

            setMessage(`Đã tạo ${data.createdCount} rule. Rule mới đang tắt, bạn vào kiểm tra rồi bật.`)
            await loadSuggestions()
        } catch {
            setMessage('Không thể tạo rule từ gợi ý.')
        } finally {
            setCreating(false)
        }
    }

    useEffect(() => {
        void loadSuggestions()
    }, [])

    return (
        <main style={{ padding: 32, maxWidth: 1200 }}>
            <h1 style={{ marginBottom: 8 }}>Internal Link Suggestions</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Hệ thống tự gợi ý keyword và URL đích từ sản phẩm, thương hiệu, danh mục và bài viết.
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <select
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value as SourceType)}
                    style={{ padding: 10, minWidth: 220 }}
                >
                    <option value="all">Tất cả</option>
                    <option value="brands">Thương hiệu</option>
                    <option value="categories">Danh mục sản phẩm</option>
                    <option value="products">Sản phẩm</option>
                    <option value="posts">Bài viết</option>
                    <option value="post-categories">Danh mục bài viết</option>
                </select>

                <button type="button" onClick={loadSuggestions} disabled={loading}>
                    {loading ? 'Đang quét...' : 'Quét gợi ý'}
                </button>

                <button
                    type="button"
                    onClick={createRules}
                    disabled={creating || selectedSuggestions.length === 0}
                >
                    {creating ? 'Đang tạo...' : `Tạo ${selectedSuggestions.length} rule`}
                </button>
            </div>

            {message ? <p style={{ color: '#b72828' }}>{message}</p> : null}

            <div style={{ display: 'grid', gap: 12 }}>
                {suggestions.map((item) => {
                    const checked = selectedIds.includes(item.id)

                    return (
                        <label
                            key={item.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '24px 1fr',
                                gap: 12,
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: 16,
                                background: checked ? '#fff7f7' : '#fff',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                    setSelectedIds((current) =>
                                        event.target.checked
                                            ? [...current, item.id]
                                            : current.filter((id) => id !== item.id),
                                    )
                                }}
                            />

                            <div>
                                <div style={{ fontWeight: 700 }}>{item.sourceTitle}</div>
                                <div style={{ color: '#666', marginTop: 4 }}>{item.targetUrl}</div>

                                <div style={{ marginTop: 10 }}>
                                    {item.keywords.map((keyword) => (
                                        <span
                                            key={keyword.keyword}
                                            style={{
                                                display: 'inline-block',
                                                marginRight: 8,
                                                marginBottom: 8,
                                                padding: '4px 8px',
                                                borderRadius: 999,
                                                background: '#f3f4f6',
                                                fontSize: 12,
                                            }}
                                        >
                                            {keyword.keyword}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ color: '#777', fontSize: 13 }}>
                                    {item.sourceType} · priority: {item.priority} · score: {item.score}
                                </div>
                            </div>
                        </label>
                    )
                })}
            </div>
        </main>
    )
}