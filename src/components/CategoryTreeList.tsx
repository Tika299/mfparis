'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
    getCategoryChildren,
    type CategoryTreeItem,
} from '@/lib/categoryTree'

type CategoryTreeNode = CategoryTreeItem & {
    productCount?: number | null
}

type CategoryTreeListProps = {
    rootCategories: CategoryTreeNode[]
    allCategories: CategoryTreeNode[]
}

function getProductCount(category: CategoryTreeNode) {
    return Number(category.productCount || 0)
}

export function CategoryTreeList({
    rootCategories,
    allCategories,
}: CategoryTreeListProps) {
    const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({})

    const toggleCategory = (id: string | number) => {
        const key = String(id)

        setCollapsedIds((current) => ({
            ...current,
            [key]: !current[key],
        }))
    }

    return (
        <div className="space-y-6">
            {rootCategories.map((rootCategory) => {
                const children = getCategoryChildren(rootCategory.id, allCategories)
                const isCollapsed = Boolean(collapsedIds[String(rootCategory.id)])
                const hasChildren = children.length > 0

                return (
                    <section
                        key={rootCategory.id}
                        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
                    >
                        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                            <button
                                type="button"
                                onClick={() => toggleCategory(rootCategory.id)}
                                className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                                aria-expanded={!isCollapsed}
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff5f4] text-[#b72828]">
                                    <ChevronDown
                                        size={18}
                                        className={
                                            isCollapsed
                                                ? '-rotate-90 transition-transform'
                                                : 'transition-transform'
                                        }
                                    />
                                </span>

                                <span className="min-w-0">
                                    <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#b72828]">
                                        Nhóm danh mục
                                    </span>

                                    <span className="mt-1 block text-xl font-black text-gray-950 transition group-hover:text-[#b72828] md:text-2xl">
                                        {rootCategory.name}
                                    </span>

                                    <span className="mt-1 block text-xs font-semibold text-gray-500">
                                        {getProductCount(rootCategory).toLocaleString('vi-VN')}{' '}
                                        sản phẩm
                                    </span>
                                </span>
                            </button>

                            <Link
                                href={`/categories/${rootCategory.slug}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-[#b72828]"
                            >
                                Xem nhóm này
                                <ChevronRight size={14} />
                            </Link>
                        </div>

                        {!isCollapsed ? (
                            hasChildren ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {children.map((child) => {
                                        const grandchildren = getCategoryChildren(
                                            child.id,
                                            allCategories,
                                        )
                                        const isChildCollapsed = Boolean(
                                            collapsedIds[String(child.id)],
                                        )
                                        const hasGrandchildren = grandchildren.length > 0

                                        return (
                                            <div
                                                key={child.id}
                                                className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#f0b3ad] hover:bg-[#fff8f7]"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <Link
                                                        href={`/categories/${child.slug}`}
                                                        className="min-w-0 flex-1"
                                                    >
                                                        <h3 className="text-sm font-black text-gray-900 transition hover:text-[#b72828]">
                                                            {child.name}
                                                        </h3>

                                                        <p className="mt-1 text-[11px] font-semibold text-gray-500">
                                                            {getProductCount(child).toLocaleString('vi-VN')}{' '}
                                                            sản phẩm
                                                        </p>
                                                    </Link>

                                                    {hasGrandchildren ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCategory(child.id)}
                                                            aria-label={
                                                                isChildCollapsed
                                                                    ? 'Mở danh mục con'
                                                                    : 'Đóng danh mục con'
                                                            }
                                                            aria-expanded={!isChildCollapsed}
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 transition hover:text-[#b72828]"
                                                        >
                                                            <ChevronDown
                                                                size={15}
                                                                className={
                                                                    isChildCollapsed
                                                                        ? '-rotate-90 transition-transform'
                                                                        : 'transition-transform'
                                                                }
                                                            />
                                                        </button>
                                                    ) : null}
                                                </div>

                                                {hasGrandchildren && !isChildCollapsed ? (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {grandchildren.map((grandchild) => (
                                                            <Link
                                                                key={grandchild.id}
                                                                href={`/categories/${grandchild.slug}`}
                                                                className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:text-[#b72828]"
                                                            >
                                                                {grandchild.name}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-gray-500">
                                    Chưa có danh mục con.
                                </p>
                            )
                        ) : null}
                    </section>
                )
            })}
        </div>
    )
}