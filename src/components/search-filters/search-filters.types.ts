export type FilterItem = {
    id: string | number
    name: string
    slug: string
    count?: number
}

export type PriceRange = [number, number]

export type SearchFiltersVariant =
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

export type FilterKey =
    | 'brand'
    | 'category'
    | 'volume'
    | 'scent'
    | 'gender'
    | 'min'
    | 'max'
    | 'sort'

export type FilterUpdates = Partial<
    Record<FilterKey, string | null>
>

export type SearchFiltersProps = {
    brands: FilterItem[]
    categories?: FilterItem[]
    variant?: SearchFiltersVariant
    sticky?: boolean
    routeContext?: FilterRouteContext
}