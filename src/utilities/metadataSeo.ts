import type { Metadata } from 'next'

type SeoValue = string | null | undefined

type SeoRecord = {
  canonicalOverride?: SeoValue
  metaDescription?: SeoValue
  metaTitle?: SeoValue
  ogDescription?: SeoValue
  ogImage?: unknown
  ogTitle?: SeoValue
  robotsFollow?: SeoValue
  robotsIndex?: SeoValue
  twitterImage?: unknown
}

export function getSeoGroup(doc: unknown): SeoRecord {
  if (!doc || typeof doc !== 'object') {
    return {}
  }

  const seo = (doc as { seo?: unknown }).seo

  return seo && typeof seo === 'object' ? (seo as SeoRecord) : {}
}

export function getSeoText(
  doc: unknown,
  key: keyof Pick<
    SeoRecord,
    'canonicalOverride' | 'metaDescription' | 'metaTitle' | 'ogDescription' | 'ogTitle'
  >,
): string | undefined {
  const value = getSeoGroup(doc)[key]

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.replace(/\s+/g, ' ').trim()

  return trimmedValue || undefined
}

export function getSeoMedia(
  doc: unknown,
  key: keyof Pick<SeoRecord, 'ogImage' | 'twitterImage'>,
): unknown {
  return getSeoGroup(doc)[key]
}

export function getSeoCanonical(
  doc: unknown,
  fallbackPath: string,
): string {
  return getSeoText(doc, 'canonicalOverride') || fallbackPath
}

export function getSeoIndexValue(
  doc: unknown,
  fallback: boolean,
): boolean {
  const value = getSeoGroup(doc).robotsIndex

  if (value === 'noindex') {
    return false
  }

  if (value === 'index') {
    return fallback
  }

  return fallback
}

export function getSeoFollowValue(
  doc: unknown,
  fallback = true,
): boolean {
  const value = getSeoGroup(doc).robotsFollow

  if (value === 'nofollow') {
    return false
  }

  if (value === 'follow') {
    return true
  }

  return fallback
}

export function getMetadataTitle(title: string): Metadata['title'] {
  const normalizedTitle = title.trim()

  if (
    /\b(?:mf\s*paris|marais\s+de\s+france)\b/iu.test(normalizedTitle)
  ) {
    return {
      absolute: normalizedTitle,
    }
  }

  return normalizedTitle
}
