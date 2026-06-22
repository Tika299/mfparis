'use client'

import { FilterOptionList } from './FilterOptionList'
import { PriceFilter } from './PriceFilter'
import { SortFilter } from './SortFilter'
import { cn } from '@/lib/utils'
import { FilterLoadingOverlay } from './FilterLoadingOverlay'

import type {
    FilterItem,
    PriceRange,
} from './search-filters.types'

type FilterPanelProps = {
    brands: FilterItem[]
    categories: FilterItem[]

    activeBrand: string | null
    activeCategory: string | null
    activeSort: string

    range: PriceRange
    isPending: boolean
    hasActiveFilters: boolean

    brandOpen: boolean
    categoryOpen: boolean

    onBrandOpenChange: (open: boolean) => void
    onCategoryOpenChange: (open: boolean) => void

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
    brandOpen,
    categoryOpen,
    onBrandOpenChange,
    onCategoryOpenChange,
    onBrandChange,
    onCategoryChange,
    onSortChange,
    onRangeChange,
    onRangeCommit,
    onApplyPrice,
    onClearAll,
}: FilterPanelProps) => {
    return (
        <div
            className="relative"
            aria-busy={isPending}
        >
            {isPending && <FilterLoadingOverlay />}

            <fieldset
                disabled={isPending}
                className={cn(
                    'min-w-0 space-y-6 transition-opacity duration-200',
                    isPending &&
                    'pointer-events-none select-none opacity-50',
                )}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Bộ lọc
                    </h3>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-black"
                        >
                            Xóa tất cả
                        </button>
                    )}
                </div>

                <SortFilter
                    value={activeSort}
                    onChange={onSortChange}
                />

                <PriceFilter
                    range={range}
                    isPending={isPending}
                    onRangeChange={onRangeChange}
                    onRangeCommit={onRangeCommit}
                    onApply={onApplyPrice}
                />

                <FilterOptionList
                    title="Danh mục"
                    items={categories}
                    activeSlug={activeCategory}
                    open={categoryOpen}
                    emptyMessage="Chưa có danh mục"
                    onOpenChange={
                        onCategoryOpenChange
                    }
                    onSelect={onCategoryChange}
                />

                <FilterOptionList
                    title="Thương hiệu"
                    items={brands}
                    activeSlug={activeBrand}
                    open={brandOpen}
                    emptyMessage="Chưa có thương hiệu"
                    onOpenChange={onBrandOpenChange}
                    onSelect={onBrandChange}
                />
            </fieldset>
        </div>
    )
}