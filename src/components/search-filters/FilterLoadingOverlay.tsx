'use client'

import { LoaderCircle } from 'lucide-react'

export function FilterLoadingOverlay() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-30 flex items-start justify-center rounded-2xl bg-white/60 pt-20 backdrop-blur-[1px]"
        >
            <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-lg">
                <LoaderCircle
                    aria-hidden="true"
                    size={16}
                    className="animate-spin"
                />

                <span>Đang cập nhật sản phẩm...</span>
            </div>

            <span className="sr-only">
                Danh sách sản phẩm đang được cập nhật
            </span>
        </div>
    )
}