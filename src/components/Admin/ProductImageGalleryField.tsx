'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useField } from '@payloadcms/ui'

import {
  getMediaLabel,
  getMediaThumbnailUrl,
  MediaLibraryDialog,
  type PayloadMedia,
} from '@/components/Admin/MediaLibraryDialog'

type GalleryRow = {
  id?: string | null
  image?: PayloadMedia | number | string | null
}

type ProductImageGalleryFieldProps = {
  path?: string
  field?: {
    name?: string
    label?: string
    admin?: {
      description?: string
    }
  }
}

function normalizeRows(value: unknown): GalleryRow[] {
  return Array.isArray(value) ? (value as GalleryRow[]) : []
}

function getRelationshipID(value: GalleryRow['image']): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (value && typeof value === 'object' && value.id !== undefined) {
    return String(value.id)
  }

  return ''
}

function getRelationshipMedia(value: GalleryRow['image']): PayloadMedia | null {
  return value && typeof value === 'object' && value.id !== undefined
    ? value
    : null
}

export function ProductImageGalleryField({
  path,
  field,
}: ProductImageGalleryFieldProps) {
  const fieldPath = path || field?.name || 'images'
  const { value, setValue } = useField<GalleryRow[]>({ path: fieldPath })
  const rows = useMemo(() => normalizeRows(value), [value])
  const [mediaByID, setMediaByID] = useState<Record<string, PayloadMedia>>({})
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeMediaID, setActiveMediaID] = useState<string | null>(null)
  const [error, setError] = useState('')

  const relationshipIDs = useMemo(
    () => rows.map((row) => getRelationshipID(row.image)).filter(Boolean),
    [rows],
  )
  const embeddedMediaByID = useMemo(() => {
    const result: Record<string, PayloadMedia> = {}

    rows.forEach((row) => {
      const media = getRelationshipMedia(row.image)

      if (media) {
        result[String(media.id)] = media
      }
    })

    return result
  }, [rows])

  useEffect(() => {
    const missingIDs = relationshipIDs.filter(
      (id) => !embeddedMediaByID[id] && !mediaByID[id],
    )

    if (missingIDs.length === 0) {
      return
    }

    let cancelled = false

    async function loadMissingMedia() {
      try {
        const results = await Promise.all(
          missingIDs.map(async (id) => {
            const response = await fetch(`/api/media/${encodeURIComponent(id)}?depth=0`, {
              credentials: 'include',
            })

            if (!response.ok) {
              return null
            }

            return (await response.json()) as PayloadMedia
          }),
        )

        if (cancelled) {
          return
        }

        setMediaByID((current) => {
          const next = { ...current }

          results.forEach((media) => {
            if (media?.id !== undefined) {
              next[String(media.id)] = media
            }
          })

          return next
        })
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không tải được thông tin gallery.',
          )
        }
      }
    }

    void loadMissingMedia()

    return () => {
      cancelled = true
    }
  }, [embeddedMediaByID, mediaByID, relationshipIDs])

  const selectedMedia = useMemo(
    () =>
      relationshipIDs
        .map((id) => embeddedMediaByID[id] || mediaByID[id])
        .filter(Boolean),
    [embeddedMediaByID, mediaByID, relationshipIDs],
  )

  const updateRows = useCallback(
    (nextRows: GalleryRow[]) => {
      setValue(nextRows)
      setError('')
    },
    [setValue],
  )

  const moveRow = useCallback(
    (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction

      if (nextIndex < 0 || nextIndex >= rows.length) {
        return
      }

      const nextRows = [...rows]
      const [row] = nextRows.splice(index, 1)
      nextRows.splice(nextIndex, 0, row)
      updateRows(nextRows)
    },
    [rows, updateRows],
  )

  const removeRow = useCallback(
    (index: number) => {
      updateRows(rows.filter((_row, rowIndex) => rowIndex !== index))
    },
    [rows, updateRows],
  )

  const openPicker = useCallback((mediaID?: string) => {
    setActiveMediaID(mediaID || null)
    setIsPickerOpen(true)
    setError('')
  }, [])

  return (
    <div className="product-image-gallery-field">
      <div className="product-image-gallery-field__header">
        <div>
          <label className="product-image-gallery-field__label">
            {field?.label || 'Bộ sưu tập hình ảnh'}
          </label>
          <p>
            {field?.admin?.description ||
              'Tải nhiều ảnh hoặc chọn ảnh có sẵn trong thư viện Media.'}
          </p>
        </div>

        <button type="button" onClick={() => openPicker()}>
          Chọn hoặc tải nhiều ảnh
        </button>
      </div>

      {error ? <div className="product-image-gallery-field__error">{error}</div> : null}

      {rows.length > 0 ? (
        <div className="product-image-gallery-field__grid">
          {rows.map((row, index) => {
            const mediaID = getRelationshipID(row.image)
            const media = embeddedMediaByID[mediaID] || mediaByID[mediaID]
            const thumbnail = media ? getMediaThumbnailUrl(media) : ''

            return (
              <article key={row.id || `${mediaID}-${index}`}>
                <div className="product-image-gallery-field__preview">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={media?.alt || media?.filename || ''}
                      loading="lazy"
                    />
                  ) : (
                    <span>Đang tải ảnh...</span>
                  )}
                  <b>{index + 1}</b>
                </div>

                <div className="product-image-gallery-field__meta">
                  <strong>{media ? getMediaLabel(media) : `Media #${mediaID}`}</strong>
                  <small>{media?.filename || ''}</small>
                </div>

                <div className="product-image-gallery-field__actions">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                  >
                    Lên
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                  >
                    Xuống
                  </button>
                  <button
                    type="button"
                    onClick={() => openPicker(mediaID)}
                    disabled={!media}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => removeRow(index)}
                  >
                    Bỏ
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <button
          type="button"
          className="product-image-gallery-field__empty"
          onClick={() => openPicker()}
        >
          <strong>Chưa có ảnh sản phẩm</strong>
          <span>Kéo nhiều ảnh lên hoặc chọn ảnh đã có trong Media.</span>
        </button>
      )}

      <div className="product-image-gallery-field__hint">
        Ảnh đầu tiên sẽ là ảnh đại diện. Ảnh tải xong được lưu ngay vào Media,
        kể cả khi bạn chưa lưu sản phẩm.
      </div>

      <MediaLibraryDialog
        open={isPickerOpen}
        multiple
        title="Chọn ảnh cho sản phẩm"
        description="Chọn nhiều ảnh có sẵn hoặc kéo nhiều file vào hàng chờ tải lên."
        confirmLabel="Gắn ảnh vào sản phẩm"
        initialSelectedMedia={selectedMedia}
        initialActiveMedia={
          activeMediaID
            ? embeddedMediaByID[activeMediaID] || mediaByID[activeMediaID] || null
            : null
        }
        onClose={() => setIsPickerOpen(false)}
        onConfirm={(mediaItems) => {
          const currentRowsByMediaID = new Map(
            rows.map((row) => [getRelationshipID(row.image), row]),
          )

          setMediaByID((current) => {
            const next = { ...current }
            mediaItems.forEach((media) => {
              next[String(media.id)] = media
            })
            return next
          })
          updateRows(
            mediaItems.map((media) => {
              const mediaID = String(media.id)
              const existingRow = currentRowsByMediaID.get(mediaID)

              return existingRow
                ? { ...existingRow, image: media.id }
                : { image: media.id }
            }),
          )
          setIsPickerOpen(false)
        }}
      />
    </div>
  )
}
