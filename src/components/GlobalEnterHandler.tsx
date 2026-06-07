// ví dụ: src/components/GlobalEnterHandler.tsx
'use client'

import { useEffect } from 'react'

export function GlobalEnterHandler() {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return
            if (e.isComposing) return

            const target = e.target as HTMLElement | null
            if (!target) return

            const tag = target.tagName.toLowerCase()
            const isTextArea = tag === 'textarea'
            const isContentEditable = target.isContentEditable
            if (isTextArea || isContentEditable) return

            // optional: chỉ chạy khi KHÔNG có modifier
            if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return

            // 1) ưu tiên submit form gần nhất
            const form = target.closest('form') as HTMLFormElement | null
            if (form) {
                e.preventDefault()
                form.requestSubmit()
                return
            }

            // 2) fallback: click phần tử có data-enter-action gần nhất
            const root = target.closest('[data-enter-scope]') || document
            const action = (root as ParentNode).querySelector('[data-enter-action]') as HTMLElement | null
            if (action) {
                e.preventDefault()
                action.click()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return null
}