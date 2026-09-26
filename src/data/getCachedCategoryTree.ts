import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const getCachedCategoryTree = unstable_cache(
    async () => {
        const payload = await getPayload({ config: configPromise })

        return payload.find({
            collection: 'categories',
            depth: 1,
            limit: 1000,
            pagination: false,
            overrideAccess: true,
            select: {
                id: true,
                name: true,
                slug: true,
                parent: true,
                image: true,
            },
        })
    },
    ['mfparis-category-tree-v1'],
    {
        revalidate: 300,
        tags: ['categories'],
    },
)