'use client'

import { useAuth } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

import { AdminAuthRequired } from './AdminAuthRequired'

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

const limitOptions = [100, 250, 500, 1000, 2000]

export function InternalLinkSuggestions() {
  const { user } = useAuth()
  const [sourceType, setSourceType] = useState<SourceType>('all')
  const [limit, setLimit] = useState(500)
  const [includeExisting, setIncludeExisting] = useState(false)
  const [enableOnCreate, setEnableOnCreate] = useState(false)
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
      const params = new URLSearchParams({
        sourceType,
        limit: String(limit),
        includeExisting: includeExisting ? 'true' : 'false',
      })
      const res = await fetch('/api/internal-links/preview?' + params.toString())
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
          body: JSON.stringify({ suggestions: batch, enabled: enableOnCreate }),
        })

        const data = await res.json()

        if (!res.ok) throw new Error(data?.error || 'Create failed')

        createdCount += Number(data.createdCount || 0)
      }

      setMessage(
        enableOnCreate
          ? 'Đã tạo và bật ' + createdCount + ' rule.'
          : 'Đã tạo ' + createdCount + ' rule. Rule mới đang tắt để bạn kiểm tra trước khi bật.',
      )
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
    if (!user) return

    void loadSuggestions()
  }, [user])

  return (
    <AdminAuthRequired description="Bạn cần đăng nhập admin để quét gợi ý và tạo rule internal link.">
      <main style={{ padding: 32, maxWidth: 1240 }}>
      <h1 style={{ marginBottom: 8 }}>Internal Link Suggestions</h1>
      <p style={{ color: '#667085', marginBottom: 24 }}>
        Tự gợi ý keyword và URL đích từ sản phẩm, thương hiệu, danh mục và bài viết. Dùng để tạo rule nhanh giống plugin internal link của WordPress.
      </p>

      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          marginBottom: 18,
          padding: 16,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
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

          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            style={{ minWidth: 150, padding: 10 }}
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                Quét tối đa {option}
              </option>
            ))}
          </select>

          <label style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
            <input
              type="checkbox"
              checked={includeExisting}
              onChange={(event) => setIncludeExisting(event.target.checked)}
            />
            Hiện rule đã có
          </label>

          <label style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
            <input
              type="checkbox"
              checked={enableOnCreate}
              onChange={(event) => setEnableOnCreate(event.target.checked)}
            />
            Bật rule sau khi tạo
          </label>

          <button type="button" onClick={loadSuggestions} disabled={loading}>
            {loading ? 'Đang quét...' : 'Quét gợi ý'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
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
            style={{
              background: '#b72828',
              border: '1px solid #b72828',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 700,
              padding: '9px 14px',
            }}
          >
            {creating ? 'Đang tạo...' : 'Tạo ' + selectedSuggestions.length + ' rule'}
          </button>
        </div>
      </section>

      {suggestions.length > 0 ? (
        <p style={{ color: '#667085', marginBottom: 16 }}>
          Đã chọn {selectedSuggestions.length}/{suggestions.length} gợi ý. Khi tạo nhiều rule, hệ thống tự chia lô để không quá tải.
        </p>
      ) : null}

      {message ? <p style={{ color: message.startsWith('Đã') ? '#067647' : '#b72828' }}>{message}</p> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {suggestions.map((item) => {
          const checked = selectedIds.includes(item.id)

          return (
            <label
              key={item.id}
              style={{
                background: checked ? '#fff7f7' : '#fff',
                border: checked ? '1px solid #d14343' : '1px solid #e5e7eb',
                borderRadius: 10,
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
                <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <strong>{item.sourceTitle}</strong>
                  {item.exists ? (
                    <span style={{ background: '#eef4ff', borderRadius: 999, color: '#3538cd', fontSize: 12, padding: '3px 8px' }}>
                      Đã có rule
                    </span>
                  ) : null}
                </div>
                <div style={{ color: '#475467', marginTop: 4 }}>{item.targetUrl}</div>

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
                  {item.sourceType} · priority: {item.priority} · score: {item.score} · {item.reason}
                </div>
              </div>
            </label>
          )
        })}
      </div>
      </main>
    </AdminAuthRequired>
  )
}
