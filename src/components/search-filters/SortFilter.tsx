'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { SORT_OPTIONS } from './search-filters.constants'

type SortFilterProps = {
    value: string
    onChange: (value: string) => void
}

export const SortFilter = ({
    value,
    onChange,
}: SortFilterProps) => {
    return (
        <div className="space-y-3">
            <h3 className="border-b pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                Sắp xếp theo
            </h3>

            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-10 w-full rounded-xl border border-gray-200 bg-white text-[11px] font-bold uppercase tracking-wider">
                    <SelectValue placeholder="Mặc định" />
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
        </div>
    )
}