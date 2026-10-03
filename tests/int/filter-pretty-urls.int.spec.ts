import { describe, expect, it } from 'vitest'

import {
  buildFilterUrl,
  getFilterParamsFromPrettyPathname,
} from '@/components/search-filters/filterPrettyUrls'

const categoryRoute = {
  type: 'category' as const,
  slug: 'nuoc-hoa',
  clearPath: '/products',
}

describe('category season SEO URLs', () => {
  it('builds a clean category URL for one season', () => {
    const params = new URLSearchParams({ attr_mua: 'xuan' })

    expect(buildFilterUrl(params, categoryRoute))
      .toBe('/categories/nuoc-hoa/xuan')
  })

  it('keeps additional filters in the query string', () => {
    const params = new URLSearchParams({
      attr_mua: 'xuan',
      brand: 'dior',
      page: '2',
    })

    expect(buildFilterUrl(params, categoryRoute))
      .toBe('/categories/nuoc-hoa/xuan?brand=dior&page=2')
  })

  it('reads the season filter back from the clean URL', () => {
    const params = getFilterParamsFromPrettyPathname('/categories/nuoc-hoa/xuan')

    expect(params.get('attr_mua')).toBe('xuan')
  })

  it('does not collapse multiple seasons into one path segment', () => {
    const params = new URLSearchParams()
    params.append('attr_mua', 'xuan')
    params.append('attr_mua', 'he')

    expect(buildFilterUrl(params, categoryRoute))
      .toBe('/categories/nuoc-hoa?attr_mua=xuan&attr_mua=he')
  })
})
