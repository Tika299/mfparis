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

export type InternalLinkSkipReason =
    | 'self_link'
    | 'existing_link'
    | 'heading'
    | 'blocked_tag'
    | 'max_links_reached'
    | 'max_target_reached'
    | 'max_anchor_reached'
    | 'duplicate_paragraph'
    | 'disabled'
    | 'preview_only'
    | 'no_rules'
    | 'empty_html'
    | 'excluded_keyword'

export type InternalLinkSkippedItem = {
    keyword?: string
    anchorText?: string
    targetUrl?: string
    ruleId?: string | number
    ruleTitle?: string
    reason: InternalLinkSkipReason
    textPreview?: string
}

export type InternalLinkInsertion = {
    keyword: string
    anchorText: string
    targetUrl: string
    ruleId?: string | number
    ruleTitle?: string
    paragraphIndex?: number
}

export type ApplyInternalLinksResult = {
    html: string
    insertions: InternalLinkInsertion[]
    skipped: InternalLinkSkippedItem[]
    stats: {
        totalInserted: number
        totalSkipped: number
        rulesMatched: number
        uniqueTargetUrls: number
    }
}