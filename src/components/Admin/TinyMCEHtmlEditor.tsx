'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import { Editor } from '@tinymce/tinymce-react'

import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type EditorMode = 'visual' | 'source' | 'preview'

type PayloadMedia = {
  id: number | string
  alt?: string | null
  filename?: string | null
  url?: string | null
  sizes?: {
    thumbnail?: {
      url?: string | null
    } | null
  } | null
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

export function TinyMCEHtmlEditor({ path, field }: TinyMCEHtmlEditorProps) {
  const fieldPath = path || field?.name || ''
  const { value, setValue } = useField<string>({ path: fieldPath })
  const [mode, setMode] = useState<EditorMode>('visual')
  const [html, setHtml] = useState(normalizeHtml(value))
  const [sourceDraftHtml, setSourceDraftHtml] = useState(normalizeHtml(value))
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false)
  const [mediaSearch, setMediaSearch] = useState('')
  const [mediaItems, setMediaItems] = useState<PayloadMedia[]>([])
  const [isMediaLoading, setIsMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
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
      const text = `${item.filename || ''} ${item.alt || ''}`.toLowerCase()

      return text.includes(query)
    })
  }, [mediaItems, mediaSearch])

  const loadMediaItems = useCallback(async () => {
    setIsMediaLoading(true)
    setMediaError(null)

    try {
      const response = await fetch('/api/media?limit=80&depth=0', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      setMediaItems(Array.isArray(result.docs) ? result.docs : [])
    } catch (error) {
      setMediaError(
        error instanceof Error
          ? error.message
          : 'Khong tai duoc thu vien anh.',
      )
    } finally {
      setIsMediaLoading(false)
    }
  }, [])

  const openMediaPicker = useCallback(() => {
    setIsMediaPickerOpen(true)

    if (mediaItems.length === 0) {
      void loadMediaItems()
    }
  }, [loadMediaItems, mediaItems.length])

  const insertPayloadImage = useCallback(
    (media: PayloadMedia) => {
      const src = getMediaUrl(media)

      if (!src) {
        return
      }

      const alt = media.alt || media.filename || ''
      const imageHtml = `<img src="${escapeHtml(src)}" alt="${escapeHtml(
        alt,
      )}" loading="lazy" width="800" height="800" />`

      editorRef.current?.insertContent(imageHtml)

      const nextHtml = editorRef.current?.getContent?.() || html
      commitHtml(nextHtml)
      setIsMediaPickerOpen(false)
    },
    [commitHtml, html],
  )

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
        Khong xac dinh duoc duong dan field cho HTML editor.
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
              'body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.75;color:#111827;padding:16px;} h2{font-size:28px;line-height:1.3;margin:28px 0 12px;} h3{font-size:22px;line-height:1.35;margin:24px 0 10px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #d1d5db;padding:10px;}',
            convert_urls: false,
            relative_urls: false,
            remove_script_host: false,
            paste_data_images: false,
            setup: (editor: any) => {
              editor.ui.registry.addButton('payloadImage', {
                text: 'Anh Payload',
                tooltip: 'Chen anh tu thu vien Payload',
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
          <div className="payload-media-picker__panel">
            <div className="payload-media-picker__header">
              <div>
                <h3>Chon anh tu Payload</h3>
                <p>Chon anh trong collection media de chen vao noi dung.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
              >
                Dong
              </button>
            </div>

            <div className="payload-media-picker__tools">
              <input
                value={mediaSearch}
                onChange={(event) => setMediaSearch(event.target.value)}
                placeholder="Tim theo ten file hoac alt..."
              />
              <button type="button" onClick={loadMediaItems}>
                Tai lai
              </button>
            </div>

            {isMediaLoading ? (
              <div className="payload-media-picker__state">Dang tai anh...</div>
            ) : null}

            {mediaError ? (
              <div className="payload-media-picker__error">
                Khong tai duoc media: {mediaError}
              </div>
            ) : null}

            {!isMediaLoading && !mediaError ? (
              <div className="payload-media-picker__grid">
                {filteredMediaItems.map((item) => {
                  const src = getMediaUrl(item)
                  const thumbnailSrc = getMediaThumbnailUrl(item)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="payload-media-picker__item"
                      disabled={!src}
                      onClick={() => insertPayloadImage(item)}
                    >
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={item.alt || item.filename || ''}
                          loading="lazy"
                        />
                      ) : (
                        <span>Khong co anh</span>
                      )}
                      <strong>{item.alt || item.filename || 'Anh'}</strong>
                      {item.filename ? <small>{item.filename}</small> : null}
                    </button>
                  )
                })}

                {filteredMediaItems.length === 0 ? (
                  <div className="payload-media-picker__state">
                    Khong co anh phu hop.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

