'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SlidersHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'

import { FilterPanel } from './FilterPanel'

import {
  DEFAULT_SORT,
  PRICE_MAX,
  PRICE_MIN,
  SORT_OPTIONS,
} from './search-filters.constants'

import { useFilterNavigation } from './useFilterNavigation'

import type { FilterFacetGroup, PriceRange, SearchFiltersProps } from './search-filters.types'

import './search-filters.css'

const normalizePriceRange = (values: PriceRange): PriceRange => {
  const min = Math.max(PRICE_MIN, Math.min(values[0], PRICE_MAX))
  const max = Math.max(PRICE_MIN, Math.min(values[1], PRICE_MAX))

  return min <= max ? [min, max] : [max, min]
}

const parsePriceParam = (value: string | null, fallback: number) => {
  if (value === null || value.trim() === '') return fallback

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const builtInFacets: FilterFacetGroup[] = [
  {
    key: 'availability',
    title: 'Tình trạng',
    placeholder: 'Chọn tình trạng',
    multiple: true,
    items: [
      { id: 'in-stock', name: 'Còn hàng', slug: 'in-stock' },
      { id: 'out-of-stock', name: 'Tạm hết hàng', slug: 'out-of-stock' },
    ],
  },
  {
    key: 'sale',
    title: 'Ưu đãi',
    placeholder: 'Chọn ưu đãi',
    multiple: true,
    items: [
      { id: 'yes', name: 'Đang giảm giá', slug: 'yes' },
    ],
  },
  {
    key: 'rating',
    title: 'Đánh giá',
    placeholder: 'Chọn mức đánh giá',
    multiple: false,
    items: [
      { id: '4.5', name: 'Từ 4.5 sao', slug: '4.5' },
      { id: '4', name: 'Từ 4 sao', slug: '4' },
      { id: '3', name: 'Từ 3 sao', slug: '3' },
    ],
  },
]

export const SearchFilters = ({
  brands,
  categories = [],
  facets = [],
  resultCount,
  variant = 'responsive',
  sticky = true,
  routeContext = { type: 'listing' },
}: SearchFiltersProps) => {
  const [sheetOpen, setSheetOpen] = useState(false)

  const allFacets = useMemo(
    () => [
      ...builtInFacets,
      ...facets.filter((facet) => facet.items.length > 0),
    ],
    [facets],
  )

  const {
    activeBrand,
    activeCategory,
    activeSort,
    minParam,
    maxParam,
    hasActiveFilters,
    isPending,
    getActiveValues,
    updateFilters,
    toggleFilterValue,
    clearAll,
  } = useFilterNavigation(routeContext)

  const activeFacets = useMemo(() => {
    return Object.fromEntries(
      allFacets.map((facet) => [facet.key, getActiveValues(facet.key)]),
    )
  }, [allFacets, getActiveValues])

  const [range, setRange] = useState<PriceRange>(() =>
    normalizePriceRange([
      parsePriceParam(minParam, PRICE_MIN),
      parsePriceParam(maxParam, PRICE_MAX),
    ]),
  )

  useEffect(() => {
    setRange(
      normalizePriceRange([
        parsePriceParam(minParam, PRICE_MIN),
        parsePriceParam(maxParam, PRICE_MAX),
      ]),
    )
  }, [minParam, maxParam])

  const applyPriceRange = useCallback(
    (nextRange: PriceRange) => {
      const normalizedRange = normalizePriceRange(nextRange)
      setRange(normalizedRange)

      updateFilters({
        min:
          normalizedRange[0] === PRICE_MIN
            ? null
            : String(normalizedRange[0]),
        max:
          normalizedRange[1] === PRICE_MAX
            ? null
            : String(normalizedRange[1]),
      })
    },
    [updateFilters],
  )

  const handleClearAll = useCallback(() => {
    setRange([PRICE_MIN, PRICE_MAX])
    clearAll()
  }, [clearAll])

  const renderPanel = (closeSheetAfterAction = false) => (
    <FilterPanel
      brands={brands}
      categories={categories}
      facets={allFacets}
      activeBrand={activeBrand}
      activeCategory={activeCategory}
      activeSort={activeSort}
      activeFacets={activeFacets}
      range={range}
      isPending={isPending}
      hasActiveFilters={hasActiveFilters}
      resultCount={resultCount}
      onBrandChange={(slug) => updateFilters({ brand: slug })}
      onCategoryChange={(slug) => updateFilters({ category: slug })}
      onSortChange={(value) => {
        updateFilters({
          sort: value === DEFAULT_SORT ? null : value,
        })
      }}
      onFacetToggle={(key, slug) => toggleFilterValue(key, slug)}
      onFacetChange={(key, slug) => updateFilters({ [key]: slug })}
      onRangeChange={(nextRange) => {
        setRange(normalizePriceRange(nextRange))
      }}
      onRangeCommit={applyPriceRange}
      onApplyPrice={() => {
        applyPriceRange(range)

        if (closeSheetAfterAction) {
          setSheetOpen(false)
        }
      }}
      onClearAll={() => {
        handleClearAll()

        if (closeSheetAfterAction) {
          setSheetOpen(false)
        }
      }}
    />
  )

  const resultLabel =
    typeof resultCount === 'number'
      ? `${resultCount.toLocaleString('vi-VN')} sản phẩm`
      : 'Lọc và sắp xếp sản phẩm'

  if (variant === 'responsive') {
    return (
      <>
        <aside
          className={cn(
            'search-filter-shell search-filter-shell--sidebar hidden xl:block',
            sticky && 'search-filter-sticky',
          )}
        >
          {renderPanel()}
        </aside>

        <div
          className={cn(
            'responsive-filter-area xl:hidden',
            sticky && 'responsive-filter-area--sticky',
          )}
        >
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="responsive-filter-trigger"
                aria-label="Mở bộ lọc và sắp xếp"
              >
                <span className="responsive-filter-trigger__icon">
                  <SlidersHorizontal aria-hidden="true" />
                </span>

                <span className="responsive-filter-trigger__content">
                  <strong>Bộ lọc &amp; sắp xếp</strong>
                  <small>{resultLabel}</small>
                </span>

                {hasActiveFilters && (
                  <span className="responsive-filter-trigger__status">
                    Đang lọc
                  </span>
                )}
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="search-filter-sheet-content"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Bộ lọc &amp; sắp xếp</SheetTitle>
              </SheetHeader>

              <div className="search-filter-sheet-frame">
                <div
                  className="search-filter-sheet-topbar"
                  aria-hidden="true"
                >
                  <div className="search-filter-sheet-handle" />
                </div>

                <div className="search-filter-sheet-scroll">
                  <div className="search-filter-shell search-filter-shell--sheet">
                    {renderPanel(true)}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </>
    )
  }

  if (variant === 'sidebar') {
    return (
      <aside
        className={cn(
          'search-filter-shell search-filter-shell--sidebar',
          sticky && 'search-filter-sticky',
        )}
      >
        {renderPanel()}
      </aside>
    )
  }

  if (variant === 'horizontal') {
    return (
      <div
        className={cn(
          'lc-card flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-3 sm:px-4',
          sticky && 'search-filter-horizontal-sticky z-40 shadow-sm backdrop-blur',
        )}
      >
        <Select
          value={activeSort}
          onValueChange={(value) => {
            updateFilters({
              sort: value === DEFAULT_SORT ? null : value,
            })
          }}
        >
          <SelectTrigger className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white text-[11px] font-black uppercase tracking-wider sm:min-w-[170px] sm:flex-none">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>

          <SelectContent className="border border-gray-200 bg-white">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-black uppercase sm:px-4"
            >
              Bộ lọc
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="search-filter-sheet-content"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Bộ lọc nâng cao</SheetTitle>
            </SheetHeader>

            <div className="search-filter-sheet-frame">
              <div
                className="search-filter-sheet-topbar"
                aria-hidden="true"
              >
                <div className="search-filter-sheet-handle" />
              </div>

              <div className="search-filter-sheet-scroll">
                <div className="search-filter-shell search-filter-shell--sheet">
                  {renderPanel(true)}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="mobile-filter-fab"
          aria-label="Mở bộ lọc"
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>Bộ lọc</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="search-filter-sheet-content"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Bộ lọc &amp; sắp xếp</SheetTitle>
        </SheetHeader>

        <div className="search-filter-sheet-frame">
          <div
            className="search-filter-sheet-topbar"
            aria-hidden="true"
          >
            <div className="search-filter-sheet-handle" />
          </div>

          <div className="search-filter-sheet-scroll">
            <div className="search-filter-shell search-filter-shell--sheet">
              {renderPanel(true)}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
