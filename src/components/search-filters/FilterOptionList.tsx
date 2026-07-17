'use client'

import { Check, ChevronDown, Grid2X2 } from 'lucide-react'

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
}

export const FilterOptionList = ({
  title,
  placeholder,
  items,
  activeSlug,
  activeSlugs = [],
  emptyMessage,
  showGridButton = false,
  multiple = false,
  description,
  onSelect,
  onToggle,
}: FilterOptionListProps) => {
  if (multiple) {
    const activeSet = new Set(activeSlugs)

    return (
      <div className="filter-section">
        <div className="filter-section-heading">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>

        {items.length === 0 ? (
          <p className="filter-empty-message">{emptyMessage}</p>
        ) : (
          <div className="filter-chip-list" role="group" aria-label={title}>
            {items.map((item) => {
              const active = activeSet.has(item.slug)

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`filter-chip${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onToggle?.(item.slug)}
                >
                  <span className="filter-chip__check" aria-hidden="true">
                    {active ? <Check /> : null}
                  </span>
                  <span className="filter-chip__label">{item.name}</span>
                  {typeof item.count === 'number' ? (
                    <span className="filter-chip__count">
                      {item.count.toLocaleString('vi-VN')}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const select = (
    <div className="select-wrapper">
      <select
        value={activeSlug ?? ''}
        aria-label={title}
        disabled={items.length === 0}
        onChange={(event) => {
          onSelect?.(event.target.value || null)
        }}
      >
        <option value="">
          {items.length === 0 ? emptyMessage : placeholder}
        </option>

        {items.map((item) => (
          <option key={item.id} value={item.slug}>
            {item.name}
            {typeof item.count === 'number'
              ? ` (${item.count.toLocaleString('vi-VN')})`
              : ''}
          </option>
        ))}
      </select>

      <ChevronDown aria-hidden="true" className="select-arrow" />
    </div>
  )

  return (
    <div className="filter-section">
      <div className="filter-section-heading">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>

      {showGridButton ? (
        <div className="category-select-group">
          {select}

          <button
            type="button"
            className="grid-button"
            aria-label="Xem danh mục dạng lưới"
          >
            <Grid2X2 aria-hidden="true" />
          </button>
        </div>
      ) : (
        select
      )}
    </div>
  )
}
