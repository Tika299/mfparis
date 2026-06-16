export const REDIRECTS_CACHE_TAG = 'redirects-manager' as const

export const REDIRECT_LOOKUP_HEADER =
    'x-mfparis-redirect-secret' as const

export const REDIRECT_LOOKUP_ENDPOINT =
    '/api/internal/redirects/resolve' as const

export const MAX_REDIRECT_HOPS = 8 as const

export type RedirectStatusCode = 301 | 302

export type RedirectLookupResponse =
    | Readonly<{
        found: true
        statusCode: RedirectStatusCode
        to: string
    }>
    | Readonly<{
        found: false
    }>

const DEFAULT_INTERNAL_HOSTNAMES = [
    'maraisdefrance.vn',
    'www.maraisdefrance.vn',
] as const satisfies readonly string[]

function createInternalHostnameSet(): ReadonlySet<string> {
    const hostnames = new Set<string>(DEFAULT_INTERNAL_HOSTNAMES)

    const configuredOrigins = [
        process.env.NEXT_PUBLIC_SERVER_URL,
        process.env.PAYLOAD_PUBLIC_SERVER_URL,
    ]

    for (const configuredOrigin of configuredOrigins) {
        if (!configuredOrigin) {
            continue
        }

        try {
            const url = new URL(configuredOrigin)
            hostnames.add(url.hostname.toLowerCase())
        } catch {
            continue
        }
    }

    if (process.env.NODE_ENV !== 'production') {
        hostnames.add('localhost')
        hostnames.add('127.0.0.1')
    }

    return hostnames
}

const INTERNAL_HOSTNAMES = createInternalHostnameSet()

function isHttpProtocol(protocol: string): boolean {
    return protocol === 'http:' || protocol === 'https:'
}

function parseAbsoluteUrl(value: string): URL | null {
    const normalizedValue = value.startsWith('//')
        ? `https:${value}`
        : value

    try {
        const url = new URL(normalizedValue)

        if (!isHttpProtocol(url.protocol)) {
            return null
        }

        return url
    } catch {
        return null
    }
}

function isAbsoluteUrl(value: string): boolean {
    return (
        /^https?:\/\//iu.test(value) ||
        value.startsWith('//')
    )
}

function isInternalHostname(hostname: string): boolean {
    return INTERNAL_HOSTNAMES.has(hostname.toLowerCase())
}

export function normalizeRedirectPathname(
    pathname: string,
): string {
    const decodedPathname = pathname.trim()

    const pathnameWithLeadingSlash =
        decodedPathname.startsWith('/')
            ? decodedPathname
            : `/${decodedPathname}`

    const lowercasePathname =
        pathnameWithLeadingSlash.toLowerCase()

    const collapsedPathname = lowercasePathname.replace(
        /\/{2,}/gu,
        '/',
    )

    if (collapsedPathname === '/') {
        return '/'
    }

    const withoutTrailingSlash = collapsedPathname.replace(
        /\/+$/gu,
        '',
    )

    return withoutTrailingSlash || '/'
}

function splitRelativeLocation(value: string): Readonly<{
    pathname: string
    search: string
}> {
    const withoutHash = value.split('#', 1)[0] ?? ''
    const searchIndex = withoutHash.indexOf('?')

    if (searchIndex === -1) {
        return {
            pathname: withoutHash,
            search: '',
        }
    }

    return {
        pathname: withoutHash.slice(0, searchIndex),
        search: withoutHash.slice(searchIndex).toLowerCase(),
    }
}

/**
 * Chuẩn hóa đường dẫn nguồn:
 *
 * - Luôn trả về pathname nội bộ.
 * - Loại bỏ domain maraisdefrance.vn nếu được nhập đầy đủ.
 * - Loại bỏ query string và hash.
 * - Chuyển về chữ thường.
 * - Loại bỏ trailing slash.
 * - Từ chối domain bên ngoài.
 */
export function normalizeRedirectSource(
    value: string,
): string | null {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return null
    }

    if (isAbsoluteUrl(trimmedValue)) {
        const url = parseAbsoluteUrl(trimmedValue)

        if (!url || !isInternalHostname(url.hostname)) {
            return null
        }

        return normalizeRedirectPathname(url.pathname)
    }

    const { pathname } = splitRelativeLocation(trimmedValue)

    if (!pathname) {
        return null
    }

    return normalizeRedirectPathname(pathname)
}

/**
 * Chuẩn hóa đích chuyển hướng:
 *
 * - URL nội bộ được đổi thành đường dẫn tương đối.
 * - URL ngoài hệ thống vẫn được giữ dưới dạng tuyệt đối.
 * - Loại bỏ hash.
 * - Chuyển về chữ thường.
 * - Loại bỏ trailing slash.
 */
export function normalizeRedirectDestination(
    value: string,
): string | null {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return null
    }

    if (isAbsoluteUrl(trimmedValue)) {
        const url = parseAbsoluteUrl(trimmedValue)

        if (!url) {
            return null
        }

        const normalizedPathname = normalizeRedirectPathname(
            url.pathname,
        )

        const normalizedSearch = url.search.toLowerCase()

        if (isInternalHostname(url.hostname)) {
            return `${normalizedPathname}${normalizedSearch}`
        }

        const normalizedOrigin =
            `${url.protocol}//${url.host}`.toLowerCase()

        return `${normalizedOrigin}${normalizedPathname}${normalizedSearch}`
    }

    const { pathname, search } =
        splitRelativeLocation(trimmedValue)

    if (!pathname) {
        return null
    }

    return `${normalizeRedirectPathname(pathname)}${search}`
}

export function getInternalPathFromRedirectTarget(
    destination: string,
): string | null {
    const normalizedDestination =
        normalizeRedirectDestination(destination)

    if (!normalizedDestination) {
        return null
    }

    if (normalizedDestination.startsWith('/')) {
        const { pathname } = splitRelativeLocation(
            normalizedDestination,
        )

        return normalizeRedirectPathname(pathname)
    }

    const url = parseAbsoluteUrl(normalizedDestination)

    if (!url || !isInternalHostname(url.hostname)) {
        return null
    }

    return normalizeRedirectPathname(url.pathname)
}

export function redirectDestinationHasQuery(
    destination: string,
): boolean {
    return destination.includes('?')
}

export function areSameRedirectLocation(
    from: string,
    to: string,
): boolean {
    const normalizedFrom = normalizeRedirectSource(from)
    const normalizedTo =
        getInternalPathFromRedirectTarget(to)

    return (
        normalizedFrom !== null &&
        normalizedTo !== null &&
        normalizedFrom === normalizedTo
    )
}

export function buildRedirectTargetUrl(
    destination: string,
    requestUrl: URL,
): URL | null {
    const normalizedDestination =
        normalizeRedirectDestination(destination)

    if (!normalizedDestination) {
        return null
    }

    try {
        const targetUrl = new URL(
            normalizedDestination,
            requestUrl.origin,
        )

        if (!isHttpProtocol(targetUrl.protocol)) {
            return null
        }

        /*
         * Giữ lại query hiện tại, ví dụ utm_source hoặc fbclid,
         * nếu bản ghi Redirect không khai báo query đích riêng.
         */
        if (!redirectDestinationHasQuery(normalizedDestination)) {
            targetUrl.search = requestUrl.search
        }

        targetUrl.hash = ''

        return targetUrl
    } catch {
        return null
    }
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export function isRedirectLookupResponse(
    value: unknown,
): value is RedirectLookupResponse {
    if (!isRecord(value)) {
        return false
    }

    if (value.found === false) {
        return true
    }

    if (value.found !== true) {
        return false
    }

    if (typeof value.to !== 'string') {
        return false
    }

    return (
        value.statusCode === 301 ||
        value.statusCode === 302
    )
}