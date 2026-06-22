'use client'

import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { FilterItem } from './search-filters.types'

type FilterOptionListProps = {
    title: string
    items: FilterItem[]
    activeSlug: string | null
    open: boolean
    emptyMessage: string
    onOpenChange: (open: boolean) => void
    onSelect: (slug: string | null) => void
}

export const FilterOptionList = ({
    title,
    items,
    activeSlug,
    open,
    emptyMessage,
    onOpenChange,
    onSelect,
}: FilterOptionListProps) => {
    return (
        <div className="space-y-1">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => onOpenChange(!open)}
                className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-white pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500"
            >
                <span>{title}</span>

                <ChevronDown
                    size={14}
                    className={cn(
                        'transition-transform duration-200',
                        open && 'rotate-180',
                    )}
                />
            </button>

            <div
                className={cn(
                    'transition-all duration-300 ease-in-out',
                    'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 pr-2',
                    open
                        ? 'mt-3 max-h-[350px] overflow-y-auto opacity-100'
                        : 'max-h-0 overflow-hidden opacity-0',
                )}
            >
                <div className="flex flex-wrap gap-2 pb-2">
                    {items.length === 0 && (
                        <p className="text-xs text-gray-400">
                            {emptyMessage}
                        </p>
                    )}

                    {items.map((item) => {
                        const isActive =
                            activeSlug === item.slug

                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => {
                                    onSelect(
                                        isActive ? null : item.slug,
                                    )
                                }}
                                className={cn(
                                    'rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all',
                                    isActive
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300',
                                )}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <span>{item.name}</span>

                                    {typeof item.count === 'number' && (
                                        <span
                                            className={cn(
                                                'tabular-nums',
                                                isActive
                                                    ? 'text-white/70'
                                                    : 'text-gray-400',
                                            )}
                                        >
                                            (
                                            {item.count.toLocaleString(
                                                'vi-VN',
                                            )}
                                            )
                                        </span>
                                    )}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}