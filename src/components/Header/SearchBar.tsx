'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type SearchBarProps = {
  mobile?: boolean
}

export const SearchBar = ({
  mobile = false,
}: SearchBarProps) => {
  const [searchTerm, setSearchTerm] =
    useState('')

  const router = useRouter()

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const keyword = searchTerm.trim()

    if (!keyword) {
      return
    }

    router.push(
      `/search?q=${encodeURIComponent(keyword)}`,
    )

    setSearchTerm('')
  }

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className={
        mobile
          ? 'flex h-11 w-full items-center rounded-[12px] border border-[#dedede] bg-[#f8f8f8] px-3.5 transition-colors focus-within:border-[#ad0509] focus-within:bg-white'
          : 'flex h-[43px] w-full items-center rounded-[13px] border border-[#dedede] bg-white px-[14px] transition-colors focus-within:border-[#ad0509]'
      }
    >
      <input
        type="search"
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(event.target.value)
        }
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
    </form>
  )
}