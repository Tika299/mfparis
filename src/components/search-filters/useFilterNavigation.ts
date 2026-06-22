'use client'

import {
    useCallback,
    useMemo,
    useTransition,
} from 'react'

import {
    usePathname,
    useRouter,
    useSearchParams,
} from 'next/navigation'

import { DEFAULT_SORT } from './search-filters.constants'

import type {
    FilterRouteContext,
    FilterUpdates,
} from './search-filters.types'

type NavigationMode = 'push' | 'replace'

const hasOwnProperty = (
    object: object,
    key: PropertyKey,
) => {
    return Object.prototype.hasOwnProperty.call(
        object,
        key,
    )
}

export const useFilterNavigation = (
    routeContext: FilterRouteContext,
) => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isPending, startTransition] =
        useTransition()

    const searchParamsString =
        searchParams.toString()

    const activeBrand =
        routeContext.type === 'brand'
            ? routeContext.slug
            : searchParams.get('brand')

    const activeCategory =
        routeContext.type === 'category'
            ? routeContext.slug
            : searchParams.get('category')

    const activeSort =
        searchParams.get('sort') ?? DEFAULT_SORT

    const minParam = searchParams.get('min')
    const maxParam = searchParams.get('max')

    const hasActiveFilters = useMemo(() => {
        const params = new URLSearchParams(
            searchParamsString,
        )

        const sort = params.get('sort')

        return Boolean(
            params.get('brand') ||
            params.get('category') ||
            params.get('volume') ||
            params.get('scent') ||
            params.get('gender') ||
            params.get('min') ||
            params.get('max') ||
            (sort && sort !== DEFAULT_SORT),
        )
    }, [searchParamsString])

    const updateFilters = useCallback(
        (
            updates: FilterUpdates,
            navigationMode: NavigationMode = 'replace',
        ) => {
            const params = new URLSearchParams(
                searchParamsString,
            )

            Object.entries(updates).forEach(
                ([key, value]) => {
                    if (value === null || value === '') {
                        params.delete(key)
                        return
                    }

                    params.set(key, value)
                },
            )

            // Khi đổi bộ lọc phải quay về trang đầu.
            params.delete('page')

            let nextPathname = pathname
            let nextNavigationMode = navigationMode

            /*
             * Đang ở category page và người dùng
             * thay đổi category.
             */
            if (
                routeContext.type === 'category' &&
                hasOwnProperty(updates, 'category')
            ) {
                params.delete('category')

                const nextCategory =
                    updates.category

                nextPathname =
                    typeof nextCategory === 'string'
                        ? `/categories/${encodeURIComponent(
                            nextCategory,
                        )}`
                        : routeContext.clearPath

                nextNavigationMode = 'push'
            }

            /*
             * Đang ở brand page và người dùng
             * thay đổi brand.
             */
            if (
                routeContext.type === 'brand' &&
                hasOwnProperty(updates, 'brand')
            ) {
                params.delete('brand')

                const nextBrand = updates.brand

                nextPathname =
                    typeof nextBrand === 'string'
                        ? `/brands/${encodeURIComponent(
                            nextBrand,
                        )}`
                        : routeContext.clearPath

                nextNavigationMode = 'push'
            }

            const queryString = params.toString()

            const nextUrl = queryString
                ? `${nextPathname}?${queryString}`
                : nextPathname

            const currentUrl = searchParamsString
                ? `${pathname}?${searchParamsString}`
                : pathname

            if (nextUrl === currentUrl) return

            startTransition(() => {
                if (nextNavigationMode === 'push') {
                    router.push(nextUrl, {
                        scroll: false,
                    })

                    return
                }

                router.replace(nextUrl, {
                    scroll: false,
                })
            })
        },
        [
            pathname,
            routeContext,
            router,
            searchParamsString,
        ],
    )

    const clearAll = useCallback(() => {
        startTransition(() => {
            router.replace(pathname, {
                scroll: false,
            })
        })
    }, [pathname, router])

    return {
        activeBrand,
        activeCategory,
        activeSort,
        minParam,
        maxParam,
        hasActiveFilters,
        isPending,
        updateFilters,
        clearAll,
    }
}