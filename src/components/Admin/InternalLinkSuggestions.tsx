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

const sourceOptions: Array<{ label: string; value: SourceType }> = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Thương hiệu', value: 'brands' },
  { label: 'Danh mục sản phẩm', value: 'categories' },
  { label: 'Sản phẩm', value: 'products' },
  { label: 'Bài viết', value: 'posts' },
  { label: 'Danh mục bài viết', value: 'post-categories' },
]

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

  const allSuggestionIds = useMemo(() => suggestions.map((item) => item.id), [suggestions])
  const allSelected = suggestions.length > 0 && selectedIds.length === suggestions.length

  async function loadSuggestions() {
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch(`/api/internal-links/preview?sourceType=${sourceType}&limit=100`)
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'Load failed')

      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
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
      let createdCount = 0
      const batchSize = 50

      for (let index = 0; index < selectedSuggestions.length; index += batchSize) {
        const batch = selectedSuggestions.slice(index, index + batchSize)
        const res = await fetch('/api/internal-links/preview', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions: batch }),
        })

        const data = await res.json()

        if (!res.ok) throw new Error(data?.error || 'Create failed')

        createdCount += Number(data.createdCount || 0)
      }

      setMessage(`Đã tạo ${createdCount} rule. Rule mới đang tắt, bạn vào kiểm tra rồi bật.`)
      await loadSuggestions()
    } catch {
      setMessage('Không thể tạo rule từ gợi ý.')
    } finally {
      setCreating(false)
    }
  }

  function selectAllSuggestions() {
    setSelectedIds(allSuggestionIds)
  }

  function clearSelectedSuggestions() {
    setSelectedIds([])
  }

  function toggleSuggestion(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id]

      return current.filter((currentId) => currentId !== id)
    })
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

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <select
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as SourceType)}
          style={{ minWidth: 220, padding: 10 }}
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button type="button" onClick={loadSuggestions} disabled={loading}>
          {loading ? 'Đang quét...' : 'Quét gợi ý'}
        </button>

        <button
          type="button"
          onClick={selectAllSuggestions}
          disabled={loading || allSelected || suggestions.length === 0}
        >
          Chọn tất cả
        </button>

        <button
          type="button"
          onClick={clearSelectedSuggestions}
          disabled={loading || selectedIds.length === 0}
        >
          Bỏ chọn
        </button>

        <button
          type="button"
          onClick={createRules}
          disabled={creating || selectedSuggestions.length === 0}
        >
          {creating ? 'Đang tạo...' : `Tạo ${selectedSuggestions.length} rule`}
        </button>
      </div>

      {suggestions.length > 0 ? (
        <p style={{ color: '#666', marginBottom: 16 }}>
          Đã chọn {selectedSuggestions.length}/{suggestions.length} gợi ý. Khi tạo nhiều rule, hệ
          thống sẽ tự chia lô để tạo hết.
        </p>
      ) : null}

      {message ? <p style={{ color: '#b72828' }}>{message}</p> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {suggestions.map((item) => {
          const checked = selectedIds.includes(item.id)

          return (
            <label
              key={item.id}
              style={{
                background: checked ? '#fff7f7' : '#fff',
                border: '1px solid #ddd',
                borderRadius: 8,
                display: 'grid',
                gap: 12,
                gridTemplateColumns: '24px 1fr',
                padding: 16,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => toggleSuggestion(item.id, event.target.checked)}
              />

              <div>
                <div style={{ fontWeight: 700 }}>{item.sourceTitle}</div>
                <div style={{ color: '#666', marginTop: 4 }}>{item.targetUrl}</div>

                <div style={{ marginTop: 10 }}>
                  {item.keywords.map((keyword) => (
                    <span
                      key={keyword.keyword}
                      style={{
                        background: '#f3f4f6',
                        borderRadius: 999,
                        display: 'inline-block',
                        fontSize: 12,
                        marginBottom: 8,
                        marginRight: 8,
                        padding: '4px 8px',
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
