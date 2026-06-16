import type {
    CollectionAfterChangeHook,
    PayloadRequest,
} from 'payload'

import {
    normalizeRedirectPathname,
    normalizeRedirectSource,
} from '@/utilities/redirects'

const PRODUCT_ROUTE_PREFIX = '/products' as const
const CATEGORY_ROUTE_PREFIX = '/categories' as const

type SluggedDocument = {
    id: number | string
    slug?: null | string
}

type TrackSlugHistoryOptions = Readonly<{
    routePrefix: string
}>

function normalizeSlug(value: null | string | undefined): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedSlug = value
        .trim()
        .toLowerCase()
        .replace(/^\/+/gu, '')
        .replace(/\/+$/gu, '')

    return normalizedSlug || null
}

function buildDocumentPath(
    routePrefix: string,
    slug: string,
): string {
    return normalizeRedirectPathname(
        `${routePrefix}/${slug}`,
    )
}

async function findRedirectsByFrom(
    req: PayloadRequest,
    from: string,
) {
    return req.payload.find({
        collection: 'redirects',
        depth: 0,
        limit: 10,
        pagination: false,
        overrideAccess: true,
        req,
        where: {
            from: {
                equals: from,
            },
        },
    })
}

async function findRedirectsByTo(
    req: PayloadRequest,
    to: string,
) {
    return req.payload.find({
        collection: 'redirects',
        depth: 0,
        limit: 100,
        pagination: false,
        overrideAccess: true,
        req,
        where: {
            to: {
                equals: to,
            },
        },
    })
}

async function deactivateRedirectsFromNewPath(
    req: PayloadRequest,
    newPath: string,
): Promise<void> {
    const existingRedirects = await findRedirectsByFrom(
        req,
        newPath,
    )

    for (const redirect of existingRedirects.docs) {
        if (!redirect.active) {
            continue
        }

        await req.payload.update({
            collection: 'redirects',
            id: redirect.id,
            overrideAccess: true,
            req,
            data: {
                active: false,
            },
        })
    }
}

async function flattenExistingRedirectChain(
    req: PayloadRequest,
    oldPath: string,
    newPath: string,
): Promise<void> {
    const redirectsPointingToOldPath =
        await findRedirectsByTo(req, oldPath)

    for (const redirect of redirectsPointingToOldPath.docs) {
        const normalizedRedirectFrom = normalizeRedirectSource(
            redirect.from,
        )

        if (!normalizedRedirectFrom) {
            continue
        }

        /*
         * Không cập nhật thành:
         *
         * oldPath -> newPath
         * newPath -> newPath
         *
         * vì đây sẽ là self-loop.
         */
        if (
            normalizedRedirectFrom === oldPath ||
            normalizedRedirectFrom === newPath
        ) {
            continue
        }

        await req.payload.update({
            collection: 'redirects',
            id: redirect.id,
            overrideAccess: true,
            req,
            data: {
                to: newPath,
            },
        })
    }
}

async function upsertSlugRedirect(
    req: PayloadRequest,
    oldPath: string,
    newPath: string,
): Promise<void> {
    const existingRedirects = await findRedirectsByFrom(
        req,
        oldPath,
    )

    const existingRedirect = existingRedirects.docs[0]

    if (existingRedirect) {
        await req.payload.update({
            collection: 'redirects',
            id: existingRedirect.id,
            overrideAccess: true,
            req,
            data: {
                active: true,
                from: oldPath,
                to: newPath,
                type: '301',
            },
        })

        return
    }

    try {
        await req.payload.create({
            collection: 'redirects',
            overrideAccess: true,
            req,
            data: {
                active: true,
                from: oldPath,
                to: newPath,
                type: '301',
            },
        })
    } catch (error: unknown) {
        /*
         * Xử lý race condition khi hai request đồng thời
         * cùng tạo redirect có trường from unique.
         */
        const redirectsAfterConflict = await findRedirectsByFrom(
            req,
            oldPath,
        )

        const redirectAfterConflict =
            redirectsAfterConflict.docs[0]

        if (!redirectAfterConflict) {
            throw error
        }

        await req.payload.update({
            collection: 'redirects',
            id: redirectAfterConflict.id,
            overrideAccess: true,
            req,
            data: {
                active: true,
                to: newPath,
                type: '301',
            },
        })
    }
}

function createTrackSlugHistoryHook(
    options: TrackSlugHistoryOptions,
): CollectionAfterChangeHook<SluggedDocument> {
    return async ({
        doc,
        operation,
        previousDoc,
        req,
    }) => {
        if (operation !== 'update') {
            return doc
        }

        const previousSlug = normalizeSlug(previousDoc?.slug)
        const currentSlug = normalizeSlug(doc.slug)

        if (
            !previousSlug ||
            !currentSlug ||
            previousSlug === currentSlug
        ) {
            return doc
        }

        const oldPath = buildDocumentPath(
            options.routePrefix,
            previousSlug,
        )

        const newPath = buildDocumentPath(
            options.routePrefix,
            currentSlug,
        )

        if (oldPath === newPath) {
            return doc
        }

        /*
         * Nếu URL mới từng là URL cũ và đang có redirect,
         * phải vô hiệu hóa redirect đó trước.
         *
         * Ví dụ:
         * A -> B
         *
         * Sau đó Admin đổi slug B trở lại A.
         * Redirect A -> B phải được tắt trước khi tạo B -> A.
         */
        await deactivateRedirectsFromNewPath(req, newPath)

        /*
         * Rút gọn chuỗi:
         *
         * A -> B
         * B đổi thành C
         *
         * Thành:
         * A -> C
         * B -> C
         */
        await flattenExistingRedirectChain(
            req,
            oldPath,
            newPath,
        )

        await upsertSlugRedirect(req, oldPath, newPath)

        return doc
    }
}

export const trackProductSlugHistory =
    createTrackSlugHistoryHook({
        routePrefix: PRODUCT_ROUTE_PREFIX,
    })

export const trackCategorySlugHistory =
    createTrackSlugHistoryHook({
        routePrefix: CATEGORY_ROUTE_PREFIX,
    })