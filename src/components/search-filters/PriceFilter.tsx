'use client'

import type { ChangeEvent, PointerEvent } from 'react'

import {
    PRICE_MAX,
    PRICE_MIN,
    PRICE_STEP,
} from './search-filters.constants'

import type { PriceRange } from './search-filters.types'

type PriceFilterProps = {
    range: PriceRange
    onRangeChange: (range: PriceRange) => void
    onRangeCommit: (range: PriceRange) => void
}

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max)

const money = new Intl.NumberFormat('vi-VN')
const formatPrice = (value: number) => `${money.format(value)}đ`

export const PriceFilter = ({
    range,
    onRangeChange,
    onRangeCommit,
}: PriceFilterProps) => {
    const total = PRICE_MAX - PRICE_MIN
    const minPercent = ((range[0] - PRICE_MIN) / total) * 100
    const maxPercent = ((range[1] - PRICE_MIN) / total) * 100

    const handleMinInput = (event: ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value)
        if (!Number.isFinite(value)) return

        onRangeChange([
            clamp(value, PRICE_MIN, range[1]),
            range[1],
        ])
    }

    const handleMaxInput = (event: ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value)
        if (!Number.isFinite(value)) return

        onRangeChange([
            range[0],
            clamp(value, range[0], PRICE_MAX),
        ])
    }

    const commitMin = (event: PointerEvent<HTMLInputElement>) => {
        const value = Number(event.currentTarget.value)
        onRangeCommit([clamp(value, PRICE_MIN, range[1]), range[1]])
    }

    const commitMax = (event: PointerEvent<HTMLInputElement>) => {
        const value = Number(event.currentTarget.value)
        onRangeCommit([range[0], clamp(value, range[0], PRICE_MAX)])
    }

    return (
        <div className="filter-section">
            <h3>Khoảng giá</h3>

            <div className="price-range">
                <div className="price-display-row">
                    <span className="min-price-display">
                        {formatPrice(range[0])}
                    </span>
                    <span className="max-price-display">
                        {formatPrice(range[1])}
                    </span>
                </div>

                <div className="slider-wrapper">
                    <div className="slider-track" />
                    <div
                        className="slider-range"
                        style={{
                            left: `${minPercent}%`,
                            right: `${100 - maxPercent}%`,
                        }}
                    />

                    <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        step={PRICE_STEP}
                        value={range[0]}
                        aria-label="Giá thấp nhất"
                        className="slider slider-min"
                        onChange={handleMinInput}
                        onPointerUp={commitMin}
                    />

                    <input
                        type="range"
                        min={PRICE_MIN}
                        max={PRICE_MAX}
                        step={PRICE_STEP}
                        value={range[1]}
                        aria-label="Giá cao nhất"
                        className="slider slider-max"
                        onChange={handleMaxInput}
                        onPointerUp={commitMax}
                    />
                </div>
            </div>

            <div className="price-inputs">
                <div className="input-group">
                    <input
                        type="number"
                        value={range[0]}
                        min={PRICE_MIN}
                        max={range[1]}
                        step={PRICE_STEP}
                        aria-label="Nhập giá thấp nhất"
                        onChange={handleMinInput}
                    />
                    <span>đ</span>
                </div>

                <span>-</span>

                <div className="input-group">
                    <input
                        type="number"
                        value={range[1]}
                        min={range[0]}
                        max={PRICE_MAX}
                        step={PRICE_STEP}
                        aria-label="Nhập giá cao nhất"
                        onChange={handleMaxInput}
                    />
                    <span>đ</span>
                </div>
            </div>
        </div>
    )
}
