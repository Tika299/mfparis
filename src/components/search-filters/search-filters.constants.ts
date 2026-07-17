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
    value: '-averageRating',
    label: 'Đánh giá cao',
  },
  {
    value: '-reviewCount',
    label: 'Nhiều đánh giá',
  },
  {
    value: 'price.basePrice',
    label: 'Giá: thấp đến cao',
  },
  {
    value: '-price.basePrice',
    label: 'Giá: cao đến thấp',
  },
  {
    value: 'title',
    label: 'Tên: A - Z',
  },
] as const
