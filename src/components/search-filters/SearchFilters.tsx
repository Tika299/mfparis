'use client'

import {
    useCallback,
    useEffect,
    useState,
} from 'react'

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

import type {
    PriceRange,
    SearchFiltersProps,
} from './search-filters.types'

const normalizePriceRange = (
    values: PriceRange,
): PriceRange => {
    const min = Math.max(
        PRICE_MIN,
        Math.min(values[0], PRICE_MAX),
    )

    const max = Math.max(
        PRICE_MIN,
        Math.min(values[1], PRICE_MAX),
    )

    return min <= max
        ? [min, max]
        : [max, min]
}

const parsePriceParam = (
    value: string | null,
    fallback: number,
) => {
    if (value === null || value.trim() === '') {
        return fallback
    }

    const parsedValue = Number(value)

    return Number.isFinite(parsedValue)
        ? parsedValue
        : fallback
}

export const SearchFilters = ({
    brands,
    categories = [],
    variant = 'sidebar',
    sticky = true,
    routeContext = {
        type: 'listing',
    },
}: SearchFiltersProps) => {
    const [sheetOpen, setSheetOpen] =
        useState(false)

    const [brandOpen, setBrandOpen] =
        useState(false)

    const [categoryOpen, setCategoryOpen] =
        useState(false)

    const {
        activeBrand,
        activeCategory,
        activeSort,
        minParam,
        maxParam,
        hasActiveFilters,
        isPending,
        updateFilters,
        clearAll,
    } = useFilterNavigation(routeContext)

    const [range, setRange] =
        useState<PriceRange>(() =>
            normalizePriceRange([
                parsePriceParam(
                    minParam,
                    PRICE_MIN,
                ),
                parsePriceParam(
                    maxParam,
                    PRICE_MAX,
                ),
            ]),
        )

    useEffect(() => {
        setRange(
            normalizePriceRange([
                parsePriceParam(
                    minParam,
                    PRICE_MIN,
                ),
                parsePriceParam(
                    maxParam,
                    PRICE_MAX,
                ),
            ]),
        )
    }, [minParam, maxParam])

    useEffect(() => {
        if (activeBrand) {
            setBrandOpen(true)
        }
    }, [activeBrand])

    useEffect(() => {
        if (activeCategory) {
            setCategoryOpen(true)
        }
    }, [activeCategory])

    const applyPriceRange = useCallback(
        (nextRange: PriceRange) => {
            const normalizedRange =
                normalizePriceRange(nextRange)

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

    const handleClearAll = () => {
        setRange([PRICE_MIN, PRICE_MAX])
        clearAll()
    }

    const panel = (
        <FilterPanel
            brands={brands}
            categories={categories}
            activeBrand={activeBrand}
            activeCategory={activeCategory}
            activeSort={activeSort}
            range={range}
            isPending={isPending}
            hasActiveFilters={hasActiveFilters}
            brandOpen={brandOpen}
            categoryOpen={categoryOpen}
            onBrandOpenChange={setBrandOpen}
            onCategoryOpenChange={
                setCategoryOpen
            }
            onBrandChange={(slug) => {
                updateFilters({
                    brand: slug,
                })
            }}
            onCategoryChange={(slug) => {
                updateFilters({
                    category: slug,
                })
            }}
            onSortChange={(value) => {
                updateFilters({
                    sort:
                        value === DEFAULT_SORT
                            ? null
                            : value,
                })
            }}
            onRangeChange={(nextRange) => {
                setRange(
                    normalizePriceRange(nextRange),
                )
            }}
            onRangeCommit={(nextRange) => {
                applyPriceRange(nextRange)
            }}
            onApplyPrice={() => {
                applyPriceRange(range)
            }}
            onClearAll={handleClearAll}
        />
    )

    if (variant === 'sidebar') {
        return (
            <aside
                className={cn(
                    'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm',
                    sticky &&
                    'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto',
                )}
            >
                {panel}
            </aside>
        )
    }

    if (variant === 'horizontal') {
        return (
            <div
                className={cn(
                    'lc-card flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3',
                    sticky &&
                    'sticky top-20 z-40 shadow-sm backdrop-blur',
                )}
            >
                <Select
                    value={activeSort}
                    onValueChange={(value) => {
                        updateFilters({
                            sort:
                                value === DEFAULT_SORT
                                    ? null
                                    : value,
                        })
                    }}
                >
                    <SelectTrigger className="h-9 min-w-[150px] rounded-xl border border-gray-200 bg-white text-[10px] font-black uppercase tracking-wider">
                        <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>

                    <SelectContent className="border border-gray-200 bg-white">
                        {SORT_OPTIONS.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Sheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                >
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-black uppercase"
                        >
                            Thêm bộ lọc
                        </button>
                    </SheetTrigger>

                    <SheetContent
                        side="right"
                        className="w-[320px] overflow-y-auto bg-white p-6"
                    >
                        <SheetHeader className="mb-4">
                            <SheetTitle>
                                Bộ lọc nâng cao
                            </SheetTitle>
                        </SheetHeader>

                        {panel}
                    </SheetContent>
                </Sheet>
            </div>
        )
    }

    return (
        <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
        >
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="rounded-full bg-black px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl"
                >
                    <span className="inline-flex items-center gap-2">
                        <SlidersHorizontal size={14} />
                        Bộ lọc
                    </span>
                </button>
            </SheetTrigger>

            <SheetContent
                side="bottom"
                className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-6"
            >
                <SheetHeader className="mb-5">
                    <SheetTitle>
                        Bộ lọc &amp; Sắp xếp
                    </SheetTitle>
                </SheetHeader>

                {panel}
            </SheetContent>
        </Sheet>
    )
}