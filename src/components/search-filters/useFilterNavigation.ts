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
import {
  buildFilterUrl,
  getFilterParamsFromPrettyPathname,
  mergeFilterSearchParams,
} from './filterPrettyUrls'

import type {
  FilterRouteContext,
  FilterUpdates,
} from './search-filters.types'

type NavigationMode = 'push' | 'replace'

const ignoredFilterParams = new Set(['page', 'q'])

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

  const prettyParams = useMemo(
    () => getFilterParamsFromPrettyPathname(pathname),
    [pathname],
  )

  const visibleParams = useMemo(
    () => new URLSearchParams(searchParamsString),
    [searchParamsString],
  )

  const effectiveParams = useMemo(
    () => mergeFilterSearchParams(visibleParams, prettyParams),
    [prettyParams, visibleParams],
  )

  const effectiveParamsString = effectiveParams.toString()

  const activeBrand =
    routeContext.type === 'brand'
      ? routeContext.slug
      : effectiveParams.get('brand')

  const activeCategory =
    routeContext.type === 'category'
      ? routeContext.slug
      : effectiveParams.get('category')

  const activeSort =
    effectiveParams.get('sort') ?? DEFAULT_SORT

  const minParam = effectiveParams.get('min')
  const maxParam = effectiveParams.get('max')

  const getActiveValues = useCallback(
    (key: string): string[] => {
      return effectiveParams
        .getAll(key)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    },
    [effectiveParams],
  )

  const hasActiveFilters = useMemo(() => {
    for (const [key, value] of effectiveParams.entries()) {
      if (!value || ignoredFilterParams.has(key)) {
        continue
      }

      if (key === 'sort' && value === DEFAULT_SORT) {
        continue
      }

      return true
    }

    return false
  }, [effectiveParams])

  const navigateToParams = useCallback(
    (params: URLSearchParams, navigationMode: NavigationMode) => {
      const nextUrl = buildFilterUrl(params, routeContext)
      const currentUrl = searchParamsString
        ? `${pathname}?${searchParamsString}`
        : pathname

      if (nextUrl === currentUrl) return

      startTransition(() => {
        if (navigationMode === 'push') {
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
    [pathname, routeContext, router, searchParamsString],
  )

  const updateFilters = useCallback(
    (
      updates: FilterUpdates,
      navigationMode: NavigationMode = 'replace',
    ) => {
      const params = new URLSearchParams(effectiveParamsString)

      Object.entries(updates).forEach(
        ([key, value]) => {
          if (value === null || value === '') {
            params.delete(key)
            return
          }

          params.set(key, value)
        },
      )

      params.delete('page')

      let nextNavigationMode = navigationMode

      if (
        routeContext.type === 'category' &&
        hasOwnProperty(updates, 'category')
      ) {
        const nextCategory = updates.category

        if (typeof nextCategory === 'string') {
          params.set('category', nextCategory)
        } else {
          params.delete('category')
        }

        nextNavigationMode = 'push'
      }

      if (
        routeContext.type === 'brand' &&
        hasOwnProperty(updates, 'brand')
      ) {
        const nextBrand = updates.brand

        if (typeof nextBrand === 'string') {
          params.set('brand', nextBrand)
        } else {
          params.delete('brand')
        }

        nextNavigationMode = 'push'
      }

      navigateToParams(params, nextNavigationMode)
    },
    [
      effectiveParamsString,
      navigateToParams,
      routeContext,
    ],
  )

  const toggleFilterValue = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(effectiveParamsString)

      const currentValues = params
        .getAll(key)
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter(Boolean)

      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]

      params.delete(key)

      for (const nextValue of [...new Set(nextValues)].sort((left, right) =>
        left.localeCompare(right, 'vi'),
      )) {
        params.append(key, nextValue)
      }

      params.delete('page')
      navigateToParams(params, 'replace')
    },
    [effectiveParamsString, navigateToParams],
  )

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(effectiveParamsString)
    const q = params.get('q')
    const nextParams = new URLSearchParams()

    if (q) {
      nextParams.set('q', q)
    }

    navigateToParams(nextParams, 'replace')
  }, [effectiveParamsString, navigateToParams])

  return {
    activeBrand,
    activeCategory,
    activeSort,
    minParam,
    maxParam,
    hasActiveFilters,
    isPending,
    getActiveValues,
    updateFilters,
    toggleFilterValue,
    clearAll,
  }
}
