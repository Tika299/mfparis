'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'

type FilterItem = {
  id: string | number
  name: string
  slug: string
}

type SearchFiltersProps = {
  brands: FilterItem[]
  categories?: FilterItem[]
  variant?: 'sidebar' | 'horizontal' | 'mobile-fab'
}

export const SearchFilters = ({
  brands,
  categories = [],
  variant = 'sidebar',
}: SearchFiltersProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const [brandOpen, setBrandOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const isCategorySlugPage = /^\/categories\/[^/]+$/.test(pathname)
  const isBrandSlugPage = /^\/brands\/[^/]+$/.test(pathname)

  const [range, setRange] = useState([
    Number(searchParams.get('min')) || 0,
    Number(searchParams.get('max')) || 5000000,
  ])

  useEffect(() => {
    setRange([Number(searchParams.get('min')) || 0, Number(searchParams.get('max')) || 5000000])
  }, [searchParams])

  const activeBrand = searchParams.get('brand')
  const activeCategory = searchParams.get('category')
  const activeSort = searchParams.get('sort') || '-createdAt'

  const hasBrandActive = Boolean(activeBrand)
  const hasCategoryActive = Boolean(activeCategory)

  useEffect(() => {
    if (hasBrandActive) setBrandOpen(true)
    if (hasCategoryActive) setCategoryOpen(true)
  }, [hasBrandActive, hasCategoryActive])

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })

    // Khi đang ở /categories/[slug], chọn category mới thì điều hướng sang slug mới
    if (isCategorySlugPage && typeof updates.category === 'string') {
      params.delete('category')
      const query = params.toString()
      router.push(`/categories/${updates.category}${query ? `?${query}` : ''}`, { scroll: false })
      return
    }

    // Khi đang ở /brands/[slug], chọn brand mới thì điều hướng sang slug mới
    if (isBrandSlugPage && typeof updates.brand === 'string') {
      params.delete('brand')
      const query = params.toString()
      router.push(`/brands/${updates.brand}${query ? `?${query}` : ''}`, { scroll: false })
      return
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const clearAll = () => {
    router.push(pathname, { scroll: false })
  }

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchParams.get('brand') ||
      searchParams.get('category') ||
      searchParams.get('min') ||
      searchParams.get('max') ||
      (searchParams.get('sort') && searchParams.get('sort') !== '-createdAt'),
    )
  }, [searchParams])

  const sectionHeaderClass =
    'flex w-full items-center justify-between border-b pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500'
  const collapseIconClass = (open: boolean) =>
    `transition-transform duration-200 ${open ? 'rotate-180' : ''}`

  const chipsWrapClass = (open: boolean) =>
    `${open ? 'max-h-[320px]' : 'max-h-0'} overflow-hidden transition-all duration-300`

  const filterBody = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Bộ lọc</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-black"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="border-b pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
          Sắp xếp theo
        </h3>
        <Select value={activeSort} onValueChange={(val) => updateFilters({ sort: val })}>
          <SelectTrigger className="h-10 w-full rounded-xl border border-gray-200 bg-white text-[11px] font-bold uppercase tracking-wider">
            <SelectValue placeholder="Mặc định" />
          </SelectTrigger>
          <SelectContent className="border border-gray-200 bg-white">
            <SelectItem value="-createdAt">Mới nhất</SelectItem>
            <SelectItem value="price.basePrice">Giá: Thấp đến Cao</SelectItem>
            <SelectItem value="-price.basePrice">Giá: Cao đến Thấp</SelectItem>
            <SelectItem value="title">Tên: A - Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="border-b pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
          Khoảng giá
        </h3>
        <Slider
          value={range}
          max={10000000}
          step={100000}
          onValueChange={(vals) => setRange(vals)}
          className="py-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            value={range[0]}
            onChange={(e) => setRange([Number(e.target.value), range[1]])}
            className="h-9 rounded-lg border-gray-200 bg-white text-xs"
          />
          <Input
            type="number"
            value={range[1]}
            onChange={(e) => setRange([range[0], Number(e.target.value)])}
            className="h-9 rounded-lg border-gray-200 bg-white text-xs"
          />
        </div>
        <Button
          onClick={() => updateFilters({ min: String(range[0]), max: String(range[1]) })}
          className="h-10 w-full rounded-xl bg-black text-[10px] font-black uppercase tracking-widest text-white"
        >
          Áp dụng giá
        </Button>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setCategoryOpen((v) => !v)}
          className={sectionHeaderClass}
          aria-expanded={categoryOpen}
        >
          <span>Danh mục</span>
          <ChevronDown size={14} className={collapseIconClass(categoryOpen)} />
        </button>

        <div className={chipsWrapClass(categoryOpen)}>
          <div className="flex flex-wrap gap-2 pt-1">
            {categories.length > 0 ? (
              categories.map((c) => {
                const isActive = activeCategory === c.slug
                return (
                  <button
                    key={c.id}
                    onClick={() => updateFilters({ category: isActive ? null : c.slug })}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${isActive
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600'
                      }`}
                  >
                    {c.name}
                  </button>
                )
              })
            ) : (
              <p className="text-xs text-gray-400">Chưa có danh mục</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setBrandOpen((v) => !v)}
          className={sectionHeaderClass}
          aria-expanded={brandOpen}
        >
          <span>Thương hiệu</span>
          <ChevronDown size={14} className={collapseIconClass(brandOpen)} />
        </button>

        <div className={chipsWrapClass(brandOpen)}>
          <div className="flex flex-wrap gap-2 pt-1">
            {brands.map((b) => {
              const isActive = activeBrand === b.slug
              return (
                <button
                  key={b.id}
                  onClick={() => updateFilters({ brand: isActive ? null : b.slug })}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${isActive
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-600'
                    }`}
                >
                  {b.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  if (variant === 'sidebar') return filterBody

  if (variant === 'horizontal') {
    return (
      <div className="lc-card flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3">
        <Select value={activeSort} onValueChange={(val) => updateFilters({ sort: val })}>
          <SelectTrigger className="h-9 min-w-[150px] rounded-xl border border-gray-200 bg-white text-[10px] font-black uppercase tracking-wider">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent className="border border-gray-200 bg-white">
            <SelectItem value="-createdAt">Mới nhất</SelectItem>
            <SelectItem value="price.basePrice">Giá: Thấp đến Cao</SelectItem>
            <SelectItem value="-price.basePrice">Giá: Cao đến Thấp</SelectItem>
            <SelectItem value="title">Tên: A - Z</SelectItem>
          </SelectContent>
        </Select>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-black uppercase">
              Thêm bộ lọc
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] overflow-y-auto bg-white p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>Bộ lọc nâng cao</SheetTitle>
            </SheetHeader>
            {filterBody}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button className="rounded-full bg-black px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal size={14} /> Bộ lọc
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-6"
      >
        <SheetHeader className="mb-5">
          <SheetTitle>Bộ lọc & Sắp xếp</SheetTitle>
        </SheetHeader>
        {filterBody}
      </SheetContent>
    </Sheet>
  )
}