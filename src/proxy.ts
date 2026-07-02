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

function isRedirectableMethod(method: string): boolean {
    return method === 'GET' || method === 'HEAD'
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