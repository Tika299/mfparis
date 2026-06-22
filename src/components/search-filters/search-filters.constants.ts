export const PRICE_MIN = 0
export const PRICE_MAX = 10_000_000
export const PRICE_STEP = 100_000

export const DEFAULT_SORT = '-createdAt'

export const SORT_OPTIONS = [
    {
        value: '-createdAt',
        label: 'Mới nhất',
    },
    {
        value: 'price.basePrice',
        label: 'Giá: Thấp đến Cao',
    },
    {
        value: '-price.basePrice',
        label: 'Giá: Cao đến Thấp',
    },
    {
        value: 'title',
        label: 'Tên: A - Z',
    },
] as const