'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

import {
    PRICE_MAX,
    PRICE_MIN,
    PRICE_STEP,
} from './search-filters.constants'

import type { PriceRange } from './search-filters.types'

type PriceFilterProps = {
    range: PriceRange
    isPending: boolean
    onRangeChange: (range: PriceRange) => void
    onRangeCommit: (range: PriceRange) => void
    onApply: () => void
}

const clamp = (
    value: number,
    min: number,
    max: number,
) => {
    return Math.min(Math.max(value, min), max)
}

export const PriceFilter = ({
    range,
    isPending,
    onRangeChange,
    onRangeCommit,
    onApply,
}: PriceFilterProps) => {
    const handleMinChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = Number(event.target.value)

        if (!Number.isFinite(value)) return

        onRangeChange([
            clamp(value, PRICE_MIN, range[1]),
            range[1],
        ])
    }

    const handleMaxChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = Number(event.target.value)

        if (!Number.isFinite(value)) return

        onRangeChange([
            range[0],
            clamp(value, range[0], PRICE_MAX),
        ])
    }

    return (
        <div className="space-y-4">
            <h3 className="border-b pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                Khoảng giá
            </h3>

            <Slider
                value={range}
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                onValueChange={(values) => {
                    onRangeChange(values as PriceRange)
                }}
                onValueCommit={(values) => {
                    onRangeCommit(values as PriceRange)
                }}
                className="py-2"
            />

            <div className="grid grid-cols-2 gap-2">
                <Input
                    type="number"
                    value={range[0]}
                    min={PRICE_MIN}
                    max={range[1]}
                    step={PRICE_STEP}
                    onChange={handleMinChange}
                    className="h-9 rounded-lg border-gray-200 bg-white text-xs"
                />

                <Input
                    type="number"
                    value={range[1]}
                    min={range[0]}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    onChange={handleMaxChange}
                    className="h-9 rounded-lg border-gray-200 bg-white text-xs"
                />
            </div>

            <Button
                type="button"
                disabled={isPending}
                onClick={onApply}
                className="h-10 w-full rounded-xl bg-black text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending
                    ? 'Đang cập nhật...'
                    : 'Áp dụng giá'}
            </Button>
        </div>
    )
}