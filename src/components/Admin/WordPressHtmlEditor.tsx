'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import { sanitizeWordPressHtml } from '@/lib/html/sanitizeWordPressHtml'

type EditorMode = 'visual' | 'source' | 'preview'

type WordPressHtmlEditorProps = {
  path?: string
  field?: {
    name?: string
    label?: string
    admin?: {
      description?: string
    }
  }
}

const toolbarGroups = [
  [
    { command: 'bold', label: 'B', title: 'Bold' },
    { command: 'italic', label: 'I', title: 'Italic' },
    { command: 'underline', label: 'U', title: 'Underline' },
  ],
  [
    { command: 'formatBlock', label: 'P', value: 'p', title: 'Paragraph' },
    { command: 'formatBlock', label: 'H2', value: 'h2', title: 'Heading 2' },
    { command: 'formatBlock', label: 'H3', value: 'h3', title: 'Heading 3' },
    { command: 'formatBlock', label: 'H4', value: 'h4', title: 'Heading 4' },
  ],
  [
    { command: 'insertUnorderedList', label: 'UL', title: 'Bullet list' },
    { command: 'insertOrderedList', label: 'OL', title: 'Numbered list' },
    { command: 'blockquote', label: 'Quote', title: 'Quote' },
  ],
  [
    { command: 'justifyLeft', label: 'Left', title: 'Align left' },
    { command: 'justifyCenter', label: 'Center', title: 'Align center' },
    { command: 'justifyRight', label: 'Right', title: 'Align right' },
  ],
] as const

function insertLink() {
  const url = window.prompt('Nhap URL lien ket')

  if (!url) {
    return
  }

  document.execCommand('createLink', false, url)
}

function insertImage() {
  const url = window.prompt('Nhap URL anh')

  if (!url) {
    return
  }

  document.execCommand('insertImage', false, url)
}

function insertTable() {
  document.execCommand(
    'insertHTML',
    false,
    '<table><tbody><tr><th>Tiêu đề</th><th>Tiêu đề</th></tr><tr><td>Nội dung</td><td>Nội dung</td></tr></tbody></table>',
  )
}

function normalizeEditorHtml(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function WordPressHtmlEditor({
  path,
  field,
}: WordPressHtmlEditorProps) {
  const fieldPath = path || field?.name || ''
  const { value, setValue } = useField<string>({ path: fieldPath })
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<EditorMode>('visual')
  const [html, setHtml] = useState(normalizeEditorHtml(value))
  const [sourceDraftHtml, setSourceDraftHtml] = useState(
    normalizeEditorHtml(value),
  )
  const lastCommittedHtmlRef = useRef(normalizeEditorHtml(value))
  const visualDraftHtmlRef = useRef(normalizeEditorHtml(value))

  const currentHtml = normalizeEditorHtml(value)

  useEffect(() => {
    if (
      currentHtml !== lastCommittedHtmlRef.current &&
      currentHtml !== html
    ) {
      setHtml(currentHtml)
      setSourceDraftHtml(currentHtml)
      lastCommittedHtmlRef.current = currentHtml
    }
  }, [currentHtml, html])

  useEffect(() => {
    if (
      mode === 'visual' &&
      editorRef.current &&
      editorRef.current.innerHTML !== html
    ) {
      editorRef.current.innerHTML = html
      visualDraftHtmlRef.current = html
    }
  }, [mode])

  const previewHtml = useMemo(
    () => sanitizeWordPressHtml(mode === 'source' ? sourceDraftHtml : html),
    [html, mode, sourceDraftHtml],
  )

  const commitHtml = useCallback(
    (nextHtml: string) => {
      setHtml(nextHtml)
      setSourceDraftHtml(nextHtml)
      lastCommittedHtmlRef.current = nextHtml
      visualDraftHtmlRef.current = nextHtml
      setValue(nextHtml)
    },
    [setValue],
  )

  const syncFromVisual = useCallback(() => {
    const nextHtml = editorRef.current?.innerHTML || ''
    commitHtml(nextHtml)
  }, [commitHtml])

  const updateVisualDraft = useCallback(() => {
    visualDraftHtmlRef.current = editorRef.current?.innerHTML || ''
  }, [])

  const runCommand = useCallback(
    (command: string, value?: string) => {
      if (command === 'blockquote') {
        document.execCommand('formatBlock', false, 'blockquote')
      } else {
        document.execCommand(command, false, value)
      }

      syncFromVisual()
      editorRef.current?.focus()
    },
    [syncFromVisual],
  )

  const switchMode = useCallback(
    (nextMode: EditorMode) => {
      if (mode === 'source') {
        commitHtml(sourceDraftHtml)
      } else if (mode === 'visual') {
        commitHtml(visualDraftHtmlRef.current)
      }

      if (nextMode === 'source') {
        setSourceDraftHtml(
          mode === 'visual' ? visualDraftHtmlRef.current : html,
        )
      }

      setMode(nextMode)
    },
    [commitHtml, html, mode, sourceDraftHtml],
  )

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault()

      const html = event.clipboardData.getData('text/html')
      const text = event.clipboardData.getData('text/plain')
      const nextHtml = html
        ? sanitizeWordPressHtml(html)
        : text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')

      document.execCommand('insertHTML', false, nextHtml)
      syncFromVisual()
    },
    [syncFromVisual],
  )

  if (!fieldPath) {
    return (
      <div className="wp-html-editor wp-html-editor--error">
        Khong xac dinh duoc duong dan field cho HTML editor.
      </div>
    )
  }

  return (
    <div className="wp-html-editor">
      <div className="wp-html-editor__header">
        <div>
          {field?.label ? (
            <label className="wp-html-editor__label">
              {field.label}
            </label>
          ) : null}

          {field?.admin?.description ? (
            <p className="wp-html-editor__description">
              {field.admin.description}
            </p>
          ) : null}
        </div>

        <div className="wp-html-editor__modes">
          {(['visual', 'source', 'preview'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={mode === item ? 'is-active' : ''}
            >
              {item === 'visual' ? 'Soạn thảo' : item === 'source' ? 'HTML' : 'Xem trước'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'visual' ? (
        <>
          <div className="wp-html-editor__toolbar">
            {toolbarGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="wp-html-editor__toolbar-group">
                {group.map((item) => (
                  <button
                    key={`${item.command}-${item.label}`}
                    type="button"
                    title={item.title}
                    onClick={() =>
                      runCommand(
                        item.command,
                        'value' in item ? item.value : undefined,
                      )
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                insertLink()
                syncFromVisual()
              }}
              title="Insert link"
            >
              Link
            </button>

            <button
              type="button"
              onClick={() => {
                insertImage()
                syncFromVisual()
              }}
              title="Insert image by URL"
            >
              Image
            </button>

            <button
              type="button"
              onClick={() => {
                insertTable()
                syncFromVisual()
              }}
              title="Insert table"
            >
              Table
            </button>

            <button
              type="button"
              onClick={() => {
                document.execCommand('removeFormat')
                syncFromVisual()
              }}
              title="Remove formatting"
            >
              Clear
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={syncFromVisual}
            onInput={updateVisualDraft}
            onPaste={handlePaste}
            className="wp-html-editor__canvas"
          />
        </>
      ) : null}

      {mode === 'source' ? (
        <textarea
          value={sourceDraftHtml}
          onChange={(event) => {
            setSourceDraftHtml(event.target.value)
          }}
          onBlur={() => {
            commitHtml(sourceDraftHtml)
          }}
          className="wp-html-editor__source"
          spellCheck={false}
        />
      ) : null}

      {mode === 'preview' ? (
        <div
          className="wp-html-editor__preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : null}
    </div>
  )
}


