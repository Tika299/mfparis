'use client'

import { DEFAULT_SORT } from './search-filters.constants'
import type { FilterRouteContext } from './search-filters.types'

const prettyFilterKeys = new Set([
  'brand',
  'category',
  'note',
  'gender',
  'volume',
  'sale',
  'availability',
  'sort',
])

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

function appendParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (!value) {
    return
  }

  params.append(key, value)
}

function getSingle(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key).filter(Boolean)
  return values.length === 1 ? values[0] : null
}

function nonEmptyKeys(params: URLSearchParams): string[] {
  return Array.from(new Set(Array.from(params.keys())))
    .filter((key) => params.getAll(key).some(Boolean))
    .filter((key) => key !== 'page')
    .sort((left, right) => left.localeCompare(right, 'vi'))
}

function cloneWithout(params: URLSearchParams, keys: string[]): URLSearchParams {
  const next = new URLSearchParams(params.toString())

  for (const key of keys) {
    next.delete(key)
  }

  return next
}

function queryString(params: URLSearchParams): string {
  const value = params.toString()
  return value ? `?${value}` : ''
}

export function getFilterParamsFromPrettyPathname(pathname: string): URLSearchParams {
  const params = new URLSearchParams()
  const parts = pathname.split('/').filter(Boolean).map(safeDecode)

  if (parts.length === 0) {
    return params
  }

  if (parts[0] === 'tim-kiem') {
    appendParam(params, 'q', parts[1])
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
  params: URLSearchParams,
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
  const normalized = new URLSearchParams(params.toString())
  const sort = normalized.get('sort')

  if (sort === DEFAULT_SORT) {
    normalized.delete('sort')
  }

  normalized.delete('page')

  const q = getSingle(normalized, 'q')

  if (q) {
    const rest = cloneWithout(normalized, ['q'])
    return `/tim-kiem/${safeEncode(q)}${queryString(rest)}`
  }

  const keys = nonEmptyKeys(normalized)

  if (keys.length === 0) {
    return getBaseFilterPathname(routeContext, normalized)
  }

  const brand = getSingle(normalized, 'brand')
  const category = getSingle(normalized, 'category')
  const note = getSingle(normalized, 'note')
  const gender = getSingle(normalized, 'gender')
  const volume = getSingle(normalized, 'volume')
  const sale = getSingle(normalized, 'sale')
  const availability = getSingle(normalized, 'availability')
  const currentSort = getSingle(normalized, 'sort')

  if (keys.length === 2 && brand && category) {
    return `/loc/danh-muc/${safeEncode(category)}/thuong-hieu/${safeEncode(brand)}`
  }

  if (keys.length === 1 && brand) {
    return `/loc/thuong-hieu/${safeEncode(brand)}`
  }

  if (keys.length === 1 && category) {
    return `/loc/danh-muc/${safeEncode(category)}`
  }

  if (keys.length === 1 && note) {
    return `/loc/huong/${safeEncode(note)}`
  }

  if (keys.length === 1 && gender) {
    return `/loc/gioi-tinh/${safeEncode(gender)}`
  }

  if (keys.length === 1 && volume) {
    return `/loc/dung-tich/${safeEncode(volume)}`
  }

  if (keys.length === 1 && sale === 'yes') {
    return '/san-pham-giam-gia'
  }

  if (keys.length === 1 && availability === 'in-stock') {
    return '/san-pham-con-hang'
  }

  if (keys.length === 1 && currentSort === '-reviewCount') {
    return '/san-pham-ban-chay'
  }

  if (keys.length === 1 && currentSort === '-createdAt') {
    return '/san-pham-moi'
  }

  if (keys.length === 1) {
    const key = keys[0]

    if (key?.startsWith('attr_')) {
      const attribute = key.replace(/^attr_/, '')
      const value = getSingle(normalized, key)

      if (attribute && value) {
        return `/loc/thuoc-tinh/${safeEncode(attribute)}/${safeEncode(value)}`
      }
    }
  }

  return null
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
