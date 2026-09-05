import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

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

    return (
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b72828]">
                        Danh mục
                    </p>
                    <h2 className="mt-1 text-lg font-black text-gray-950 md:text-xl">
                        {hasChildren
                            ? `Danh mục trong ${categoryName(currentCategory)}`
                            : 'Danh mục liên quan'}
                    </h2>
                </div>

                <Link
                    href="/categories"
                    className="hidden text-xs font-bold text-gray-500 transition hover:text-[#b72828] md:inline-flex"
                >
                    Xem tất cả
                </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {relatedCategories.map((category) => {
                    const grandchildren = getCategoryChildren(category.id, allCategories).slice(0, 4)
                    const isCurrent = String(category.id) === String(currentCategory.id)

                    return (
                        <Link
                            key={category.id}
                            href={categoryHref(category)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={
                                isCurrent
                                    ? 'group rounded-xl border border-[#b72828] bg-[#fff6f5] p-4'
                                    : 'group rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[#f0b3ad] hover:bg-[#fff8f7]'
                            }
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="min-w-0 text-sm font-black text-gray-900">
                                    {categoryName(category)}
                                </h3>
                                <ChevronRight
                                    size={16}
                                    className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#b72828]"
                                />
                            </div>

                            {grandchildren.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {grandchildren.map((child) => (
                                        <span
                                            key={child.id}
                                            className="max-w-full truncate rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                                        >
                                            {categoryName(child)}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}