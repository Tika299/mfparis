import type { Where } from 'payload'

export const PRODUCT_DEFAULT_SORT = '-createdAt' as const

export const PRODUCT_ALLOWED_SORTS = [
  '-createdAt',
  'createdAt',
  'price.basePrice',
  '-price.basePrice',
  'title',
  '-title',
  '-averageRating',
  '-reviewCount',
] as const

export type ProductSort = (typeof PRODUCT_ALLOWED_SORTS)[number]
export type ProductSearchParamValue = string | string[] | undefined
export type ProductSearchParams = Readonly<Record<string, ProductSearchParamValue>>

const MAX_FACET_VALUES = 16
const MAX_FACET_VALUE_LENGTH = 120

export const ADVANCED_FILTER_KEYS = [
  'availability',
  'sale',
  'rating',
  'note',
] as const

function isProductSort(value: string): value is ProductSort {
  return PRODUCT_ALLOWED_SORTS.some((allowedSort) => allowedSort === value)
}

export function normalizeProductSort(value: string | undefined): ProductSort {
  if (!value || !isProductSort(value)) {
    return PRODUCT_DEFAULT_SORT
  }

  return value
}

export function getSearchParamValues(
  searchParams: ProductSearchParams,
  key: string,
): string[] {
  const rawValue = searchParams[key]

  if (!rawValue) {
    return []
  }

  const values = Array.isArray(rawValue) ? rawValue : [rawValue]

  const normalizedValues = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= MAX_FACET_VALUE_LENGTH)

  return [...new Set(normalizedValues)]
    .sort((left, right) => left.localeCompare(right, 'vi'))
    .slice(0, MAX_FACET_VALUES)
}

export function getFirstSearchParam(
  searchParams: ProductSearchParams,
  key: string,
): string | undefined {
  return getSearchParamValues(searchParams, key)[0]
}

export function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback
  }

  const parsedValue = Number(value)

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1 || parsedValue > 10_000) {
    return fallback
  }

  return parsedValue
}

export function parseNonNegativeNumber(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null
  }

  return parsedValue
}

export function addStringFilterCondition(
  conditions: Where[],
  fieldPath: string,
  values: readonly string[],
): void {
  if (values.length === 0) {
    return
  }

  conditions.push({
    [fieldPath]: values.length === 1
      ? { equals: values[0] }
      : { in: values.join(',') },
  })
}

function addAnyStringFilterCondition(
  conditions: Where[],
  fieldPaths: readonly string[],
  values: readonly string[],
): void {
  if (values.length === 0) {
    return
  }

  conditions.push({
    or: fieldPaths.map((fieldPath) => ({
      [fieldPath]: values.length === 1
        ? { equals: values[0] }
        : { in: values.join(',') },
    })),
  })
}

export function getAttributeFilterEntries(
  searchParams: ProductSearchParams,
): Array<{ key: string; values: string[] }> {
  return Object.keys(searchParams)
    .filter((key) => key.startsWith('attr_') || key.startsWith('attribute_'))
    .sort((left, right) => left.localeCompare(right, 'vi'))
    .map((key) => ({ key, values: getSearchParamValues(searchParams, key) }))
    .filter((entry) => entry.values.length > 0)
}

export function appendAdvancedProductWhereConditions(
  conditions: Where[],
  searchParams: ProductSearchParams,
): void {
  for (const entry of getAttributeFilterEntries(searchParams)) {
    addStringFilterCondition(
      conditions,
      'productAttributes.values.slug',
      entry.values,
    )
  }

  const rewrittenAttributeValue = getFirstSearchParam(searchParams, 'value')

  if (getFirstSearchParam(searchParams, 'attribute') && rewrittenAttributeValue) {
    addStringFilterCondition(
      conditions,
      'productAttributes.values.slug',
      [rewrittenAttributeValue],
    )
  }

  addAnyStringFilterCondition(
    conditions,
    [
      'fragranceProfile.topNotes.slug',
      'fragranceProfile.middleNotes.slug',
      'fragranceProfile.baseNotes.slug',
    ],
    getSearchParamValues(searchParams, 'note'),
  )

  const availabilityValues = getSearchParamValues(searchParams, 'availability')

  if (availabilityValues.includes('in-stock')) {
    conditions.push({
      or: [
        { 'price.stock': { greater_than: 0 } },
        { 'variants.stock': { greater_than: 0 } },
      ],
    })
  }

  if (availabilityValues.includes('out-of-stock')) {
    conditions.push({
      and: [
        { 'price.stock': { less_than_equal: 0 } },
      ],
    })
  }

  if (getSearchParamValues(searchParams, 'sale').includes('yes')) {
    conditions.push({
      or: [
        { 'price.salePrice': { greater_than: 0 } },
        { 'variants.salePrice': { greater_than: 0 } },
      ],
    })
  }

  const ratingValue = Number(getFirstSearchParam(searchParams, 'rating'))

  if (Number.isFinite(ratingValue) && ratingValue > 0) {
    conditions.push({
      averageRating: {
        greater_than_equal: Math.min(5, ratingValue),
      },
    })
  }
}

export function appendAdvancedSearchParams(
  target: URLSearchParams,
  source: ProductSearchParams,
): void {
  const keys = Object.keys(source)
    .filter(
      (key) =>
        key.startsWith('attr_') ||
        key.startsWith('attribute_') ||
        ADVANCED_FILTER_KEYS.includes(key as (typeof ADVANCED_FILTER_KEYS)[number]),
    )
    .sort((left, right) => left.localeCompare(right, 'vi'))

  for (const key of keys) {
    for (const value of getSearchParamValues(source, key)) {
      target.append(key, value)
    }
  }
}

export function hasAdvancedProductFilters(searchParams: ProductSearchParams): boolean {
  return (
    getAttributeFilterEntries(searchParams).length > 0 ||
    ADVANCED_FILTER_KEYS.some((key) => getSearchParamValues(searchParams, key).length > 0)
  )
}
