'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const SearchFilters = ({ brands }: { brands: any[] }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State cục bộ cho Price
  const [range, setRange] = useState([
    Number(searchParams.get('min')) || 0,
    Number(searchParams.get('max')) || 5000000,
  ])

  // Cập nhật URL khi nhấn "Áp dụng" hoặc thay đổi sắp xếp
  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="space-y-10">
      {/* 1. SẮP XẾP (SORT) */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] border-b pb-4">
          Sắp xếp theo
        </h3>
        <Select
          defaultValue={searchParams.get('sort') || '-createdAt'}
          onValueChange={(val) => updateFilters({ sort: val })}
        >
          <SelectTrigger className="w-full bg-white rounded-xl border-gray-100 uppercase text-[10px] font-bold tracking-widest">
            <SelectValue placeholder="Mặc định" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-createdAt">Mới nhất</SelectItem>
            <SelectItem value="price.basePrice">Giá: Thấp đến Cao</SelectItem>
            <SelectItem value="-price.basePrice">Giá: Cao đến Thấp</SelectItem>
            <SelectItem value="title">Tên: A - Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2. LỌC GIÁ (PRICE RANGE) */}
      <div className="space-y-6">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] border-b pb-4">
          Khoảng giá (₫)
        </h3>

        {/* Thanh kéo Slider */}
        <Slider
          defaultValue={range}
          max={10000000}
          step={100000}
          onValueChange={(vals) => setRange(vals)}
          className="py-4"
        />

        {/* Ô nhập giá thủ công */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 uppercase font-bold">Từ</span>
            <Input
              type="number"
              value={range[0]}
              onChange={(e) => setRange([Number(e.target.value), range[1]])}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 uppercase font-bold">Đến</span>
            <Input
              type="number"
              value={range[1]}
              onChange={(e) => setRange([range[0], Number(e.target.value)])}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        <Button
          onClick={() => updateFilters({ min: range[0].toString(), max: range[1].toString() })}
          className="w-full bg-black text-white text-[10px] uppercase font-black tracking-widest rounded-xl h-10"
        >
          Áp dụng giá
        </Button>
      </div>

      {/* 3. THƯƠNG HIỆU */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] border-b pb-4">
          Thương hiệu
        </h3>
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() =>
                updateFilters({ brand: searchParams.get('brand') === b.slug ? null : b.slug })
              }
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border transition-all ${
                searchParams.get('brand') === b.slug
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-black'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
