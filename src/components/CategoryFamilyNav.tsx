'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
    getCategoryChildren,
    type CategoryTreeItem,
} from '@/lib/categoryTree'

type CategoryFamilyNavProps = {
    currentCategory: CategoryTreeItem
    childCategories: CategoryTreeItem[]
    siblingCategories: CategoryTreeItem[]
    ancestorCategories: CategoryTreeItem[]
    allCategories: CategoryTreeItem[]
}

function categoryName(category: CategoryTreeItem) {
    return String(category.name || 'Danh mục')
}

function categoryHref(category: CategoryTreeItem) {
    return category.slug ? `/categories/${category.slug}` : '/categories'
}

export function CategoryFamilyNav({
    currentCategory,
    childCategories,
    siblingCategories,
    ancestorCategories,
    allCategories,
}: CategoryFamilyNavProps) {
    const [sectionOpen, setSectionOpen] = useState(false)
    const [openedIds, setOpenedIds] = useState<Record<string, boolean>>({})

    const hasChildren = childCategories.length > 0
    const parentCategory = ancestorCategories[ancestorCategories.length - 1]
    const relatedCategories = hasChildren
        ? childCategories
        : [
            ...(parentCategory ? [parentCategory] : []),
            ...siblingCategories,
        ]

    if (relatedCategories.length === 0) {
        return null
    }

    const toggleCategory = (id: string | number) => {
        const key = String(id)

        setOpenedIds((current) => ({
            ...current,
            [key]: !current[key],
        }))
    }

    return (
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => setSectionOpen((value) => !value)}
                    className="group flex min-w-0 items-center gap-3 text-left"
                    aria-expanded={sectionOpen}
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff5f4] text-[#b72828]">
                        <ChevronDown
                            size={18}
                            className={
                                sectionOpen
                                    ? 'transition-transform'
                                    : '-rotate-90 transition-transform'
                            }
                        />
                    </span>

                    <span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#b72828]">
                            Danh mục
                        </span>

                        <span className="mt-1 block text-lg font-black text-gray-950 transition group-hover:text-[#b72828] md:text-xl">
                            {hasChildren
                                ? `Danh mục trong ${categoryName(currentCategory)}`
                                : 'Danh mục liên quan'}
                        </span>
                    </span>
                </button>

                <Link
                    href="/categories"
                    className="hidden text-xs font-bold text-gray-500 transition hover:text-[#b72828] md:inline-flex"
                >
                    Xem tất cả
                </Link>
            </div>

            {sectionOpen ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {relatedCategories.map((category) => {
                        const grandchildren = getCategoryChildren(category.id, allCategories)
                        const isCurrent = String(category.id) === String(currentCategory.id)
                        const isOpen = Boolean(openedIds[String(category.id)])
                        const hasGrandchildren = grandchildren.length > 0

                        return (
                            <div
                                key={category.id}
                                className={
                                    isCurrent
                                        ? 'rounded-xl border border-[#b72828] bg-[#fff6f5] p-4'
                                        : 'rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[#f0b3ad] hover:bg-[#fff8f7]'
                                }
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <Link
                                        href={categoryHref(category)}
                                        aria-current={isCurrent ? 'page' : undefined}
                                        className="min-w-0 flex-1 text-sm font-black text-gray-900 transition hover:text-[#b72828]"
                                    >
                                        {categoryName(category)}
                                    </Link>

                                    {hasGrandchildren ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleCategory(category.id)}
                                            aria-label={
                                                !isOpen ? 'Mở danh mục con' : 'Đóng danh mục con'
                                            }
                                            aria-expanded={isOpen}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition hover:text-[#b72828]"
                                        >
                                            <ChevronDown
                                                size={15}
                                                className={
                                                    isOpen ? 'transition-transform' : '-rotate-90 transition-transform'
                                                }
                                            />
                                        </button>
                                    ) : (
                                        <ChevronRight
                                            size={16}
                                            className="shrink-0 text-gray-300"
                                        />
                                    )}
                                </div>

                                {hasGrandchildren && isOpen ? (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {grandchildren.map((child) => (
                                            <Link
                                                key={child.id}
                                                href={categoryHref(child)}
                                                className="max-w-full truncate rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:text-[#b72828]"
                                            >
                                                {categoryName(child)}
                                            </Link>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            ) : null}
        </section>
    )
}