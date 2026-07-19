import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

export type HeaderSearchBrand = {
  name: string
  slug: string
}

export const getHeaderSearchBrands = unstable_cache(
  async (): Promise<HeaderSearchBrand[]> => {
    const payload = await getPayload({
      config: configPromise,
    })

    const result = await payload.find({
      collection: 'brands',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      sort: 'name',
      select: {
        name: true,
        slug: true,
      },
    })

    return result.docs.reduce<HeaderSearchBrand[]>((brands, item) => {
      const name = typeof item.name === 'string' ? item.name.trim() : ''
      const slug = typeof item.slug === 'string' ? item.slug.trim() : ''

      if (name && slug) {
        brands.push({ name, slug })
      }

      return brands
    }, [])
  },
  ['header-search-brands'],
  {
    tags: ['brands'],
    revalidate: 3600,
  },
)
