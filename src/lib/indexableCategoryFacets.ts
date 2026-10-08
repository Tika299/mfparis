export const SEASON_FILTER_KEY = 'attr_mua'

export type IndexableFacetConfig = {
  key?: string | null
  value?: string | null
  h1?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  introHtml?: string | null
  bottomContentHtml?: string | null
}

type HasIndexableFacets = {
  indexableFacets?: IndexableFacetConfig[] | null
}

export function normalizeIndexableFacetKey(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase()

  if (raw === 'mua' || raw === SEASON_FILTER_KEY) {
    return SEASON_FILTER_KEY
  }

  if (raw.startsWith('attribute_')) {
    return `attr_${raw.slice('attribute_'.length)}`
  }

  if (raw.startsWith('attr_')) {
    return raw
  }

  return raw ? `attr_${raw}` : ''
}

export function getIndexableFacetAttributeSlug(key: unknown): string {
  return normalizeIndexableFacetKey(key).replace(/^attr_/, '')
}

export function normalizeIndexableFacetValue(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function normalizePrettyFacet(value: unknown): string | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return null
  }

  return normalized
}

export function buildIndexableFacetPath(
  key: unknown,
  value: unknown,
): string {
  const attributeSlug = getIndexableFacetAttributeSlug(key)
  const facetValue = normalizeIndexableFacetValue(value)

  return attributeSlug && facetValue
    ? `${attributeSlug}-${facetValue}`
    : ''
}

export function getConfiguredIndexableFacet(
  category: HasIndexableFacets,
  key: unknown,
  value: unknown,
): IndexableFacetConfig | null {
  const normalizedKey = normalizeIndexableFacetKey(key)
  const normalizedValue = normalizeIndexableFacetValue(value)

  if (!normalizedKey || !normalizedValue || !Array.isArray(category.indexableFacets)) {
    return null
  }

  return category.indexableFacets.find((facet) => (
    normalizeIndexableFacetKey(facet?.key) === normalizedKey &&
    normalizeIndexableFacetValue(facet?.value) === normalizedValue
  )) ?? null
}

export function getConfiguredIndexableFacetByPath(
  category: HasIndexableFacets,
  path: string,
): IndexableFacetConfig | null {
  const normalizedPath = normalizePrettyFacet(path)

  if (!normalizedPath || !Array.isArray(category.indexableFacets)) {
    return null
  }

  return category.indexableFacets.find((facet) => (
    buildIndexableFacetPath(facet?.key, facet?.value) === normalizedPath
  )) ?? null
}

export function getIndexableFacetPathFromQuery(
  category: HasIndexableFacets,
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): string | null {
  if (!Array.isArray(category.indexableFacets)) {
    return null
  }

  for (const facet of category.indexableFacets) {
    const key = normalizeIndexableFacetKey(facet?.key)
    const values = searchParams[key] === undefined
      ? searchParams[String(facet?.key || '')]
      : searchParams[key]
    const value = Array.isArray(values) ? values[0] : values

    if (!key || !value || normalizeIndexableFacetValue(facet?.value) !== normalizeIndexableFacetValue(value)) {
      continue
    }

    return buildIndexableFacetPath(key, value)
  }

  const seasonValue = searchParams[SEASON_FILTER_KEY]
  const seasonSlug = Array.isArray(seasonValue) ? seasonValue[0] : seasonValue

  if (seasonSlug && normalizePrettyFacet(seasonSlug)) {
    return buildIndexableFacetPath(SEASON_FILTER_KEY, seasonSlug)
  }

  return null
}
