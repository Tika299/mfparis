'use client'

import {
    useMemo,
    useState,
} from 'react'
import Link from 'next/link'
import {
    HeartOff,
    ShoppingBag,
    SlidersHorizontal,
} from 'lucide-react'

import type { Product } from '@/payload-types'
import { ProductCard } from '@/components/ProductCard'
import { cn } from '@/utilities'
import { useWishlistStore } from '@/lib/store'

type WishlistGridProps = Readonly<{
    products: Product[]
}>

type WishlistTab =
    | 'all'
    | 'perfume'
    | 'cosmetics'
    | 'supplements'
    | 'sale'
    | 'in-stock'

type SortOption =
    | 'recent'
    | 'price-asc'
    | 'price-desc'
    | 'name-asc'

type TabItem = Readonly<{
    value: WishlistTab
    label: string
}>

const TAB_ITEMS: TabItem[] = [
    {
        value: 'all',
        label: 'Tất cả',
    },
    {
        value: 'perfume',
        label: 'Nước hoa',
    },
    {
        value: 'cosmetics',
        label: 'Mỹ phẩm',
    },
    {
        value: 'supplements',
        label: 'TPCN',
    },
    {
        value: 'sale',
        label: 'Đang giảm giá',
    },
    {
        value: 'in-stock',
        label: 'Còn hàng',
    },
]

function normalizeSearchText(
    value: string,
): string {
    return value
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            '',
        )
        .replace(/đ/g, 'd')
        .toLowerCase()
        .trim()
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

/**
 * Tạo chuỗi dùng để nhận diện nhóm sản phẩm.
 *
 * Ưu tiên dữ liệu categories đã được populate
 * từ Payload, đồng thời bổ sung title để tránh
 * trường hợp category chưa có depth.
 */
function getProductSearchText(
    product: Product,
): string {
    const categoryTexts =
        Array.isArray(product.categories)
            ? product.categories.flatMap(
                (category) => {
                    if (!isRecord(category)) {
                        return []
                    }

                    return [
                        category.slug,
                        category.name,
                        category.title,
                    ].filter(
                        (
                            value,
                        ): value is string =>
                            typeof value === 'string',
                    )
                },
            )
            : []

    return normalizeSearchText(
        [
            product.title,
            ...categoryTexts,
        ]
            .filter(Boolean)
            .join(' '),
    )
}

function containsAnyKeyword(
    content: string,
    keywords: string[],
): boolean {
    return keywords.some(
        (keyword) =>
            content.includes(keyword),
    )
}

function hasProductSale(
    product: Product,
): boolean {
    if (
        product.productType ===
        'variable' &&
        Array.isArray(product.variants)
    ) {
        return product.variants.some(
            (variant) => {
                if (
                    variant.isActive === false
                ) {
                    return false
                }

                const basePrice = Number(
                    variant.basePrice ?? 0,
                )

                const salePrice = Number(
                    variant.salePrice ?? 0,
                )

                return (
                    basePrice > 0 &&
                    salePrice > 0 &&
                    salePrice < basePrice
                )
            },
        )
    }

    const basePrice = Number(
        product.price?.basePrice ?? 0,
    )

    const salePrice = Number(
        product.price?.salePrice ?? 0,
    )

    return (
        basePrice > 0 &&
        salePrice > 0 &&
        salePrice < basePrice
    )
}

function isProductInStock(
    product: Product,
): boolean {
    if (
        product.productType ===
        'variable' &&
        Array.isArray(product.variants)
    ) {
        return product.variants.some(
            (variant) =>
                variant.isActive !== false &&
                Number(
                    variant.stock ?? 0,
                ) > 0,
        )
    }

    return (
        Number(
            product.price?.stock ?? 0,
        ) > 0
    )
}

/**
 * Lấy giá đại diện để phục vụ sắp xếp.
 * ProductCard vẫn tự tính lại giá hiển thị
 * theo logic riêng của dự án.
 */
function getProductDisplayPrice(
    product: Product,
): number {
    if (
        product.productType ===
        'variable' &&
        Array.isArray(product.variants)
    ) {
        const activeVariants =
            product.variants.filter(
                (variant) =>
                    variant.isActive !== false,
            )

        const selectedVariant =
            activeVariants.find(
                (variant) =>
                    variant.isDefault === true &&
                    Number(
                        variant.stock ?? 0,
                    ) > 0,
            ) ??
            activeVariants.find(
                (variant) =>
                    Number(
                        variant.stock ?? 0,
                    ) > 0,
            ) ??
            activeVariants[0]

        if (!selectedVariant) {
            return 0
        }

        const basePrice = Number(
            selectedVariant.basePrice ?? 0,
        )

        const salePrice = Number(
            selectedVariant.salePrice ?? 0,
        )

        const hasSale =
            basePrice > 0 &&
            salePrice > 0 &&
            salePrice < basePrice

        return hasSale
            ? salePrice
            : basePrice
    }

    const basePrice = Number(
        product.price?.basePrice ?? 0,
    )

    const salePrice = Number(
        product.price?.salePrice ?? 0,
    )

    const hasSale =
        basePrice > 0 &&
        salePrice > 0 &&
        salePrice < basePrice

    return hasSale
        ? salePrice
        : basePrice
}

function filterProductByTab(
    product: Product,
    activeTab: WishlistTab,
): boolean {
    if (activeTab === 'all') {
        return true
    }

    if (activeTab === 'sale') {
        return hasProductSale(product)
    }

    if (activeTab === 'in-stock') {
        return isProductInStock(product)
    }

    const searchText =
        getProductSearchText(product)

    if (activeTab === 'perfume') {
        return containsAnyKeyword(
            searchText,
            [
                'nuoc hoa',
                'perfume',
                'fragrance',
                'eau de parfum',
                'eau de toilette',
            ],
        )
    }

    if (activeTab === 'cosmetics') {
        return containsAnyKeyword(
            searchText,
            [
                'my pham',
                'cham soc da',
                'skincare',
                'makeup',
                'trang diem',
                'cham soc toc',
            ],
        )
    }

    if (activeTab === 'supplements') {
        return containsAnyKeyword(
            searchText,
            [
                'tpcn',
                'thuc pham chuc nang',
                'supplement',
                'vitamin',
                'vien uong',
                'cham soc suc khoe',
            ],
        )
    }

    return true
}

export function WishlistGrid({
    products,
}: WishlistGridProps) {
    const [activeTab, setActiveTab] =
        useState<WishlistTab>('all')

    const [sortOption, setSortOption] =
        useState<SortOption>('recent')

    const wishlistProductIds =
        useWishlistStore(
            (state) => state.productIds,
        )

    const hasWishlistHydrated =
        useWishlistStore(
            (state) => state.hasHydrated,
        )

    const currentWishlistProducts =
        useMemo(() => {
            /**
             * Trong lần render đầu tiên, giữ nguyên
             * products từ server để tránh nhấp nháy.
             */
            if (!hasWishlistHydrated) {
                return products
            }

            const wishlistIdSet = new Set(
                wishlistProductIds.map(String),
            )

            return products.filter(
                (product) =>
                    wishlistIdSet.has(
                        String(product.id),
                    ),
            )
        }, [
            hasWishlistHydrated,
            products,
            wishlistProductIds,
        ])

    const visibleProducts =
        useMemo(() => {
            const filteredProducts =
                currentWishlistProducts.filter(
                    (product) =>
                        filterProductByTab(
                            product,
                            activeTab,
                        ),
                )

            /**
             * Tạo mảng mới trước khi sort,
             * tránh làm thay đổi trực tiếp products prop.
             */
            const sortedProducts = [
                ...filteredProducts,
            ]

            switch (sortOption) {
                case 'price-asc':
                    return sortedProducts.sort(
                        (
                            firstProduct,
                            secondProduct,
                        ) =>
                            getProductDisplayPrice(
                                firstProduct,
                            ) -
                            getProductDisplayPrice(
                                secondProduct,
                            ),
                    )

                case 'price-desc':
                    return sortedProducts.sort(
                        (
                            firstProduct,
                            secondProduct,
                        ) =>
                            getProductDisplayPrice(
                                secondProduct,
                            ) -
                            getProductDisplayPrice(
                                firstProduct,
                            ),
                    )

                case 'name-asc':
                    return sortedProducts.sort(
                        (
                            firstProduct,
                            secondProduct,
                        ) =>
                            firstProduct.title.localeCompare(
                                secondProduct.title,
                                'vi',
                            ),
                    )

                case 'recent':
                default:
                    /**
                     * Giữ nguyên thứ tự products truyền vào.
                     * Server Action trước đó đã sắp theo thứ tự
                     * productIds trong Zustand.
                     */
                    return sortedProducts
            }
        }, [
            activeTab,
            currentWishlistProducts,
            sortOption,
        ])

    const activeTabLabel =
        TAB_ITEMS.find(
            (tab) =>
                tab.value === activeTab,
        )?.label ?? 'Tất cả'

    return (
        <div className="min-w-0">
            {/* HEADER */}
            <div className="mb-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <span className="sub-heading">
                            Danh sách của bạn
                        </span>

                        <h2 className="font-heading text-2xl font-semibold leading-tight text-neutral-950 md:text-3xl">
                            Tất cả sản phẩm yêu thích{' '}
                            <span className="text-[#B72828]">
                                (
                                {currentWishlistProducts.length.toLocaleString(
                                    'vi-VN',
                                )}
                                )
                            </span>
                        </h2>
                    </div>

                    {/* SORT */}
                    <label className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs text-neutral-500 shadow-[0_3px_12px_rgba(0,0,0,0.025)] sm:w-fit">
                        <SlidersHorizontal
                            aria-hidden="true"
                            size={16}
                            className="shrink-0 text-neutral-400"
                        />

                        <span className="shrink-0">
                            Sắp xếp:
                        </span>

                        <select
                            value={sortOption}
                            onChange={(event) =>
                                setSortOption(
                                    event.target
                                        .value as SortOption,
                                )
                            }
                            aria-label="Sắp xếp danh sách yêu thích"
                            className="min-w-0 flex-1 cursor-pointer bg-transparent font-semibold text-neutral-800 outline-none sm:min-w-[150px]"
                        >
                            <option value="recent">
                                Mới lưu gần đây
                            </option>

                            <option value="price-asc">
                                Giá thấp đến cao
                            </option>

                            <option value="price-desc">
                                Giá cao đến thấp
                            </option>

                            <option value="name-asc">
                                Tên A–Z
                            </option>
                        </select>
                    </label>
                </div>

                {/* FILTER PILLS */}
                <div className="no-scrollbar mt-5 overflow-x-auto pb-1">
                    <div
                        className="flex min-w-max items-center gap-2"
                        role="tablist"
                        aria-label="Lọc sản phẩm yêu thích"
                    >
                        {TAB_ITEMS.map((tab) => {
                            const isActive =
                                activeTab === tab.value

                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() =>
                                        setActiveTab(
                                            tab.value,
                                        )
                                    }
                                    className={cn(
                                        'inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
                                        isActive
                                            ? 'border-[#B72828] bg-[#B72828] text-white shadow-sm'
                                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#B72828]/30 hover:bg-red-50 hover:text-[#B72828]',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <p
                    className="mt-3 text-xs text-neutral-400"
                    aria-live="polite"
                >
                    Hiển thị{' '}
                    <strong className="font-semibold text-neutral-600">
                        {visibleProducts.length.toLocaleString(
                            'vi-VN',
                        )}
                    </strong>{' '}
                    sản phẩm trong nhóm{' '}
                    <strong className="font-semibold text-neutral-600">
                        {activeTabLabel}
                    </strong>
                </p>
            </div>

            {/* PRODUCT GRID */}
            {visibleProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                    {visibleProducts.map(
                        (product) => (
                            <div
                                key={product.id}
                                className="min-w-0"
                            >
                                <ProductCard
                                    product={product}
                                />
                            </div>
                        ),
                    )}
                </div>
            ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-red-100 bg-gradient-to-br from-white to-red-50/40 px-6 py-12 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#B72828]">
                        <HeartOff
                            aria-hidden="true"
                            size={29}
                            strokeWidth={1.7}
                        />
                    </span>

                    <h3 className="mt-5 font-heading text-xl font-semibold text-neutral-950">
                        Chưa có sản phẩm phù hợp
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                        Danh sách yêu thích của bạn
                        chưa có sản phẩm thuộc nhóm{' '}
                        <strong className="font-semibold text-neutral-700">
                            {activeTabLabel}
                        </strong>
                        . Hãy khám phá thêm những sản
                        phẩm chính hãng tại Marais de
                        France.
                    </p>

                    <Link
                        href="/products"
                        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B72828] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(183,40,40,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#951F1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2"
                    >
                        <ShoppingBag
                            aria-hidden="true"
                            size={18}
                        />

                        Khám phá sản phẩm
                    </Link>

                    {activeTab !== 'all' ? (
                        <button
                            type="button"
                            onClick={() =>
                                setActiveTab('all')
                            }
                            className="mt-3 text-xs font-semibold text-[#B72828] underline-offset-4 hover:underline"
                        >
                            Xem tất cả sản phẩm đã lưu
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    )
}