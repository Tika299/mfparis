'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import { Editor } from '@tinymce/tinymce-react'

import {
  getMediaUrl,
  MediaLibraryDialog,
  type PayloadMedia,
} from '@/components/Admin/MediaLibraryDialog'
import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type EditorMode = 'visual' | 'source' | 'preview'

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

function createImageDraft(media?: PayloadMedia | null): ImageDraft {
  return {
    alt: media?.alt || media?.title || media?.filename || '',
    title: media?.title || media?.alt || media?.filename || '',
    caption: media?.caption || '',
    description: media?.description || '',
    wrapWithFigure: Boolean(media?.caption),
  }
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


  const openMediaPicker = useCallback(() => {
    setIsMediaPickerOpen(true)
  }, [])

  const insertSelectedImage = useCallback((mediaItems: PayloadMedia[]) => {
    const selectedMedia = mediaItems[0]

    if (!selectedMedia) {
      return
    }

    const imageDraft = createImageDraft(selectedMedia)
    const imageHtml = buildImageHtml(selectedMedia, imageDraft)

    if (!imageHtml) {
      return
    }

    editorRef.current?.insertContent(imageHtml)

    const nextHtml = editorRef.current?.getContent?.() || html
    commitHtml(nextHtml)
    setIsMediaPickerOpen(false)
  }, [commitHtml, html])

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

      <MediaLibraryDialog
        open={isMediaPickerOpen}
        title="Chọn ảnh từ Payload"
        description="Tải nhiều ảnh theo hàng chờ, chỉnh thông tin Media rồi chèn vào nội dung."
        confirmLabel="Chèn ảnh"
        onClose={() => setIsMediaPickerOpen(false)}
        onConfirm={insertSelectedImage}
      />

    </div>
  )
}
