'use client'

import React, { useMemo, useState } from 'react'

type OnlyMode = 'all' | 'products' | 'posts' | 'brands' | 'categories' | 'post-categories'
type ExportFormat = 'xls' | 'csv'
type ExportProfile = 'full' | 'google-sheets'

type ImportResult = {
  dryRun: boolean
  fileName: string
  result: Record<
    string,
    {
      changed: number
      details: Array<{
        error?: string
        fields: string[]
        id: string
        status: 'changed' | 'updated' | 'skipped' | 'failed'
      }>
      failed: number
      mediaCreated?: number
      mediaDetected?: number
      mediaReused?: number
      scanned: number
      skipped: number
      updated: number
    }
  >
  success: boolean
}

const selectStyle: React.CSSProperties = {
  minWidth: 220,
  padding: 10,
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  minHeight: 42,
  padding: '10px 12px',
  width: '100%',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 20,
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',')
}

export function ContentExcelManager() {
  const [exportOnly, setExportOnly] = useState<OnlyMode>('all')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exportProfile, setExportProfile] = useState<ExportProfile>('full')
  const [includeContent, setIncludeContent] = useState(true)
  const [productIds, setProductIds] = useState('')
  const [productSlugs, setProductSlugs] = useState('')
  const [postIds, setPostIds] = useState('')
  const [postSlugs, setPostSlugs] = useState('')
  const [limit, setLimit] = useState('')
  const [importOnly, setImportOnly] = useState<OnlyMode>('all')
  const [dryRun, setDryRun] = useState(true)
  const [includeReadOnly, setIncludeReadOnly] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()

    params.set('only', exportOnly)
    params.set('format', exportFormat)
    params.set('profile', exportProfile)
    params.set('includeContent', includeContent ? 'true' : 'false')

    if (productIds.trim()) params.set('productIds', splitList(productIds))
    if (productSlugs.trim()) params.set('productSlugs', splitList(productSlugs))
    if (postIds.trim()) params.set('postIds', splitList(postIds))
    if (postSlugs.trim()) params.set('postSlugs', splitList(postSlugs))
    if (limit.trim()) params.set('limit', limit.trim())

    return `/api/admin/content-excel?${params.toString()}`
  }, [
    exportFormat,
    exportOnly,
    exportProfile,
    includeContent,
    limit,
    postIds,
    postSlugs,
    productIds,
    productSlugs,
  ])

  function downloadExcel() {
    window.location.href = exportUrl
  }

  async function importExcel() {
    if (!file) {
      setMessage('Bạn cần chọn file Excel trước.')
      return
    }

    setLoading(true)
    setMessage('')
    setImportResult(null)

    try {
      const formData = new FormData()

      formData.set('file', file)
      formData.set('only', importOnly)
      formData.set('format', file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xls')
      formData.set('dryRun', dryRun ? 'true' : 'false')
      formData.set('includeReadOnly', includeReadOnly ? 'true' : 'false')

      const res = await fetch('/api/admin/content-excel', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'Import failed')

      setImportResult(data)
      setMessage(
        dryRun
          ? 'Dry-run hoàn tất. Chưa ghi dữ liệu.'
          : 'Import hoàn tất. Dữ liệu đã được cập nhật.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể import Excel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 1180, padding: 32 }}>
      <h1 style={{ marginBottom: 8 }}>Xuất / nhập Excel nội dung</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Xuất sản phẩm và bài viết thành file Excel để chỉnh hàng loạt, sau đó upload lại để cập nhật
        Payload. Khi deploy, file xuất sẽ được tải trực tiếp về máy bạn, không cần lưu cố định trên
        server.
      </p>

      <div style={{ display: 'grid', gap: 20 }}>
        <section style={cardStyle}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Xuất Excel</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Loại dữ liệu</div>
              <select
                style={selectStyle}
                value={exportOnly}
                onChange={(event) => setExportOnly(event.target.value as OnlyMode)}
              >
                <option value="all">Tất cả sản phẩm, bài viết, thương hiệu, danh mục</option>
                <option value="products">Chỉ sản phẩm</option>
                <option value="posts">Chỉ bài viết</option>
                <option value="brands">Chỉ thương hiệu</option>
                <option value="categories">Chỉ danh mục sản phẩm</option>
                <option value="post-categories">Chỉ danh mục bài viết</option>
              </select>
            </label>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Dinh dang</div>
                <select
                  style={selectStyle}
                  value={exportFormat}
                  onChange={(event) => {
                    const nextFormat = event.target.value as ExportFormat

                    setExportFormat(nextFormat)
                    setExportProfile('full')
                    setIncludeContent(true)
                  }}
                >
                  <option value="csv">CSV day du</option>
                  <option value="xls">Excel day du</option>
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Ho so xuat</div>
                <select
                  style={selectStyle}
                  value={exportProfile}
                  onChange={(event) => setExportProfile(event.target.value as ExportProfile)}
                >
                  <option value="full">Day du tat ca field</option>
                  <option value="google-sheets">Google Sheets - cot hay sua</option>
                </select>
              </label>
            </div>

            <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
              <input
                checked={includeContent}
                type="checkbox"
                onChange={(event) => setIncludeContent(event.target.checked)}
              />
              Kem noi dung dai/HTML.
            </label>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Product IDs</div>
                <input
                  placeholder="VD: 1,2,3"
                  style={inputStyle}
                  value={productIds}
                  onChange={(event) => setProductIds(event.target.value)}
                />
              </label>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Product slugs</div>
                <input
                  placeholder="slug-1,slug-2"
                  style={inputStyle}
                  value={productSlugs}
                  onChange={(event) => setProductSlugs(event.target.value)}
                />
              </label>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Post IDs</div>
                <input
                  placeholder="VD: 10,11,12"
                  style={inputStyle}
                  value={postIds}
                  onChange={(event) => setPostIds(event.target.value)}
                />
              </label>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Post slugs</div>
                <input
                  placeholder="slug-bai-viet-1,slug-bai-viet-2"
                  style={inputStyle}
                  value={postSlugs}
                  onChange={(event) => setPostSlugs(event.target.value)}
                />
              </label>
            </div>

            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Giới hạn dòng</div>
              <input
                placeholder="Bỏ trống để xuất hết"
                style={{ ...inputStyle, maxWidth: 240 }}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </label>

            <div>
              <button type="button" onClick={downloadExcel}>
                {exportFormat === 'csv' ? 'Tai CSV day du' : 'Tai file Excel'}
              </button>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Nhập lại từ Excel</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Loại dữ liệu cần import</div>
              <select
                style={selectStyle}
                value={importOnly}
                onChange={(event) => setImportOnly(event.target.value as OnlyMode)}
              >
                <option value="all">Tất cả sản phẩm, bài viết, thương hiệu, danh mục</option>
                <option value="products">Chỉ sản phẩm</option>
                <option value="posts">Chỉ bài viết</option>
                <option value="brands">Chỉ thương hiệu</option>
                <option value="categories">Chỉ danh mục sản phẩm</option>
                <option value="post-categories">Chỉ danh mục bài viết</option>
              </select>
            </label>

            <input
              accept=".csv,.xls,.xml"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />

            <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
              <input checked={dryRun} type="checkbox" onChange={(event) => setDryRun(event.target.checked)} />
              Dry-run trước, chưa ghi dữ liệu
            </label>

            <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
              <input
                checked={includeReadOnly}
                type="checkbox"
                onChange={(event) => setIncludeReadOnly(event.target.checked)}
              />
              Cho phép import các trường thống kê/read-only
            </label>

            <div>
              <button disabled={loading} type="button" onClick={importExcel}>
                {loading ? 'Đang xử lý...' : dryRun ? 'Kiểm tra file' : 'Import thật'}
              </button>
            </div>
          </div>
        </section>

        {message ? <p style={{ color: message.includes('Không') ? '#b72828' : '#166534' }}>{message}</p> : null}

        {importResult ? (
          <section style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Kết quả import</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {Object.entries(importResult.result).map(([collection, result]) => (
                <div key={collection}>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>{collection}</h3>
                  <p style={{ color: '#555' }}>
                    Quét {result.scanned} dòng · thay đổi {result.changed} · cập nhật {result.updated} · bỏ qua{' '}
                    {result.skipped} · lỗi {result.failed} · ảnh phát hiện {result.mediaDetected || 0} · tạo media{' '}
                    {result.mediaCreated || 0} · dùng lại {result.mediaReused || 0}
                  </p>
                  {result.details.length > 0 ? (
                    <ul style={{ color: '#555', marginTop: 8 }}>
                      {result.details.slice(0, 20).map((detail, index) => (
                        <li key={`${collection}-${detail.id}-${index}`}>
                          #{detail.id}: {detail.status}
                          {detail.fields.length ? ` (${detail.fields.join(', ')})` : ''}
                          {detail.error ? ` - ${detail.error}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
