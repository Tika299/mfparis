'use client'

import { ChevronDown } from 'lucide-react'

import { SORT_OPTIONS } from './search-filters.constants'

type SortFilterProps = {
    value: string
    onChange: (value: string) => void
}

export const SortFilter = ({ value, onChange }: SortFilterProps) => {
    return (
        <div className="filter-section">
            <h3>Sắp xếp theo</h3>

            <div className="select-wrapper">
                <select
                    value={value}
                    aria-label="Sắp xếp theo"
                    onChange={(event) => onChange(event.target.value)}
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <ChevronDown aria-hidden="true" className="select-arrow" />
            </div>
        </div>
    )
}
