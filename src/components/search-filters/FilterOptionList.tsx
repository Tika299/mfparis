'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import type { FilterItem } from './search-filters.types'

type FilterOptionListProps = {
  title: string
  placeholder: string
  items: FilterItem[]
  activeSlug?: string | null
  activeSlugs?: string[]
  emptyMessage: string
  showGridButton?: boolean
  multiple?: boolean
  description?: string
  onSelect?: (slug: string | null) => void
  onToggle?: (slug: string) => void
  collapsedByDefault?: boolean
}

export const FilterOptionList = ({
  title, placeholder, items, activeSlug, activeSlugs = [],
  emptyMessage, multiple = false, description, onSelect, onToggle, collapsedByDefault,
}: FilterOptionListProps) => {
  const [open, setOpen] = useState(() => !collapsedByDefault)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(12)
  const id = useId()
  const selected = new Set(multiple ? activeSlugs : activeSlug ? [activeSlug] : [])
  const normalize = (text: string) => text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
  const keyword = normalize(query.trim())
  const matches = open ? items.filter(item =>
    !selected.has(item.slug) && normalize(item.name).includes(keyword)) : []
  const visible = open ? [
    ...items.filter(item => selected.has(item.slug)),
    ...matches.slice(0, limit),
  ] : []

  return (
    <section className="filter-section">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id}
          className="flex w-full items-center justify-between gap-2 py-2 text-left font-semibold"
          onClick={() => setOpen(value => !value)}>
          <span>{title}{selected.size > 0 ? ` · Đã chọn ${selected.size}` : ''}</span>
          <ChevronDown aria-hidden="true" size={18}
            className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={id}>
        {open && (
          <div className="space-y-3">
            {description && <p>{description}</p>}
            <input type="search" value={query} aria-label={`Tìm ${title}`}
              placeholder={placeholder} className="w-full rounded border p-2 text-sm"
              onChange={event => { setQuery(event.target.value); setLimit(12) }} />
            {visible.length === 0 && <p>{items.length ? 'Không tìm thấy lựa chọn' : emptyMessage}</p>}
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {visible.map(item => (
                <label key={item.id} className="flex cursor-pointer items-start gap-2 py-1">
                  <input type="checkbox" checked={selected.has(item.slug)}
                    className="mt-1 shrink-0"
                    onChange={() => multiple ? onToggle?.(item.slug)
                      : onSelect?.(selected.has(item.slug) ? null : item.slug)} />
                  <span className="min-w-0 break-words text-sm">{item.name}</span>
                </label>
              ))}
            </div>
            {matches.length > limit && <button type="button"
              className="py-2 text-sm underline"
              onClick={() => setLimit(value => value + 12)}>Xem thêm</button>}
          </div>
        )}
      </div>
    </section>
  )
}