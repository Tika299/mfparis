import { revalidateTag } from 'next/cache'

export function invalidateInternalLinkCache(
    tag: 'internal-link-rules' | 'site-settings',
) {
    revalidateTag(tag, { expire: 0 })
}