'use client'

import { Filter as FilterIcon, RotateCcw, Trash2 } from 'lucide-react'

import { FilterLoadingOverlay } from './FilterLoadingOverlay'
import { FilterOptionList } from './FilterOptionList'
import { PriceFilter } from './PriceFilter'
import { SortFilter } from './SortFilter'

import type { FilterItem, PriceRange } from './search-filters.types'

type FilterPanelProps = {
    brands: FilterItem[]
    categories: FilterItem[]
    activeBrand: string | null
    activeCategory: string | null
    activeSort: string
    range: PriceRange
    isPending: boolean
    hasActiveFilters: boolean
    resultCount?: number
    onBrandChange: (slug: string | null) => void
    onCategoryChange: (slug: string | null) => void
    onSortChange: (value: string) => void
    onRangeChange: (range: PriceRange) => void
    onRangeCommit: (range: PriceRange) => void
    onApplyPrice: () => void
    onClearAll: () => void
}

export const FilterPanel = ({
    brands,
    categories,
    activeBrand,
    activeCategory,
    activeSort,
    range,
    isPending,
    hasActiveFilters,
    resultCount,
    onBrandChange,
    onCategoryChange,
    onSortChange,
    onRangeChange,
    onRangeCommit,
    onApplyPrice,
    onClearAll,
}: FilterPanelProps) => {
    const countLabel =
        typeof resultCount === 'number'
            ? ` (${resultCount.toLocaleString('vi-VN')})`
            : ''

    return (
        <div className="filter-container" aria-busy={isPending}>
            {isPending && <FilterLoadingOverlay />}

            <fieldset
                disabled={isPending}
                className={`filter-fieldset${isPending ? ' is-loading' : ''}`}
            >
                <div className="filter-header">
                    <h2>BỘ LỌC</h2>

                    <button
                        type="button"
                        className="clear-all"
                        disabled={!hasActiveFilters}
                        onClick={onClearAll}
                    >
                        <RotateCcw aria-hidden="true" />
                        <span>Xóa bộ lọc</span>
                    </button>
                </div>

                <SortFilter value={activeSort} onChange={onSortChange} />

                <PriceFilter
                    range={range}
                    onRangeChange={onRangeChange}
                    onRangeCommit={onRangeCommit}
                />

                <FilterOptionList
                    title="Danh mục"
                    placeholder="Chọn danh mục"
                    items={categories}
                    activeSlug={activeCategory}
                    emptyMessage="Chưa có danh mục"
                    showGridButton
                    onSelect={onCategoryChange}
                />

                <FilterOptionList
                    title="Thương hiệu"
                    placeholder="Chọn thương hiệu"
                    items={brands}
                    activeSlug={activeBrand}
                    emptyMessage="Chưa có thương hiệu"
                    onSelect={onBrandChange}
                />

                <div className="filter-actions">
                    <button
                        type="button"
                        className="apply-filter"
                        disabled={isPending}
                        onClick={onApplyPrice}
                    >
                        <FilterIcon aria-hidden="true" />
                        <span>ÁP DỤNG BỘ LỌC{countLabel}</span>
                    </button>

                    <button
                        type="button"
                        className="clear-filters-bottom"
                        disabled={!hasActiveFilters || isPending}
                        onClick={onClearAll}
                    >
                        <Trash2 aria-hidden="true" />
                        <span>XÓA TẤT CẢ</span>
                    </button>
                </div>
            </fieldset>
        </div>
    )
}
