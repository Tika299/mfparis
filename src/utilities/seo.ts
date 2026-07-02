export const SITE_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn' as const

export const INDEXABLE_FACET_KEYS = [
    'brand',
    'gender',
    'scent',
    'volume',
] as const satisfies readonly string[]

export type IndexableFacetKey = (typeof INDEXABLE_FACET_KEYS)[number]

function compareCanonicalParts(left: string, right: string): number {
    if (left < right) {
        return -1
    }

    if (left > right) {
        return 1
    }

    return 0
}

function normalizePathname(pathname: string): string {
    const pathnameWithoutQueryOrHash =
        pathname.trim().split(/[?#]/u, 1)[0] ?? ''

    const pathnameWithLeadingSlash = pathnameWithoutQueryOrHash.startsWith('/')
        ? pathnameWithoutQueryOrHash
        : `/${pathnameWithoutQueryOrHash}`

    const lowercasePathname = pathnameWithLeadingSlash.toLowerCase()

    const pathnameWithoutDuplicateSlashes = lowercasePathname.replace(
        /\/{2,}/gu,
        '/',
    )

    if (pathnameWithoutDuplicateSlashes === '/') {
        return '/'
    }

    const pathnameWithoutTrailingSlash =
        pathnameWithoutDuplicateSlashes.replace(/\/+$/gu, '')

    return pathnameWithoutTrailingSlash || '/'
}

function getCanonicalFacetValues(
    searchParams: URLSearchParams,
    key: IndexableFacetKey,
): string[] {
    const normalizedValues = searchParams
        .getAll(key)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    return [...new Set(normalizedValues)].sort(compareCanonicalParts)
}

export function generateCanonicalUrl(
    pathname: string,
    searchParams: URLSearchParams,
): string {
    const canonicalUrl = new URL(normalizePathname(pathname), SITE_ORIGIN)
    const canonicalSearchParams = new URLSearchParams()

    for (const key of INDEXABLE_FACET_KEYS) {
        const values = getCanonicalFacetValues(searchParams, key)

        for (const value of values) {
            canonicalSearchParams.append(key, value)
        }
    }

    canonicalUrl.search = canonicalSearchParams.toString()
    canonicalUrl.hash = ''

    return canonicalUrl.toString()
}