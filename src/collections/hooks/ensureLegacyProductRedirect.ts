import type { CollectionAfterChangeHook } from 'payload'

import {
    buildProductPath,
    normalizeProductSlug,
} from '@/utilities/redirects'
import { ensureLegacyProductRedirect } from '@/utilities/legacyProductRedirects'

type ProductRedirectDocument = {
    id: number | string
    slug?: null | string
    status?: null | string
}

export const ensureLegacyProductRedirectHook: CollectionAfterChangeHook<
    ProductRedirectDocument
> = async ({
    doc,
    operation,
    previousDoc,
    req,
}) => {
    if (
        process.env.DISABLE_LEGACY_PRODUCT_REDIRECTS === 'true'
    ) {
        return doc
    }

    const currentSlug = normalizeProductSlug(doc.slug)

    if (!currentSlug) {
        return doc
    }

    try {
        const previousSlug = normalizeProductSlug(
            previousDoc?.slug,
        )

        if (
            operation === 'update' &&
            previousSlug &&
            previousSlug !== currentSlug
        ) {
            const previousProductPath =
                buildProductPath(previousSlug)

            await ensureLegacyProductRedirect({
                event: 'product_slug_change',
                payload: req.payload,
                productId: doc.id,
                req,
                safeExistingTargets: previousProductPath
                    ? [previousProductPath]
                    : [],
                sourceSlug: previousSlug,
                status: doc.status,
                targetSlug: currentSlug,
            })
        }

        await ensureLegacyProductRedirect({
            event:
                operation === 'create'
                    ? 'product_create'
                    : 'product_update',
            payload: req.payload,
            productId: doc.id,
            req,
            sourceSlug: currentSlug,
            status: doc.status,
            targetSlug: currentSlug,
        })
    } catch (error: unknown) {
        console.error('[LegacyProductRedirect]', {
            error:
                error instanceof Error
                    ? error.message
                    : String(error),
            event: 'product_after_change',
            productId: doc.id,
            productSlug: currentSlug,
            result: 'error',
        })
    }

    return doc
}