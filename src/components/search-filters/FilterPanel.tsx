'use client'

import { Filter as FilterIcon, RotateCcw, Trash2 } from 'lucide-react'

import { FilterLoadingOverlay } from './FilterLoadingOverlay'
import { FilterOptionList } from './FilterOptionList'
import { PriceFilter } from './PriceFilter'
import { SortFilter } from './SortFilter'

import type { FilterFacetGroup, FilterItem, PriceRange } from './search-filters.types'

type FilterPanelProps = {
  brands: FilterItem[]
  categories: FilterItem[]
  facets: FilterFacetGroup[]
  activeBrand: string | null
  activeCategory: string | null
  activeSort: string
  activeFacets: Record<string, string[]>
  range: PriceRange
  isPending: boolean
  hasActiveFilters: boolean
  resultCount?: number
  onBrandChange: (slug: string | null) => void
  onCategoryChange: (slug: string | null) => void
  onSortChange: (value: string) => void
  onFacetToggle: (key: string, slug: string) => void
  onFacetChange: (key: string, slug: string | null) => void
  onRangeChange: (range: PriceRange) => void
  onRangeCommit: (range: PriceRange) => void
  onApplyPrice: () => void
  onClearAll: () => void
}

export const FilterPanel = ({
  brands,
  categories,
  facets,
  activeBrand,
  activeCategory,
  activeSort,
  activeFacets,
  range,
  isPending,
  hasActiveFilters,
  resultCount,
  onBrandChange,
  onCategoryChange,
  onSortChange,
  onFacetToggle,
  onFacetChange,
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
          <div>
            <p className="filter-kicker">MF Paris Finder</p>
            <h2>Bộ lọc sản phẩm</h2>
          </div>

          <button
            type="button"
            className="clear-all"
            disabled={!hasActiveFilters}
            onClick={onClearAll}
          >
            <RotateCcw aria-hidden="true" />
            <span>Xóa lọc</span>
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

        {facets.map((facet) => (
          <FilterOptionList
            key={facet.key}
            title={facet.title}
            placeholder={facet.placeholder}
            items={facet.items}
            activeSlug={activeFacets[facet.key]?.[0] ?? null}
            activeSlugs={activeFacets[facet.key] ?? []}
            emptyMessage={facet.emptyMessage ?? 'Chưa có lựa chọn'}
            multiple={facet.multiple ?? true}
            description={facet.description}
            onSelect={(slug) => onFacetChange(facet.key, slug)}
            onToggle={(slug) => onFacetToggle(facet.key, slug)}
          />
        ))}

        <div className="filter-actions">
          <button
            type="button"
            className="apply-filter"
            disabled={isPending}
            onClick={onApplyPrice}
          >
            <FilterIcon aria-hidden="true" />
            <span>Áp dụng bộ lọc{countLabel}</span>
          </button>

          <button
            type="button"
            className="clear-filters-bottom"
            disabled={!hasActiveFilters || isPending}
            onClick={onClearAll}
          >
            <Trash2 aria-hidden="true" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      </fieldset>
    </div>
  )
}
