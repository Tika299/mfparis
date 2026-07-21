'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import type { HeaderSearchBrand } from '@/data/getHeaderSearchBrands'

type SearchBarProps = {
  brandTargets?: HeaderSearchBrand[]
  mobile?: boolean
}

type SearchSuggestion = {
  id: string | number
  type: 'brand' | 'category' | 'product'
  title: string
  subtitle?: string
  href: string
}

type SuggestionsResponse = {
  suggestions: SearchSuggestion[]
}

function normalizeSearchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function compactSearchKey(value: string): string {
  return normalizeSearchKey(value).replace(/\s+/g, '')
}

function getBrandSearchUrl(
  keyword: string,
  brandTargets: readonly HeaderSearchBrand[],
): string | null {
  const keywordKey = normalizeSearchKey(keyword)
  const compactKeywordKey = compactSearchKey(keyword)

  if (!keywordKey) {
    return null
  }

  for (const brand of brandTargets) {
    const candidates = [
      brand.name,
      brand.slug,
      brand.slug.replace(/-/g, ' '),
    ]

    const isMatch = candidates.some((candidate) => {
      return (
        normalizeSearchKey(candidate) === keywordKey ||
        compactSearchKey(candidate) === compactKeywordKey
      )
    })

    if (isMatch) {
      return '/thuong-hieu/' + encodeURIComponent(brand.slug) + '/san-pham'
    }
  }

  return null
}

function getSuggestionLabel(type: SearchSuggestion['type']) {
  if (type === 'brand') return 'Thương hiệu'
  if (type === 'category') return 'Danh mục'
  return 'Sản phẩm'
}

export const SearchBar = ({
  brandTargets = [],
  mobile = false,
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()

  const keyword = searchTerm.trim()

  const exactBrandUrl = useMemo(
    () => getBrandSearchUrl(keyword, brandTargets),
    [brandTargets, keyword],
  )

  useEffect(() => {
    abortRef.current?.abort()

    if (keyword.length < 2) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          '/api/search-suggestions?q=' + encodeURIComponent(keyword),
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          },
        )

        if (!response.ok) {
          setSuggestions([])
          return
        }

        const data = (await response.json()) as SuggestionsResponse
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 320)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [keyword])

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!keyword) {
      return
    }

    if (exactBrandUrl) {
      router.push(exactBrandUrl)
      setSearchTerm('')
      setSuggestions([])
      setIsOpen(false)
      return
    }

    router.push('/search?q=' + encodeURIComponent(keyword))
    setSearchTerm('')
    setSuggestions([])
    setIsOpen(false)
  }

  const hasSuggestions = suggestions.length > 0

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className={
        mobile
          ? 'relative flex h-11 w-full items-center rounded-[12px] border border-[#dedede] bg-[#f8f8f8] px-3.5 transition-colors focus-within:border-[#ad0509] focus-within:bg-white'
          : 'relative flex h-[43px] w-full items-center rounded-[13px] border border-[#dedede] bg-white px-[14px] transition-colors focus-within:border-[#ad0509]'
      }
    >
      <input
        type="search"
        value={searchTerm}
        onChange={(event) => {
          setSearchTerm(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120)
        }}
        placeholder="Bạn tìm sản phẩm gì..."
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-normal text-[#202020] outline-none placeholder:text-[#8a8a8a]"
        aria-label="Nhập từ khóa tìm kiếm"
      />

      <button
        type="submit"
        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center text-[#555555] transition-colors hover:text-[#ad0509]"
        aria-label="Tìm kiếm"
      >
        <Search
          size={mobile ? 19 : 21}
          strokeWidth={2}
        />
      </button>

      {isOpen && keyword.length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
          {exactBrandUrl ? (
            <Link
              href={exactBrandUrl}
              className="block border-b border-neutral-100 px-4 py-3 transition-colors hover:bg-[#fff5f5]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSearchTerm('')
                setSuggestions([])
                setIsOpen(false)
              }}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Thương hiệu khớp chính xác
              </span>
              <span className="mt-1 block text-sm font-bold text-neutral-900">
                Xem sản phẩm của “{keyword}”
              </span>
            </Link>
          ) : null}

          {hasSuggestions ? (
            <div className="max-h-[360px] overflow-y-auto py-1">
              {suggestions.map((item) => (
                <Link
                  key={item.type + '-' + item.id}
                  href={item.href}
                  className="block px-4 py-3 transition-colors hover:bg-[#fff5f5]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearchTerm('')
                    setSuggestions([])
                    setIsOpen(false)
                  }}
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-primary/70">
                    {getSuggestionLabel(item.type)}
                  </span>
                  <span className="mt-1 line-clamp-1 block text-sm font-bold text-neutral-900">
                    {item.title}
                  </span>
                  {item.subtitle ? (
                    <span className="mt-0.5 line-clamp-1 block text-xs text-neutral-500">
                      {item.subtitle}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-neutral-500">
              {isLoading ? 'Đang tìm nhanh...' : 'Nhấn Enter để xem tất cả kết quả.'}
            </div>
          )}
        </div>
      ) : null}
    </form>
  )
}
