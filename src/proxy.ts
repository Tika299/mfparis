import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
    buildRedirectTargetUrl,
    getInternalPathFromRedirectTarget,
    isRedirectLookupResponse,
    normalizeRedirectSource,
    REDIRECT_LOOKUP_ENDPOINT,
    REDIRECT_LOOKUP_HEADER,
    shouldLookupRedirectPath,
    type RedirectLookupResponse,
} from '@/utilities/redirects'

const REDIRECT_LOOKUP_TIMEOUT_MS = 1_500
const CATEGORY_PATH_PATTERN = /^\/categories\/([^/]+)\/?$/
const CATEGORY_FACET_PATH_PATTERN = /^\/categories\/([^/]+)\/([^/]+)\/?$/
const SEO_SEASON_FILTER_KEY = 'attr_mua'

function isRedirectableMethod(method: string): boolean {
    return method === 'GET' || method === 'HEAD'
}

function getCategorySeasonRedirect(request: NextRequest): URL | null {
    const categoryMatch = request.nextUrl.pathname.match(CATEGORY_PATH_PATTERN)

    if (!categoryMatch) {
        return null
    }

    const seasonValues = request.nextUrl.searchParams.getAll(SEO_SEASON_FILTER_KEY)

    if (seasonValues.length !== 1) {
        return null
    }

    const season = seasonValues[0].trim().toLowerCase()

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(season)) {
        return null
    }

    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = `/categories/${categoryMatch[1]}/mua-${encodeURIComponent(season)}`
    targetUrl.searchParams.delete(SEO_SEASON_FILTER_KEY)

    return targetUrl
}

async function fetchRedirectResult(
    request: NextRequest,
    pathname: string,
): Promise<RedirectLookupResponse | null> {
    const lookupSecret =
        process.env.REDIRECT_LOOKUP_SECRET?.trim()

    if (!lookupSecret) {
        return null
    }

    const lookupOrigin =
        process.env.REDIRECT_LOOKUP_ORIGIN?.trim() ||
        request.nextUrl.origin

    const lookupUrl = new URL(
        REDIRECT_LOOKUP_ENDPOINT,
        lookupOrigin,
    )

    lookupUrl.searchParams.set('path', pathname)

    const abortController = new AbortController()

    const timeoutId = setTimeout(() => {
        abortController.abort()
    }, REDIRECT_LOOKUP_TIMEOUT_MS)

    try {
        const response = await fetch(lookupUrl, {
            method: 'GET',
            cache: 'no-store',
            redirect: 'manual',
            signal: abortController.signal,
            headers: {
                Accept: 'application/json',
                [REDIRECT_LOOKUP_HEADER]: lookupSecret,
            },
        })

        if (!response.ok) {
            return null
        }

        const responseBody: unknown = await response.json()

        if (!isRedirectLookupResponse(responseBody)) {
            return null
        }

        return responseBody
    } catch (error: unknown) {
        if (
            process.env.NODE_ENV === 'development' &&
            error instanceof Error &&
            error.name !== 'AbortError'
        ) {
            console.error(
                `[Redirect Proxy] Không thể kiểm tra redirect cho "${pathname}":`,
                error.message,
            )
        }

        return null
    } finally {
        clearTimeout(timeoutId)
    }
}

export async function proxy(
    request: NextRequest,
): Promise<NextResponse> {
    if (!isRedirectableMethod(request.method)) {
        return NextResponse.next()
    }

    const categoryFacetMatch = request.nextUrl.pathname.match(CATEGORY_FACET_PATH_PATTERN)

    if (categoryFacetMatch && !categoryFacetMatch[2].startsWith('mua-')) {
        const legacyFacet = categoryFacetMatch[2].trim().toLowerCase()

        if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(legacyFacet)) {
            const targetUrl = request.nextUrl.clone()
            targetUrl.pathname = `/categories/${categoryFacetMatch[1]}/mua-${encodeURIComponent(legacyFacet)}`
            return NextResponse.redirect(targetUrl, 308)
        }
    }

    const categorySeasonRedirect = getCategorySeasonRedirect(request)

    if (categorySeasonRedirect) {
        return NextResponse.redirect(categorySeasonRedirect, 308)
    }

    const normalizedRequestPath = normalizeRedirectSource(
        request.nextUrl.pathname,
    )

    if (!normalizedRequestPath) {
        return NextResponse.next()
    }

    if (!shouldLookupRedirectPath(normalizedRequestPath)) {
        return NextResponse.next()
    }

    const redirectResult = await fetchRedirectResult(
        request,
        normalizedRequestPath,
    )

    if (!redirectResult || !redirectResult.found) {
        return NextResponse.next()
    }

    const internalTargetPath =
        getInternalPathFromRedirectTarget(redirectResult.to)

    /*
     * Chặn self-loop:
     *
     * /old-url -> /old-url
     */
    if (
        internalTargetPath !== null &&
        internalTargetPath === normalizedRequestPath
    ) {
        return NextResponse.next()
    }

    const targetUrl = buildRedirectTargetUrl(
        redirectResult.to,
        request.nextUrl,
    )

    if (!targetUrl) {
        return NextResponse.next()
    }

    /*
     * Chặn trường hợp URL đích giống hoàn toàn URL hiện tại,
     * bao gồm pathname và query string.
     */
    if (targetUrl.href === request.nextUrl.href) {
        return NextResponse.next()
    }

    return NextResponse.redirect(
        targetUrl,
        redirectResult.statusCode,
    )
}

export const config = {
    matcher: [
        /*
         * Không chạy Proxy với:
         *
         * - Payload/Next API
         * - Payload Admin
         * - Next.js static assets
         * - Next.js image optimizer
         * - Next.js data requests
         * - Metadata files
         * - Các file có extension
         */
        '/((?!api|admin|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
    ],
}
