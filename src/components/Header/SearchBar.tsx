'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type SearchBarProps = {
  mobile?: boolean
}

export const SearchBar = ({ mobile = false }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    const keyword = searchTerm.trim()

    if (keyword) {
      router.push(`/search?q=${encodeURIComponent(keyword)}`)
      setSearchTerm('')
    }
  }

  return (
    <form
      onSubmit={handleSearch}
      className={
        mobile
          ? 'flex w-full items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-3'
          : 'flex w-full items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 transition-colors focus-within:border-primary focus-within:bg-white'
      }
    >
      <input
        type="text"
        placeholder="Tìm kiếm sản phẩm..."
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <button
        type="submit"
        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition-colors hover:bg-primary hover:text-white"
        aria-label="Tìm kiếm"
      >
        <Search size={16} strokeWidth={2} />
      </button>
    </form>
  )
}