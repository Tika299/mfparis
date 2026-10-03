'use client'

import type { FilterRouteContext } from './search-filters.types'

const segmentMap: Record<string, string> = {
  'thuong-hieu': 'brand',
  'danh-muc': 'category',
  huong: 'note',
  'gioi-tinh': 'gender',
  'dung-tich': 'volume',
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function safeEncode(value: string): string {
  return encodeURIComponent(value.trim())
}

export function getFilterParamsFromPrettyPathname(pathname: string): URLSearchParams {
  const params = new URLSearchParams()
  const parts = pathname.split('/').filter(Boolean).map(safeDecode)

  if (parts.length === 0) {
    return params
  }

  if (parts[0] === 'san-pham-moi') {
    params.set('sort', '-createdAt')
    return params
  }

  if (parts[0] === 'san-pham-ban-chay') {
    params.set('sort', '-reviewCount')
    return params
  }

  if (parts[0] === 'san-pham-giam-gia') {
    params.set('sale', 'yes')
    return params
  }

  if (parts[0] === 'san-pham-con-hang') {
    params.set('availability', 'in-stock')
    return params
  }

  if (parts[0] === 'nuoc-hoa' && parts[1]) {
    params.set('category', 'nuoc-hoa')
    params.set('brand', parts[1])
    return params
  }

  if (parts[0] === 'danh-muc' && parts[1]) {
    params.set('category', parts[1])
    return params
  }

  if (parts[0] === 'thuong-hieu' && parts[1]) {
    params.set('brand', parts[1])
    return params
  }

  /*
   * Facet mùa có landing page SEO riêng:
   * /categories/nuoc-hoa/xuan -> attr_mua=xuan
   */
  if (parts[0] === 'categories' && parts[1] && parts[2] && parts.length === 3) {
    params.set('attr_mua', parts[2])
    return params
  }

  if (parts[0] !== 'loc') {
    return params
  }

  for (let index = 1; index < parts.length; index += 2) {
    const segment = parts[index]
    const value = parts[index + 1]

    if (!segment || !value) {
      continue
    }

    if (segment === 'thuoc-tinh') {
      const attribute = parts[index + 1]
      const attributeValue = parts[index + 2]

      if (attribute && attributeValue) {
        params.append(`attr_${attribute}`, attributeValue)
      }

      index += 1
      continue
    }

    const key = segmentMap[segment]

    if (key) {
      params.append(key, value)
    }
  }

  return params
}

export function mergeFilterSearchParams(
  visibleSearchParams: URLSearchParams,
  prettyParams: URLSearchParams,
): URLSearchParams {
  const merged = new URLSearchParams(prettyParams.toString())

  for (const key of Array.from(visibleSearchParams.keys())) {
    merged.delete(key)

    for (const value of visibleSearchParams.getAll(key)) {
      merged.append(key, value)
    }
  }

  return merged
}

export function getBaseFilterPathname(
  routeContext: FilterRouteContext,
  _params: URLSearchParams,
): string {
  if (routeContext.type === 'brand') {
    return `/brands/${safeEncode(routeContext.slug)}`
  }

  if (routeContext.type === 'category') {
    return `/categories/${safeEncode(routeContext.slug)}`
  }

  if (routeContext.type === 'search') {
    return '/search'
  }

  return '/products'
}

export function buildPrettyFilterUrl(
  params: URLSearchParams,
  routeContext: FilterRouteContext,
): string | null {
  if (routeContext.type !== 'category') {
    return null
  }

  const seasonValues = params
    .getAll('attr_mua')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)

  if (seasonValues.length !== 1) {
    return null
  }

  const season = seasonValues[0]

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(season)) {
    return null
  }

  const remainingParams = new URLSearchParams(params.toString())
  remainingParams.delete('attr_mua')

  const pathname = `/categories/${safeEncode(routeContext.slug)}/${safeEncode(season)}`
  const query = remainingParams.toString()

  return query ? `${pathname}?${query}` : pathname
}

export function buildFilterUrl(
  params: URLSearchParams,
  routeContext: FilterRouteContext,
): string {
  const prettyUrl = buildPrettyFilterUrl(params, routeContext)

  if (prettyUrl) {
    return prettyUrl
  }

  const basePathname = getBaseFilterPathname(routeContext, params)
  const query = params.toString()

  return query ? `${basePathname}?${query}` : basePathname
}
