export type InternalLinkScope =
    | 'posts'
    | 'products'
    | 'categories'
    | 'brands'
    | 'post-categories'

export type InternalLinkRulePriority =
    | 'primary_keyword'
    | 'category'
    | 'brand'
    | 'product'
    | 'post'

export type InternalLinkKeyword = {
    keyword: string
    matchType?: 'contains' | 'phrase'
    weight?: number | null
}

export type InternalLinkRule = {
    id: string | number
    title: string
    enabled?: boolean | null
    priority?: InternalLinkRulePriority | null
    keywords?: InternalLinkKeyword[] | null
    targetUrl?: string | null
    scope?: InternalLinkScope[] | null
    maxInsertionsPerPage?: number | null
}

export type InternalLinkSettings = {
    enabled?: boolean | null
    previewOnly?: boolean | null
    maxLinksPerPost?: number | null
    maxLinksPerProduct?: number | null
    maxLinksPerLanding?: number | null
    maxLinksPerParagraph?: number | null
    maxSameTargetUrl?: number | null
    maxSameAnchor?: number | null
}

export type ApplyInternalLinksInput = {
    html: unknown
    currentUrl: string
    scope: InternalLinkScope
    rules: InternalLinkRule[]
    settings?: InternalLinkSettings | null
    disabled?: boolean
    maxLinksOverride?: number | null
    excludeKeywords?: string[]
}

export type InternalLinkInsertion = {
    ruleId: string | number
    keyword: string
    anchorText: string
    targetUrl: string
}

export type ApplyInternalLinksResult = {
    html: string
    insertions: InternalLinkInsertion[]
}