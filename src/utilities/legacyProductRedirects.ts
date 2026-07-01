import type { PayloadRequest } from 'payload'

import {
    buildLegacyProductPath,
    buildProductPath,
    getInternalPathFromRedirectTarget,
    isReservedRootPath,
    normalizeProductSlug,
    normalizeRedirectDestination,
    normalizeRedirectSource,
} from '@/utilities/redirects'

type PayloadClient = PayloadRequest['payload']

type RedirectDocument = {
    id: number | string
    active?: boolean | null
    from?: string | null
    to?: string | null
    type?: '301' | '302' | null
}

type LegacyRedirectEvent =
    | 'backfill'
    | 'product_create'
    | 'product_update'
    | 'product_slug_change'

export type LegacyRedirectResult =
    | 'created'
    | 'updated'
    | 'already_exists'
    | 'conflict'
    | 'invalid_slug'
    | 'reserved_slug'
    | 'not_public'
    | 'self_loop'
    | 'error'

export type LegacyRedirectLog = Readonly<{
    event: LegacyRedirectEvent
    from?: string
    to?: string
    productId?: number | string
    productSlug?: string
    result: LegacyRedirectResult
    error?: string
    existingTo?: string
    expectedTo?: string
}>

type EnsureLegacyRedirectArgs = Readonly<{
    event: LegacyRedirectEvent
    payload: PayloadClient
    productId?: number | string
    req?: PayloadRequest
    safeExistingTargets?: readonly string[]
    sourceSlug: null | string | undefined
    status?: unknown
    targetSlug?: null | string | undefined
}>

export function isPublicProductForLegacyRedirect(
    status: unknown,
): boolean {
    return status === 'published'
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : String(error)
}

function logLegacyRedirectEvent(
    entry: LegacyRedirectLog,
): void {
    if (entry.result === 'error' || entry.result === 'conflict') {
        console.warn('[LegacyProductRedirect]', entry)
        return
    }

    if (
        process.env.NODE_ENV !== 'production' ||
        entry.result === 'created' ||
        entry.result === 'updated'
    ) {
        console.info('[LegacyProductRedirect]', entry)
    }
}

async function findRedirectByFrom(
    payload: PayloadClient,
    from: string,
    req?: PayloadRequest,
): Promise<RedirectDocument | null> {
    const result = await payload.find({
        collection: 'redirects',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req,
        where: {
            from: {
                equals: from,
            },
        },
    })

    return (result.docs[0] as RedirectDocument | undefined) ?? null
}

function normalizeSafeTargets(
    targets: readonly string[] | undefined,
): Set<string> {
    return new Set(
        (targets ?? [])
            .map((target) => normalizeRedirectDestination(target))
            .filter((target): target is string => Boolean(target)),
    )
}

function isExistingRedirectSafeToUpdate(
    existingTo: string | null,
    safeExistingTargets: readonly string[] | undefined,
): boolean {
    if (!existingTo) {
        return false
    }

    const normalizedExistingTo =
        normalizeRedirectDestination(existingTo)

    if (!normalizedExistingTo) {
        return false
    }

    return normalizeSafeTargets(safeExistingTargets).has(
        normalizedExistingTo,
    )
}

export function getLegacyProductRedirectPaths(
    sourceSlug: null | string | undefined,
    targetSlug: null | string | undefined = sourceSlug,
): Readonly<{
    from: string
    sourceSlug: string
    targetSlug: string
    to: string
}> | null {
    const normalizedSourceSlug =
        normalizeProductSlug(sourceSlug)
    const normalizedTargetSlug =
        normalizeProductSlug(targetSlug)

    if (!normalizedSourceSlug || !normalizedTargetSlug) {
        return null
    }

    const from = buildLegacyProductPath(normalizedSourceSlug)
    const to = buildProductPath(normalizedTargetSlug)

    if (!from || !to) {
        return null
    }

    return {
        from,
        sourceSlug: normalizedSourceSlug,
        targetSlug: normalizedTargetSlug,
        to,
    }
}

export async function ensureLegacyProductRedirect({
    event,
    payload,
    productId,
    req,
    safeExistingTargets,
    sourceSlug,
    status,
    targetSlug = sourceSlug,
}: EnsureLegacyRedirectArgs): Promise<LegacyRedirectLog> {
    const normalizedSourceSlug =
        normalizeProductSlug(sourceSlug)

    if (!normalizedSourceSlug) {
        const entry = {
            event,
            productId,
            result: 'invalid_slug',
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }

    if (!isPublicProductForLegacyRedirect(status)) {
        const entry = {
            event,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'not_public',
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }

    if (isReservedRootPath(normalizedSourceSlug)) {
        const entry = {
            event,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'reserved_slug',
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }

    const paths = getLegacyProductRedirectPaths(
        normalizedSourceSlug,
        targetSlug,
    )

    if (!paths) {
        const entry = {
            event,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'invalid_slug',
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }

    if (
        normalizeRedirectSource(paths.from) ===
        getInternalPathFromRedirectTarget(paths.to)
    ) {
        const entry = {
            event,
            from: paths.from,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'self_loop',
            to: paths.to,
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }

    try {
        const existingRedirect = await findRedirectByFrom(
            payload,
            paths.from,
            req,
        )

        if (!existingRedirect) {
            await payload.create({
                collection: 'redirects',
                overrideAccess: true,
                req,
                data: {
                    active: true,
                    from: paths.from,
                    to: paths.to,
                    type: '301',
                },
            })

            const entry = {
                event,
                from: paths.from,
                productId,
                productSlug: normalizedSourceSlug,
                result: 'created',
                to: paths.to,
            } satisfies LegacyRedirectLog

            logLegacyRedirectEvent(entry)
            return entry
        }

        const existingTo =
            normalizeRedirectDestination(
                existingRedirect.to ?? '',
            )
        const expectedTo =
            normalizeRedirectDestination(paths.to)

        if (existingTo === expectedTo) {
            if (
                existingRedirect.active !== true ||
                existingRedirect.type !== '301'
            ) {
                await payload.update({
                    collection: 'redirects',
                    id: existingRedirect.id,
                    overrideAccess: true,
                    req,
                    data: {
                        active: true,
                        type: '301',
                    },
                })

                const entry = {
                    event,
                    from: paths.from,
                    productId,
                    productSlug: normalizedSourceSlug,
                    result: 'updated',
                    to: paths.to,
                } satisfies LegacyRedirectLog

                logLegacyRedirectEvent(entry)
                return entry
            }

            const entry = {
                event,
                from: paths.from,
                productId,
                productSlug: normalizedSourceSlug,
                result: 'already_exists',
                to: paths.to,
            } satisfies LegacyRedirectLog

            logLegacyRedirectEvent(entry)
            return entry
        }

        if (
            isExistingRedirectSafeToUpdate(
                existingRedirect.to ?? null,
                safeExistingTargets,
            )
        ) {
            await payload.update({
                collection: 'redirects',
                id: existingRedirect.id,
                overrideAccess: true,
                req,
                data: {
                    active: true,
                    to: paths.to,
                    type: '301',
                },
            })

            const entry = {
                event,
                existingTo: existingRedirect.to ?? undefined,
                expectedTo: paths.to,
                from: paths.from,
                productId,
                productSlug: normalizedSourceSlug,
                result: 'updated',
                to: paths.to,
            } satisfies LegacyRedirectLog

            logLegacyRedirectEvent(entry)
            return entry
        }

        const entry = {
            event,
            existingTo: existingRedirect.to ?? undefined,
            expectedTo: paths.to,
            from: paths.from,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'conflict',
            to: paths.to,
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    } catch (error: unknown) {
        const entry = {
            error: getErrorMessage(error),
            event,
            from: paths.from,
            productId,
            productSlug: normalizedSourceSlug,
            result: 'error',
            to: paths.to,
        } satisfies LegacyRedirectLog

        logLegacyRedirectEvent(entry)
        return entry
    }
}