import { revalidateTag } from 'next/cache'

export function invalidateInternalLinkCache(
    tag: 'internal-link-rules' | 'site-settings',
) {
    try {
        revalidateTag(tag, { expire: 0 })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        // Payload CLI jobs run outside a Next.js request/render context.
        // The database write is still valid; there is simply no request cache
        // available to invalidate at that moment.
        if (message.includes('static generation store missing')) {
            console.warn(
                `[revalidateTag] Bỏ qua cache ${tag} vì đang chạy ngoài ngữ cảnh Next.js request/render.`,
            )
            return
        }

        throw error
    }
}
