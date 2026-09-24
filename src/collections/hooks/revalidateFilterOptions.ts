import { revalidateTag } from 'next/cache'

export const revalidateFilterOptions = () => {
    try {
        for (const tag of [
            'attributes',
            'attribute-values',
            'fragrance-notes',
            'product-filter-groups',
        ]) {
            revalidateTag(tag, 'max')
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        // CLI import không chạy trong môi trường cache của Next.js.
        if (message.includes('static generation store missing')) return

        throw error
    }
}