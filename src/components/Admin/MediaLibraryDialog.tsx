'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type PayloadMedia = {
  id: number | string
  alt?: string | null
  title?: string | null
  caption?: string | null
  description?: string | null
  fileName?: string | null
  filename?: string | null
  sourceFilename?: string | null
  url?: string | null
  thumbnailURL?: string | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: {
      url?: string | null
    } | null
  } | null
}

type MediaPagination = {
  page: number
  totalPages: number
  totalDocs: number
  hasNextPage: boolean
  nextPage?: number | null
}

type MediaDraft = {
  alt: string
  title: string
  fileName: string
  caption: string
  description: string
}

type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'error'

type UploadQueueItem = {
  key: string
  file: File
  status: UploadStatus
  error?: string
  media?: PayloadMedia
}

type MediaLibraryDialogProps = {
  open: boolean
  multiple?: boolean
  title?: string
  description?: string
  confirmLabel?: string
  initialSelectedMedia?: PayloadMedia[]
  initialActiveMedia?: PayloadMedia | null
  onClose: () => void
  onConfirm: (media: PayloadMedia[]) => void
}

const MEDIA_PAGE_SIZE = 60
const mediaSearchFields = [
  'filename',
  'alt',
  'title',
  'caption',
  'description',
  'sourceFilename',
]

function getMediaID(media: Pick<PayloadMedia, 'id'>): string {
  return String(media.id)
}

export function getMediaUrl(media: PayloadMedia): string {
  return media.url || ''
}

export function getMediaThumbnailUrl(media: PayloadMedia): string {
  return media.sizes?.thumbnail?.url || media.thumbnailURL || getMediaUrl(media)
}

export function getMediaLabel(media: PayloadMedia): string {
  return media.title || media.alt || media.filename || 'Ảnh'
}

function getFileStem(filename: string): string {
  return filename.replace(/\.[^.]+$/u, '')
}

function createDraft(media?: PayloadMedia | null): MediaDraft {
  return {
    alt: media?.alt || media?.title || media?.filename || '',
    title: media?.title || media?.alt || media?.filename || '',
    fileName: media?.fileName || media?.filename || '',
    caption: media?.caption || '',
    description: media?.description || '',
  }
}

function getUploadedDoc(result: unknown): PayloadMedia | null {
  if (
    result &&
    typeof result === 'object' &&
    'doc' in result &&
    result.doc &&
    typeof result.doc === 'object'
  ) {
    return result.doc as PayloadMedia
  }

  if (result && typeof result === 'object') {
    return result as PayloadMedia
  }

  return null
}

function uniqueMedia(items: PayloadMedia[]): PayloadMedia[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const id = getMediaID(item)

    if (seen.has(id)) {
      return false
    }

    seen.add(id)
    return true
  })
}

function buildMediaSearchUrl(page: number, search: string): string {
  const params = new URLSearchParams({
    depth: '0',
    limit: String(MEDIA_PAGE_SIZE),
    page: String(page),
    sort: '-createdAt',
  })
  const query = search.trim()

  if (query) {
    mediaSearchFields.forEach((field, index) => {
      params.set(`where[or][${index}][${field}][like]`, query)
    })
  }

  return `/api/media?${params.toString()}`
}

async function createMediaFromFile(file: File): Promise<PayloadMedia> {
  const label = getFileStem(file.name)
  const payloadData = {
    alt: label,
    title: label,
    caption: '',
    description: '',
    importedFrom: 'manual',
  }
  const formData = new FormData()

  formData.append('file', file)
  formData.append('_payload', JSON.stringify(payloadData))
  formData.append('alt', payloadData.alt)
  formData.append('title', payloadData.title)
  formData.append('caption', payloadData.caption)
  formData.append('description', payloadData.description)
  formData.append('importedFrom', payloadData.importedFrom)

  const response = await fetch('/api/media?depth=0', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `HTTP ${response.status}`)
  }

  const uploaded = getUploadedDoc(await response.json())

  if (!uploaded?.id) {
    throw new Error('Payload không trả về media vừa tạo.')
  }

  return uploaded
}

export function MediaLibraryDialog({
  open,
  multiple = false,
  title = 'Thư viện Media',
  description = 'Tải ảnh mới hoặc chọn ảnh đã có trong thư viện.',
  confirmLabel,
  initialSelectedMedia = [],
  initialActiveMedia = null,
  onClose,
  onConfirm,
}: MediaLibraryDialogProps) {
  const initialSelectionKey = initialSelectedMedia.map(getMediaID).join('|')
  const initialMediaRef = useRef(initialSelectedMedia)
  const initialActiveMediaRef = useRef(initialActiveMedia)
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaItems, setMediaItems] = useState<PayloadMedia[]>(initialSelectedMedia)
  const [pagination, setPagination] = useState<MediaPagination>({
    page: 1,
    totalPages: 1,
    totalDocs: 0,
    hasNextPage: false,
    nextPage: null,
  })
  const [selectedIDs, setSelectedIDs] = useState<string[]>(
    initialSelectedMedia.map(getMediaID),
  )
  const [activeMedia, setActiveMedia] = useState<PayloadMedia | null>(
    initialSelectedMedia[0] || null,
  )
  const [draft, setDraft] = useState<MediaDraft>(() =>
    createDraft(initialSelectedMedia[0]),
  )
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    initialMediaRef.current = initialSelectedMedia
  }, [initialSelectedMedia])

  useEffect(() => {
    initialActiveMediaRef.current = initialActiveMedia
  }, [initialActiveMedia])

  const selectActiveMedia = useCallback((media: PayloadMedia) => {
    setActiveMedia(media)
    setDraft(createDraft(media))
    setError(null)
    setNotice(null)
  }, [])

  const loadMedia = useCallback(
    async (page = 1, append = false) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(buildMediaSearchUrl(page, mediaSearch), {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        const docs = Array.isArray(result.docs) ? (result.docs as PayloadMedia[]) : []

        setPagination({
          page: Number(result.page || page) || page,
          totalPages: Number(result.totalPages || 1) || 1,
          totalDocs: Number(result.totalDocs || docs.length) || docs.length,
          hasNextPage: Boolean(result.hasNextPage),
          nextPage: result.nextPage ?? null,
        })
        setMediaItems((current) =>
          uniqueMedia(
            append
              ? [...current, ...docs]
              : [...initialMediaRef.current, ...docs],
          ),
        )

      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không tải được thư viện ảnh.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [mediaSearch],
  )

  const loadMediaRef = useRef(loadMedia)

  useEffect(() => {
    loadMediaRef.current = loadMedia
  }, [loadMedia])

  useEffect(() => {
    if (!open) {
      return
    }

    const resetTimer = window.setTimeout(() => {
      const selected = initialSelectionKey ? initialSelectionKey.split('|') : []
      const first = initialActiveMediaRef.current || initialMediaRef.current[0] || null

      setSelectedIDs(selected)
      setMediaItems(initialMediaRef.current)
      setActiveMedia(first)
      setDraft(createDraft(first))
      setUploadQueue([])
      setError(null)
      setNotice(null)
      void loadMediaRef.current(1, false)
    }, 0)

    return () => window.clearTimeout(resetTimer)
  }, [initialSelectionKey, open])

  const toggleMedia = useCallback(
    (media: PayloadMedia) => {
      const id = getMediaID(media)

      setSelectedIDs((current) => {
        if (!multiple) {
          return [id]
        }

        return current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
      })
      selectActiveMedia(media)
    },
    [multiple, selectActiveMedia],
  )

  const enqueueFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('Không có file ảnh hợp lệ trong lựa chọn.')
      return
    }

    setUploadQueue((current) => [
      ...current,
      ...imageFiles.map((file, index) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        status: 'queued' as const,
      })),
    ])
    setError(null)
    setNotice(`${imageFiles.length} ảnh đã được thêm vào hàng chờ.`)
  }, [])

  const uploadQueuedFiles = useCallback(async () => {
    const queuedItems = uploadQueue.filter(
      (item) => item.status === 'queued' || item.status === 'error',
    )

    if (queuedItems.length === 0 || isUploading) {
      return
    }

    setIsUploading(true)
    setError(null)
    setNotice(null)
    let uploadedCount = 0

    for (const queuedItem of queuedItems) {
      setUploadQueue((current) =>
        current.map((item) =>
          item.key === queuedItem.key
            ? { ...item, status: 'uploading', error: undefined }
            : item,
        ),
      )

      try {
        const uploaded = await createMediaFromFile(queuedItem.file)
        const uploadedID = getMediaID(uploaded)

        uploadedCount += 1
        setUploadQueue((current) =>
          current.map((item) =>
            item.key === queuedItem.key
              ? { ...item, status: 'uploaded', media: uploaded, error: undefined }
              : item,
          ),
        )
        setMediaItems((current) => uniqueMedia([uploaded, ...current]))
        setSelectedIDs((current) => {
          if (!multiple) {
            return [uploadedID]
          }

          return current.includes(uploadedID) ? current : [...current, uploadedID]
        })
        selectActiveMedia(uploaded)
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Không tải được ảnh.'

        setUploadQueue((current) =>
          current.map((item) =>
            item.key === queuedItem.key
              ? { ...item, status: 'error', error: message }
              : item,
          ),
        )
      }
    }

    setIsUploading(false)
    setNotice(
      uploadedCount > 0
        ? `Đã tải ${uploadedCount}/${queuedItems.length} ảnh vào thư viện Media.`
        : null,
    )
  }, [isUploading, multiple, selectActiveMedia, uploadQueue])

  const updateActiveMedia = useCallback(async () => {
    if (!activeMedia) {
      return
    }

    setIsSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/media/${activeMedia.id}?depth=0`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alt: draft.alt.trim() || activeMedia.filename || 'Ảnh',
          title: draft.title.trim(),
          fileName: draft.fileName.trim(),
          caption: draft.caption.trim(),
          description: draft.description.trim(),
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
      }

      const updated = getUploadedDoc(await response.json()) || {
        ...activeMedia,
        ...draft,
      }

      setMediaItems((current) =>
        current.map((item) =>
          getMediaID(item) === getMediaID(updated) ? updated : item,
        ),
      )
      setActiveMedia(updated)
      setDraft(createDraft(updated))
      setNotice('Đã cập nhật thông tin ảnh.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không cập nhật được media.',
      )
    } finally {
      setIsSaving(false)
    }
  }, [activeMedia, draft])

  const selectedMedia = useMemo(() => {
    const mediaByID = new Map(mediaItems.map((media) => [getMediaID(media), media]))

    return selectedIDs
      .map((id) => mediaByID.get(id))
      .filter((media): media is PayloadMedia => Boolean(media))
  }, [mediaItems, selectedIDs])

  if (!open) {
    return null
  }

  const uploadedItems = uploadQueue.filter((item) => item.status === 'uploaded').length

  return (
    <div className="payload-media-picker" role="dialog" aria-modal="true">
      <div className="payload-media-picker__backdrop" onClick={onClose} />

      <div className="payload-media-picker__panel payload-media-picker__panel--wide">
        <div className="payload-media-picker__header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <button type="button" onClick={onClose}>Đóng</button>
        </div>

        <div
          className={
            isDragging
              ? 'payload-media-picker__dropzone is-dragging'
              : 'payload-media-picker__dropzone'
          }
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget === event.target) {
              setIsDragging(false)
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            enqueueFiles(event.dataTransfer.files)
          }}
        >
          <div>
            <strong>Kéo nhiều ảnh vào đây</strong>
            <span>Ảnh được tải lần lượt và lưu ngay vào Media, không cần chờ lưu sản phẩm.</span>
          </div>

          <label className="payload-media-picker__file">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                if (event.target.files) {
                  enqueueFiles(event.target.files)
                }
                event.target.value = ''
              }}
            />
            <span>Chọn nhiều ảnh</span>
          </label>

          <button
            type="button"
            onClick={uploadQueuedFiles}
            disabled={
              isUploading ||
              !uploadQueue.some((item) => item.status === 'queued' || item.status === 'error')
            }
          >
            {isUploading ? 'Đang tải theo hàng chờ...' : 'Tải hàng chờ'}
          </button>
        </div>

        {uploadQueue.length > 0 ? (
          <div className="payload-media-picker__queue">
            <div className="payload-media-picker__queue-summary">
              <strong>Hàng chờ: {uploadQueue.length} ảnh</strong>
              <span>{uploadedItems} đã tải xong</span>
              {!isUploading ? (
                <button
                  type="button"
                  onClick={() =>
                    setUploadQueue((current) =>
                      current.filter((item) => item.status !== 'uploaded'),
                    )
                  }
                >
                  Dọn ảnh đã xong
                </button>
              ) : null}
            </div>

            <div className="payload-media-picker__queue-list">
              {uploadQueue.map((item) => (
                <div key={item.key} className={`is-${item.status}`}>
                  <span title={item.file.name}>{item.file.name}</span>
                  <small>
                    {item.status === 'queued' ? 'Chờ tải' : null}
                    {item.status === 'uploading' ? 'Đang tải...' : null}
                    {item.status === 'uploaded' ? 'Đã lưu Media' : null}
                    {item.status === 'error' ? item.error || 'Lỗi' : null}
                  </small>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="payload-media-picker__tools">
          <div className="payload-media-picker__search">
            <input
              value={mediaSearch}
              onChange={(event) => setMediaSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void loadMedia(1, false)
                }
              }}
              placeholder="Tìm theo tên file, alt, title, chú thích, mô tả..."
            />
            <button type="button" onClick={() => loadMedia(1, false)}>Tìm ảnh</button>
          </div>

          <div className="payload-media-picker__pagination">
            <span>
              Trang {pagination.page}/{pagination.totalPages} · {pagination.totalDocs} ảnh
            </span>
          </div>
        </div>

        {notice ? <div className="payload-media-picker__notice">{notice}</div> : null}
        {error ? <div className="payload-media-picker__error">{error}</div> : null}

        <div className="payload-media-picker__body">
          <div className="payload-media-picker__grid">
            {mediaItems.map((media) => {
              const id = getMediaID(media)
              const isSelected = selectedIDs.includes(id)
              const thumbnail = getMediaThumbnailUrl(media)

              return (
                <button
                  key={id}
                  type="button"
                  className={
                    isSelected
                      ? 'payload-media-picker__item is-selected'
                      : 'payload-media-picker__item'
                  }
                  disabled={!getMediaUrl(media)}
                  onClick={() => toggleMedia(media)}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={media.alt || media.filename || ''}
                      loading="lazy"
                    />
                  ) : (
                    <span>Không có ảnh</span>
                  )}
                  <strong>{getMediaLabel(media)}</strong>
                  {media.filename ? <small>{media.filename}</small> : null}
                  {isSelected ? <em>Đã chọn</em> : null}
                </button>
              )
            })}

            {!isLoading && mediaItems.length === 0 ? (
              <div className="payload-media-picker__state">Không có ảnh phù hợp.</div>
            ) : null}

            {isLoading ? (
              <div className="payload-media-picker__state">Đang tải thư viện ảnh...</div>
            ) : null}

            {pagination.hasNextPage ? (
              <button
                type="button"
                className="payload-media-picker__load-more"
                onClick={() => loadMedia(pagination.nextPage || pagination.page + 1, true)}
                disabled={isLoading}
              >
                Tải thêm ảnh
              </button>
            ) : null}
          </div>

          <aside className="payload-media-picker__details">
            {activeMedia ? (
              <>
                <div className="payload-media-picker__preview-image">
                  <img
                    src={getMediaThumbnailUrl(activeMedia) || getMediaUrl(activeMedia)}
                    alt={draft.alt || activeMedia.filename || ''}
                  />
                </div>

                <label>
                  <span>Alt ảnh</span>
                  <input
                    value={draft.alt}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, alt: event.target.value }))
                    }
                    placeholder="Mô tả ảnh cho SEO và accessibility"
                  />
                </label>

                <label>
                  <span>Tên hiển thị</span>
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Tên dùng để tìm ảnh trong admin"
                  />
                </label>

                <label>
                  <span>Tên file URL</span>
                  <input
                    value={draft.fileName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, fileName: event.target.value }))
                    }
                    placeholder="ten-file-anh.webp"
                  />
                </label>

                <label>
                  <span>Chú thích ảnh</span>
                  <textarea
                    value={draft.caption}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, caption: event.target.value }))
                    }
                    rows={3}
                  />
                </label>

                <label>
                  <span>Mô tả Media</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={4}
                  />
                </label>

                <button
                  type="button"
                  className="payload-media-picker__save-details"
                  onClick={updateActiveMedia}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thông tin ảnh'}
                </button>
              </>
            ) : (
              <div className="payload-media-picker__state">
                Chọn một ảnh để xem và chỉnh thông tin.
              </div>
            )}
          </aside>
        </div>

        <div className="payload-media-picker__footer">
          <span>
            Đã chọn {selectedMedia.length} ảnh
            {multiple ? ' · thứ tự chọn sẽ là thứ tự gallery' : ''}
          </span>
          <div>
            <button type="button" onClick={onClose}>Hủy</button>
            <button
              type="button"
              className="is-primary"
              disabled={selectedMedia.length === 0 || isUploading}
              onClick={() => onConfirm(selectedMedia)}
            >
              {confirmLabel || (multiple ? 'Dùng các ảnh đã chọn' : 'Chọn ảnh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
