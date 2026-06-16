import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
    areSameRedirectLocation,
    getInternalPathFromRedirectTarget,
    MAX_REDIRECT_HOPS,
    normalizeRedirectDestination,
    normalizeRedirectSource,
    REDIRECT_LOOKUP_HEADER,
    REDIRECTS_CACHE_TAG,
    redirectDestinationHasQuery,
    type RedirectLookupResponse,
    type RedirectStatusCode,
} from '@/utilities/redirects'

export const runtime = 'nodejs'

const CACHE_REVALIDATE_SECONDS = 3600

function isValidSecret(
    providedSecret: string | null,
    expectedSecret: string,
): boolean {
    if (!providedSecret) {
        return false
    }

    const providedBuffer = Buffer.from(providedSecret)
    const expectedBuffer = Buffer.from(expectedSecret)

    if (providedBuffer.length !== expectedBuffer.length) {
        return false
    }

    return timingSafeEqual(
        providedBuffer,
        expectedBuffer,
    )
}

async function findActiveRedirect(from: string) {
    const payload = await getPayload({
        config: configPromise,
    })

    const result = await payload.find({
        collection: 'redirects',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        where: {
            and: [
                {
                    from: {
                        equals: from,
                    },
                },
                {
                    active: {
                        equals: true,
                    },
                },
            ],
        },
    })

    return result.docs[0] ?? null
}

async function resolveRedirectChain(
    sourcePath: string,
): Promise<RedirectLookupResponse> {
    const normalizedSource =
        normalizeRedirectSource(sourcePath)

    if (!normalizedSource) {
        return {
            found: false,
        }
    }

    const visitedPaths = new Set<string>()

    let currentPath = normalizedSource
    let finalDestination: string | null = null
    let finalStatusCode: RedirectStatusCode = 301

    for (
        let hop = 0;
        hop < MAX_REDIRECT_HOPS;
        hop += 1
    ) {
        if (visitedPaths.has(currentPath)) {
            return {
                found: false,
            }
        }

        visitedPaths.add(currentPath)

        const redirect = await findActiveRedirect(currentPath)

        if (!redirect) {
            if (!finalDestination) {
                return {
                    found: false,
                }
            }

            return {
                found: true,
                statusCode: finalStatusCode,
                to: finalDestination,
            }
        }

        const normalizedDestination =
            normalizeRedirectDestination(redirect.to)

        if (!normalizedDestination) {
            return {
                found: false,
            }
        }

        if (
            areSameRedirectLocation(
                currentPath,
                normalizedDestination,
            )
        ) {
            return {
                found: false,
            }
        }

        if (redirect.type === '302') {
            finalStatusCode = 302
        }

        finalDestination = normalizedDestination

        /*
         * Không tiếp tục giải chuỗi với URL ngoài hệ thống.
         */
        const nextInternalPath =
            getInternalPathFromRedirectTarget(
                normalizedDestination,
            )

        if (!nextInternalPath) {
            return {
                found: true,
                statusCode: finalStatusCode,
                to: normalizedDestination,
            }
        }

        /*
         * Nếu bản ghi đích có query riêng, giữ nguyên đích đó
         * thay vì tiếp tục giải chuỗi và làm mất query.
         */
        if (
            redirectDestinationHasQuery(
                normalizedDestination,
            )
        ) {
            return {
                found: true,
                statusCode: finalStatusCode,
                to: normalizedDestination,
            }
        }

        /*
         * Bắt chu kỳ:
         *
         * A -> B
         * B -> A
         */
        if (visitedPaths.has(nextInternalPath)) {
            return {
                found: false,
            }
        }

        currentPath = nextInternalPath
    }

    /*
     * Chuỗi vượt quá MAX_REDIRECT_HOPS có thể là:
     *
     * - Redirect chain quá dài.
     * - Một chu kỳ phức tạp.
     *
     * Không redirect để tránh làm trình duyệt và Googlebot
     * rơi vào vòng lặp.
     */
    return {
        found: false,
    }
}

const getResolvedRedirect = unstable_cache(
    resolveRedirectChain,
    ['mfparis-redirect-resolver-v1'],
    {
        revalidate: CACHE_REVALIDATE_SECONDS,
        tags: [REDIRECTS_CACHE_TAG],
    },
)

function createJsonResponse(
    body: RedirectLookupResponse,
    status = 200,
): NextResponse<RedirectLookupResponse> {
    return NextResponse.json(body, {
        status,
        headers: {
            'Cache-Control': 'private, no-store',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    })
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<RedirectLookupResponse>> {
    const expectedSecret =
        process.env.REDIRECT_LOOKUP_SECRET?.trim()

    if (!expectedSecret) {
        return createJsonResponse(
            {
                found: false,
            },
            503,
        )
    }

    const providedSecret = request.headers.get(
        REDIRECT_LOOKUP_HEADER,
    )

    if (!isValidSecret(providedSecret, expectedSecret)) {
        return createJsonResponse(
            {
                found: false,
            },
            401,
        )
    }

    const requestedPath =
        request.nextUrl.searchParams.get('path')

    if (!requestedPath) {
        return createJsonResponse(
            {
                found: false,
            },
            400,
        )
    }

    const normalizedPath =
        normalizeRedirectSource(requestedPath)

    if (!normalizedPath) {
        return createJsonResponse(
            {
                found: false,
            },
            400,
        )
    }

    const result = await getResolvedRedirect(
        normalizedPath,
    )

    return createJsonResponse(result)
}