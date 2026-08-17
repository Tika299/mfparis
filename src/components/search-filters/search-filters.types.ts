export type FilterItem = {
    id: string | number
    name: string
    slug: string
    count?: number
}

export type FilterFacetGroup = {
    key: string
    title: string
    placeholder: string
    items: FilterItem[]
    emptyMessage?: string
    multiple?: boolean
    description?: string
}

export type PriceRange = [number, number]

export type CoreFilterKey =
    | 'brand'
    | 'category'
    | 'price'
    | 'availability'
    | 'sale'
    | 'rating'

export type SearchFiltersVariant =
    | 'responsive'
    | 'sidebar'
    | 'horizontal'
    | 'mobile-fab'

export type FilterRouteContext =
    | {
        type: 'listing'
    }
    | {
        type: 'category'
        slug: string
        clearPath: string
    }
    | {
        type: 'brand'
        slug: string
        clearPath: string
    }
    | {
        type: 'search'
    }

export type FilterUpdates = Record<string, string | null>

export type SearchFiltersProps = {
    brands: FilterItem[]
    categories?: FilterItem[]
    facets?: FilterFacetGroup[]
    enabledCoreFilters?: CoreFilterKey[]
    resultCount?: number
    variant?: SearchFiltersVariant
    sticky?: boolean
    routeContext?: FilterRouteContext
}
