'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center border-b border-gray-200 px-2 py-1">
      <input
        type="text"
        placeholder="Tìm kiếm..."
        className="bg-transparent outline-none text-xs w-24 md:w-40 font-sans"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button type="submit">
        <Search size={16} strokeWidth={2} />
      </button>
    </form>
  )
}
