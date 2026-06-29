'use client'

import { ChevronDown, Grid2X2 } from 'lucide-react'

import type { FilterItem } from './search-filters.types'

type FilterOptionListProps = {
    title: string
    placeholder: string
    items: FilterItem[]
    activeSlug: string | null
    emptyMessage: string
    showGridButton?: boolean
    onSelect: (slug: string | null) => void
}

export const FilterOptionList = ({
    title,
    placeholder,
    items,
    activeSlug,
    emptyMessage,
    showGridButton = false,
    onSelect,
}: FilterOptionListProps) => {
    const select = (
        <div className="select-wrapper">
            <select
                value={activeSlug ?? ''}
                aria-label={title}
                disabled={items.length === 0}
                onChange={(event) => {
                    onSelect(event.target.value || null)
                }}
            >
                <option value="">
                    {items.length === 0 ? emptyMessage : placeholder}
                </option>

                {items.map((item) => (
                    <option key={item.id} value={item.slug}>
                        {item.name}
                        {typeof item.count === 'number'
                            ? ` (${item.count.toLocaleString('vi-VN')})`
                            : ''}
                    </option>
                ))}
            </select>

            <ChevronDown aria-hidden="true" className="select-arrow" />
        </div>
    )

    return (
        <div className="filter-section">
            <h3>{title}</h3>

            {showGridButton ? (
                <div className="category-select-group">
                    {select}

                    <button
                        type="button"
                        className="grid-button"
                        aria-label="Xem danh mục dạng lưới"
                    >
                        <Grid2X2 aria-hidden="true" />
                    </button>
                </div>
            ) : (
                select
            )}
        </div>
    )
}
