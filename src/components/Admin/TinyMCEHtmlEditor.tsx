'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import { Editor } from '@tinymce/tinymce-react'

import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type EditorMode = 'visual' | 'source' | 'preview'

type PayloadMedia = {
  id: number | string
  alt?: string | null
  title?: string | null
  caption?: string | null
  description?: string | null
  filename?: string | null
  url?: string | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: {
      url?: string | null
    } | null
  } | null
}

type ImageDraft = {
  alt: string
  title: string
  caption: string
  description: string
  wrapWithFigure: boolean
}

type TinyMCEHtmlEditorProps = {
  path?: string
  field?: {
    name?: string
    label?: string
    admin?: {
      description?: string
    }
  }
}

function normalizeHtml(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getMediaUrl(media: PayloadMedia): string {
  return media.url || ''
}

function getMediaThumbnailUrl(media: PayloadMedia): string {
  return media.sizes?.thumbnail?.url || getMediaUrl(media)
}

function getMediaLabel(media: PayloadMedia): string {
  return media.title || media.alt || media.filename || 'Ảnh'
}

function createImageDraft(media?: PayloadMedia | null): ImageDraft {
  return {
    alt: media?.alt || media?.title || media?.filename || '',
    title: media?.title || media?.alt || media?.filename || '',
    caption: media?.caption || '',
    description: media?.description || '',
    wrapWithFigure: Boolean(media?.caption),
  }
}

function getUploadedDoc(result: any): PayloadMedia | null {
  if (result?.doc && typeof result.doc === 'object') {
    return result.doc as PayloadMedia
  }

  if (result && typeof result === 'object') {
    return result as PayloadMedia
  }

  return null
}

function buildImageHtml(media: PayloadMedia, draft: ImageDraft): string {
  const src = getMediaUrl(media)

  if (!src) {
    return ''
  }

  const alt = draft.alt || media.alt || media.filename || ''
  const title = draft.title || media.title || ''
  const caption = draft.caption.trim()
  const description = draft.description.trim()
  const width = Number(media.width) > 0 ? Number(media.width) : undefined
  const height = Number(media.height) > 0 ? Number(media.height) : undefined
  const attrs = [
    `src="${escapeHtml(src)}"`,
    `alt="${escapeHtml(alt)}"`,
    title ? `title="${escapeHtml(title)}"` : '',
    description ? `data-description="${escapeHtml(description)}"` : '',
    width ? `width="${width}"` : '',
    height ? `height="${height}"` : '',
    'loading="lazy"',
  ]
    .filter(Boolean)
    .join(' ')

  const imageHtml = `<img ${attrs} />`

  if (draft.wrapWithFigure || caption) {
    return `<figure class="wp-block-image size-full">${imageHtml}${
      caption
        ? `<figcaption class="wp-element-caption">${escapeHtml(caption)}</figcaption>`
        : ''
    }</figure>`
  }

  return imageHtml
}

export function TinyMCEHtmlEditor({ path, field }: TinyMCEHtmlEditorProps) {
  const fieldPath = path || field?.name || ''
  const { value, setValue } = useField<string>({ path: fieldPath })
  const [mode, setMode] = useState<EditorMode>('visual')
  const [html, setHtml] = useState(normalizeHtml(value))
  const [sourceDraftHtml, setSourceDraftHtml] = useState(normalizeHtml(value))
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false)
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaItems, setMediaItems] = useState<PayloadMedia[]>([])
  const [selectedMedia, setSelectedMedia] = useState<PayloadMedia | null>(null)
  const [imageDraft, setImageDraft] = useState<ImageDraft>(() => createImageDraft())
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isMediaLoading, setIsMediaLoading] = useState(false)
  const [isMediaSaving, setIsMediaSaving] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaNotice, setMediaNotice] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const lastCommittedHtmlRef = useRef(normalizeHtml(value))

  useEffect(() => {
    const nextHtml = normalizeHtml(value)

    if (nextHtml !== lastCommittedHtmlRef.current) {
      setHtml(nextHtml)
      setSourceDraftHtml(nextHtml)
      lastCommittedHtmlRef.current = nextHtml
    }
  }, [value])

  const commitHtml = useCallback(
    (nextHtml: string) => {
      setHtml(nextHtml)
      setSourceDraftHtml(nextHtml)
      lastCommittedHtmlRef.current = nextHtml
      setValue(nextHtml)
    },
    [setValue],
  )

  const previewHtml = useMemo(
    () => sanitizeWordPressHtml(mode === 'source' ? sourceDraftHtml : html),
    [html, mode, sourceDraftHtml],
  )

  const filteredMediaItems = useMemo(() => {
    const query = mediaSearch.trim().toLowerCase()

    if (!query) {
      return mediaItems
    }

    return mediaItems.filter((item) => {
      const text = `${item.filename || ''} ${item.alt || ''} ${item.title || ''} ${item.caption || ''} ${item.description || ''}`.toLowerCase()

      return text.includes(query)
    })
  }, [mediaItems, mediaSearch])

  const selectMedia = useCallback((media: PayloadMedia) => {
    setSelectedMedia(media)
    setImageDraft(createImageDraft(media))
    setMediaError(null)
    setMediaNotice(null)
  }, [])

  const loadMediaItems = useCallback(async () => {
    setIsMediaLoading(true)
    setMediaError(null)

    try {
      const response = await fetch('/api/media?limit=80&depth=0&sort=-createdAt', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const docs = Array.isArray(result.docs) ? result.docs : []
      setMediaItems(docs)

      if (!selectedMedia && docs.length > 0) {
        selectMedia(docs[0])
      }
    } catch (error) {
      setMediaError(
        error instanceof Error
          ? error.message
          : 'Không tải được thư viện ảnh.',
      )
    } finally {
      setIsMediaLoading(false)
    }
  }, [selectMedia, selectedMedia])

  const openMediaPicker = useCallback(() => {
    setIsMediaPickerOpen(true)
    setMediaError(null)
    setMediaNotice(null)

    if (mediaItems.length === 0) {
      void loadMediaItems()
    }
  }, [loadMediaItems, mediaItems.length])

  const uploadQuickMedia = useCallback(async () => {
    if (!uploadFile) {
      setMediaError('Hãy chọn file ảnh trước khi tạo media.')
      return
    }

    const alt = imageDraft.alt.trim() || imageDraft.title.trim() || uploadFile.name

    setIsMediaSaving(true)
    setMediaError(null)
    setMediaNotice(null)

    try {
      const formData = new FormData()
      const payloadData = {
        alt,
        title: imageDraft.title.trim() || alt,
        caption: imageDraft.caption.trim(),
        description: imageDraft.description.trim(),
        importedFrom: 'manual',
      }

      formData.append('file', uploadFile)
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

      const result = await response.json()
      const uploaded = getUploadedDoc(result)

      if (!uploaded?.id) {
        throw new Error('Payload không trả về media vừa tạo.')
      }

      setMediaItems((items) => [uploaded, ...items.filter((item) => item.id !== uploaded.id)])
      selectMedia(uploaded)
      setUploadFile(null)
      setMediaNotice('Đã tạo media mới. Kiểm tra thông tin rồi bấm chèn ảnh.')
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : 'Không upload được media.',
      )
    } finally {
      setIsMediaSaving(false)
    }
  }, [imageDraft, selectMedia, uploadFile])

  const updateSelectedMedia = useCallback(async () => {
    if (!selectedMedia) {
      return
    }

    setIsMediaSaving(true)
    setMediaError(null)
    setMediaNotice(null)

    try {
      const response = await fetch(`/api/media/${selectedMedia.id}?depth=0`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alt: imageDraft.alt.trim() || selectedMedia.filename || 'Ảnh',
          title: imageDraft.title.trim(),
          caption: imageDraft.caption.trim(),
          description: imageDraft.description.trim(),
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
      }

      const result = await response.json()
      const updated = getUploadedDoc(result) || {
        ...selectedMedia,
        alt: imageDraft.alt,
        title: imageDraft.title,
        caption: imageDraft.caption,
        description: imageDraft.description,
      }

      setMediaItems((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedMedia(updated)
      setMediaNotice('Đã cập nhật thông tin media.')
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : 'Không cập nhật được media.',
      )
    } finally {
      setIsMediaSaving(false)
    }
  }, [imageDraft, selectedMedia])

  const insertSelectedImage = useCallback(() => {
    if (!selectedMedia) {
      return
    }

    const imageHtml = buildImageHtml(selectedMedia, imageDraft)

    if (!imageHtml) {
      return
    }

    editorRef.current?.insertContent(imageHtml)

    const nextHtml = editorRef.current?.getContent?.() || html
    commitHtml(nextHtml)
    setIsMediaPickerOpen(false)
  }, [commitHtml, html, imageDraft, selectedMedia])

  const switchMode = useCallback(
    (nextMode: EditorMode) => {
      if (mode === 'visual') {
        commitHtml(html)
      }

      if (mode === 'source') {
        commitHtml(sourceDraftHtml)
      }

      if (nextMode === 'source') {
        setSourceDraftHtml(html)
      }

      setMode(nextMode)
    },
    [commitHtml, html, mode, sourceDraftHtml],
  )

  if (!fieldPath) {
    return (
      <div className="tinymce-html-editor tinymce-html-editor--error">
        Không xác định được đường dẫn field cho HTML editor.
      </div>
    )
  }

  return (
    <div className="tinymce-html-editor">
      <div className="tinymce-html-editor__header">
        <div>
          {field?.label ? (
            <label className="tinymce-html-editor__label">{field.label}</label>
          ) : null}

          {field?.admin?.description ? (
            <p className="tinymce-html-editor__description">
              {field.admin.description}
            </p>
          ) : null}
        </div>

        <div className="tinymce-html-editor__modes">
          {(['visual', 'source', 'preview'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={mode === item ? 'is-active' : ''}
            >
              {item === 'visual'
                ? 'Soạn thảo'
                : item === 'source'
                  ? 'HTML'
                  : 'Xem trước'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'visual' ? (
        <Editor
          apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'no-api-key'}
          onInit={(_event, editor) => {
            editorRef.current = editor
          }}
          value={html}
          onEditorChange={(nextHtml) => {
            setHtml(nextHtml)
          }}
          onBlur={() => {
            commitHtml(html)
          }}
          init={{
            height: 560,
            menubar: true,
            branding: false,
            promotion: false,
            language: 'vi',
            plugins:
              'advlist autolink lists link charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
            toolbar:
              'undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link payloadImage media table | removeformat code fullscreen preview help',
            block_formats:
              'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Quote=blockquote',
            content_style:
              'body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.75;color:#111827;padding:16px;} h2{font-size:28px;line-height:1.3;margin:28px 0 12px;} h3{font-size:22px;line-height:1.35;margin:24px 0 10px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #d1d5db;padding:10px;} figure{margin:24px auto;text-align:center;} figcaption{margin-top:8px;color:#6b7280;font-size:14px;font-style:italic;} img{max-width:100%;height:auto;}',
            convert_urls: false,
            relative_urls: false,
            remove_script_host: false,
            paste_data_images: false,
            setup: (editor: any) => {
              editor.ui.registry.addButton('payloadImage', {
                text: 'Ảnh Payload',
                tooltip: 'Chèn ảnh từ thư viện Payload',
                onAction: openMediaPicker,
              })
            },
          }}
        />
      ) : null}

      {mode === 'source' ? (
        <textarea
          value={sourceDraftHtml}
          onChange={(event) => setSourceDraftHtml(event.target.value)}
          onBlur={() => commitHtml(sourceDraftHtml)}
          className="tinymce-html-editor__source"
          spellCheck={false}
        />
      ) : null}

      {mode === 'preview' ? (
        <div
          className="tinymce-html-editor__preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : null}

      {isMediaPickerOpen ? (
        <div className="payload-media-picker" role="dialog" aria-modal="true">
          <div
            className="payload-media-picker__backdrop"
            onClick={() => setIsMediaPickerOpen(false)}
          />
          <div className="payload-media-picker__panel payload-media-picker__panel--wide">
            <div className="payload-media-picker__header">
              <div>
                <h3>Chọn ảnh từ Payload</h3>
                <p>Upload nhanh, bổ sung alt/title/chú thích/mô tả rồi chèn vào nội dung.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
              >
                Đóng
              </button>
            </div>

            <div className="payload-media-picker__quick-upload">
              <div>
                <strong>Tạo media nhanh</strong>
                <span>Chọn ảnh mới, nhập thông tin, rồi bấm tạo media.</span>
              </div>

              <label className="payload-media-picker__file">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    setUploadFile(file)

                    if (file) {
                      setImageDraft((draft) => ({
                        ...draft,
                        alt: draft.alt || file.name.replace(/\.[^.]+$/u, ''),
                        title: draft.title || file.name.replace(/\.[^.]+$/u, ''),
                      }))
                    }
                  }}
                />
                <span>{uploadFile ? uploadFile.name : 'Chọn file ảnh'}</span>
              </label>

              <button
                type="button"
                onClick={uploadQuickMedia}
                disabled={isMediaSaving || !uploadFile}
              >
                {isMediaSaving ? 'Đang xử lý...' : 'Tạo media'}
              </button>
            </div>

            <div className="payload-media-picker__tools">
              <input
                value={mediaSearch}
                onChange={(event) => setMediaSearch(event.target.value)}
                placeholder="Tìm theo tên file, alt, title, chú thích..."
              />
              <button type="button" onClick={loadMediaItems}>
                Tải lại
              </button>
            </div>

            {mediaNotice ? (
              <div className="payload-media-picker__notice">{mediaNotice}</div>
            ) : null}

            {isMediaLoading ? (
              <div className="payload-media-picker__state">Đang tải ảnh...</div>
            ) : null}

            {mediaError ? (
              <div className="payload-media-picker__error">
                Không xử lý được media: {mediaError}
              </div>
            ) : null}

            <div className="payload-media-picker__body">
              {!isMediaLoading && !mediaError ? (
                <div className="payload-media-picker__grid">
                  {filteredMediaItems.map((item) => {
                    const src = getMediaUrl(item)
                    const thumbnailSrc = getMediaThumbnailUrl(item)
                    const isSelected = selectedMedia?.id === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          isSelected
                            ? 'payload-media-picker__item is-selected'
                            : 'payload-media-picker__item'
                        }
                        disabled={!src}
                        onClick={() => selectMedia(item)}
                      >
                        {thumbnailSrc ? (
                          <img
                            src={thumbnailSrc}
                            alt={item.alt || item.filename || ''}
                            loading="lazy"
                          />
                        ) : (
                          <span>Không có ảnh</span>
                        )}
                        <strong>{getMediaLabel(item)}</strong>
                        {item.filename ? <small>{item.filename}</small> : null}
                      </button>
                    )
                  })}

                  {filteredMediaItems.length === 0 ? (
                    <div className="payload-media-picker__state">
                      Không có ảnh phù hợp.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <aside className="payload-media-picker__details">
                {selectedMedia ? (
                  <>
                    <div className="payload-media-picker__preview-image">
                      <img
                        src={getMediaThumbnailUrl(selectedMedia) || getMediaUrl(selectedMedia)}
                        alt={imageDraft.alt || selectedMedia.filename || ''}
                      />
                    </div>

                    <label>
                      <span>Alt ảnh</span>
                      <input
                        value={imageDraft.alt}
                        onChange={(event) =>
                          setImageDraft((draft) => ({ ...draft, alt: event.target.value }))
                        }
                        placeholder="Mô tả ảnh cho SEO và accessibility"
                      />
                    </label>

                    <label>
                      <span>Title ảnh</span>
                      <input
                        value={imageDraft.title}
                        onChange={(event) =>
                          setImageDraft((draft) => ({ ...draft, title: event.target.value }))
                        }
                        placeholder="Tên hiển thị hoặc tiêu đề ảnh"
                      />
                    </label>

                    <label>
                      <span>Chú thích hiển thị</span>
                      <textarea
                        value={imageDraft.caption}
                        onChange={(event) =>
                          setImageDraft((draft) => ({
                            ...draft,
                            caption: event.target.value,
                            wrapWithFigure: event.target.value.trim()
                              ? true
                              : draft.wrapWithFigure,
                          }))
                        }
                        rows={3}
                        placeholder="Chú thích nằm dưới ảnh giống WordPress figcaption"
                      />
                    </label>

                    <label>
                      <span>Mô tả media</span>
                      <textarea
                        value={imageDraft.description}
                        onChange={(event) =>
                          setImageDraft((draft) => ({ ...draft, description: event.target.value }))
                        }
                        rows={4}
                        placeholder="Ghi chú/mô tả nội bộ cho media"
                      />
                    </label>

                    <label className="payload-media-picker__check">
                      <input
                        type="checkbox"
                        checked={imageDraft.wrapWithFigure}
                        onChange={(event) =>
                          setImageDraft((draft) => ({
                            ...draft,
                            wrapWithFigure: event.target.checked,
                          }))
                        }
                      />
                      <span>Chèn dạng figure giống WordPress</span>
                    </label>

                    <div className="payload-media-picker__actions">
                      <button
                        type="button"
                        onClick={updateSelectedMedia}
                        disabled={isMediaSaving}
                      >
                        Lưu thông tin media
                      </button>
                      <button
                        type="button"
                        className="is-primary"
                        onClick={insertSelectedImage}
                        disabled={!getMediaUrl(selectedMedia)}
                      >
                        Chèn ảnh
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="payload-media-picker__state">
                    Chọn một ảnh để thêm alt, chú thích hoặc mô tả.
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
