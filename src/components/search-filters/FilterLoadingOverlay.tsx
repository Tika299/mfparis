'use client'

import { LoaderCircle } from 'lucide-react'

export function FilterLoadingOverlay() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="filter-loading-overlay"
        >
            <div className="filter-loading-pill">
                <LoaderCircle aria-hidden="true" />
                <span>Đang cập nhật sản phẩm...</span>
            </div>

            <span className="sr-only">
                Danh sách sản phẩm đang được cập nhật
            </span>
        </div>
    )
}
