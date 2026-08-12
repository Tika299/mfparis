import { parseDocument } from 'htmlparser2'
import serialize from 'dom-serializer'
import { Element, Text, type Node } from 'domhandler'

import { normalizeContentHtml } from '@/lib/html/contentHtml'

import { isSameUrl, normalizeVietnameseText } from './normalizeVietnamese'

import type {
    ApplyInternalLinksInput,
    ApplyInternalLinksResult,
    InternalLinkInsertion,
    InternalLinkRule,
    InternalLinkSkippedItem,
} from './types'

const BLOCKED_TAGS = new Set([
    'a',
    'button',
    'script',
    'style',
    'textarea',
    'pre',
    'code',
    'kbd',
    'samp',
    'select',
    'option',
    'input',
    'label',
    'iframe',
    'noscript',
    'nav',
    'header',
    'footer',
    'form',
    'strong',
    'b',
    'em',
    'i',
    'figcaption',
    'caption',
    'summary',
    'details',
    'svg',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
])

const BLOCKED_CLASS_TOKENS = new Set([
    'breadcrumb',
    'breadcrumbs',
    'toc',
    'table-of-contents',
    'product-title',
    'product-name',
    'product-card',
    'post-title',
    'post-card',
    'entry-title',
    'page-title',
    'card-title',
    'menu',
    'nav',
    'button',
    'btn',
    'wp-block-button',
])

const GENERIC_ANCHOR_PHRASES = new Set([
    'san pham',
    'thuong hieu',
    'danh muc',
    'bai viet',
    'nuoc hoa',
    'my pham',
    'cham soc da',
    'hang phap',
    'chinh hang',
    'cao cap',
    'tot nhat',
    'nen mua',
    'tai day',
    'xem them',
    'chi tiet',
    'click vao day',
    'san pham nay',
    'dong nay',
    'loai nay',
    'chai nay',
    'mui nay',
    'tham khao',
    'doc tiep',
])

const GENERIC_ANCHOR_WORDS = new Set([
    'san',
    'pham',
    'thuong',
    'hieu',
    'danh',
    'muc',
    'bai',
    'viet',
    'nuoc',
    'hoa',
    'my',
    'chinh',
    'hang',
    'cao',
    'cap',
    'tot',
    'nhat',
    'mua',
    'gia',
    'review',
    'xem',
    'them',
    'tai',
    'day',
    'chi',
    'tiet',
])

const PRODUCT_CONTEXT_HINTS = new Set([
    'edp',
    'edt',
    'edc',
    'eau',
    'parfum',
    'perfume',
    'toilette',
    'cologne',
    'extrait',
    'intense',
    'absolu',
    'elixir',
    'le',
    'la',
    'pour',
    'homme',
    'femme',
    'black',
    'blue',
    'bleu',
    'sauvage',
    'opium',
    'effaclar',
    'sebiaclear',
    'gel',
    'cream',
    'serum',
    'spf',
    'ml',
    '100ml',
    '50ml',
])

const BRAND_INTENT_BEFORE_ENDINGS = [
    'thuong hieu',
    'brand',
    'nha mot',
    'cua',
    'tu',
    'den tu',
    'dna cua',
    'phong cach cua',
    'cac dong',
    'nhom',
]

const priorityScore: Record<string, number> = {
    primary_keyword: 110,
    keyword_main: 110,
    product: 100,
    brand: 85,
    category: 75,
    post: 65,
}

const MAX_SKIPPED_ITEMS = 100

type CompiledKeyword = {
    rule: InternalLinkRule
    keyword: string
    normalizedKeyword: string
    targetUrl: string
    score: number
    matchType: string
}

type MatchResult = {
    candidate: CompiledKeyword
    start: number
    end: number
}

type NormalizedIndexMap = {
    normalized: string
    rawIndexByNormalizedIndex: number[]
}

function createResult(
    html: string,
    insertions: InternalLinkInsertion[] = [],
    skipped: InternalLinkSkippedItem[] = [],
): ApplyInternalLinksResult {
    return {
        html,
        insertions,
        skipped,
        stats: {
            totalInserted: insertions.length,
            totalSkipped: skipped.length,
            rulesMatched: new Set(insertions.map((item) => item.ruleId).filter(Boolean)).size,
            uniqueTargetUrls: new Set(insertions.map((item) => item.targetUrl).filter(Boolean)).size,
        },
    }
}

function getMaxLinks(input: ApplyInternalLinksInput): number {
    if (typeof input.maxLinksOverride === 'number') {
        return input.maxLinksOverride
    }

    if (input.scope === 'posts') {
        return input.settings?.maxLinksPerPost ?? 8
    }

    if (input.scope === 'products') {
        return input.settings?.maxLinksPerProduct ?? 5
    }

    return input.settings?.maxLinksPerLanding ?? 8
}

function pushSkipped(
    skipped: InternalLinkSkippedItem[],
    item: InternalLinkSkippedItem,
): void {
    if (skipped.length >= MAX_SKIPPED_ITEMS) return
    skipped.push(item)
}

function isElement(node: Node): node is Element {
    return node.type === 'tag'
}

function isText(node: Node): node is Text {
    return node.type === 'text'
}

function getClassTokens(element: Element): string[] {
    const className = element.attribs?.class

    if (typeof className !== 'string') return []

    return className
        .split(/\s+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
}

function hasBlockedClass(element: Element): boolean {
    for (const token of getClassTokens(element)) {
        if (BLOCKED_CLASS_TOKENS.has(token)) return true
        if (token.includes('breadcrumb')) return true
        if (token.includes('product-card')) return true
        if (token.includes('post-card')) return true
        if (token.includes('related')) return true
    }

    return false
}

function getBlockedReason(node: Node): InternalLinkSkippedItem['reason'] | null {
    let current = node.parent

    while (current) {
        if (isElement(current)) {
            const tagName = current.name.toLowerCase()

            if (tagName === 'a') return 'existing_link'
            if (/^h[1-6]$/.test(tagName)) return 'heading'
            if (BLOCKED_TAGS.has(tagName) || hasBlockedClass(current)) return 'blocked_tag'
        }

        current = current.parent
    }

    return null
}

function getParagraphKey(node: Node): Node | null {
    let current = node.parent

    while (current) {
        if (isElement(current) && current.name.toLowerCase() === 'p') {
            return current
        }

        current = current.parent
    }

    return null
}

function ruleAppliesToScope(rule: InternalLinkRule, scope: ApplyInternalLinksInput['scope']) {
    const ruleScope = rule.scope

    if (!ruleScope) return true

    if (Array.isArray(ruleScope)) {
        return ruleScope.includes(scope) || ruleScope.includes('all' as never)
    }

    return ruleScope === scope || ruleScope === 'all'
}

function compileRules(
    input: ApplyInternalLinksInput,
    skipped: InternalLinkSkippedItem[],
): CompiledKeyword[] {
    const excluded = new Set((input.excludeKeywords || []).map(normalizeVietnameseText))

    const compiled: CompiledKeyword[] = []

    for (const rule of input.rules || []) {
        if (!rule.enabled) continue
        if (!rule.targetUrl) continue

        if (isSameUrl(rule.targetUrl, input.currentUrl)) {
            for (const item of rule.keywords || []) {
                if (!item.keyword) continue

                pushSkipped(skipped, {
                    keyword: item.keyword,
                    targetUrl: rule.targetUrl,
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    reason: 'self_link',
                })
            }

            continue
        }

        if (!ruleAppliesToScope(rule, input.scope)) continue

        for (const item of rule.keywords || []) {
            const keyword = item.keyword?.trim()
            const targetUrl = rule.targetUrl?.trim()

            if (!keyword || !targetUrl) continue

            const normalizedKeyword = normalizeVietnameseText(keyword)

            if (!normalizedKeyword) continue

            if (excluded.has(normalizedKeyword)) {
                pushSkipped(skipped, {
                    keyword,
                    targetUrl,
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    reason: 'excluded_keyword',
                } as InternalLinkSkippedItem)

                continue
            }

            compiled.push({
                rule,
                keyword,
                normalizedKeyword,
                targetUrl,
                matchType: String(item.matchType || 'exact'),
                score: (priorityScore[rule.priority || 'post'] || 0) + Number(item.weight || 1),
            })
        }
    }

    return compiled.sort((a, b) => {
        const scoreDiff = b.score - a.score
        if (scoreDiff !== 0) return scoreDiff

        return b.normalizedKeyword.length - a.normalizedKeyword.length
    })
}

function normalizeCharForMatch(char: string): string {
    return char
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
}

function buildNormalizedIndexMap(rawText: string): NormalizedIndexMap {
    let normalized = ''
    const rawIndexByNormalizedIndex: number[] = []
    let rawIndex = 0
    let previousWasSpace = false

    for (const char of rawText) {
        const charStart = rawIndex
        rawIndex += char.length

        const normalizedChar = normalizeCharForMatch(char)

        for (const outputChar of normalizedChar) {
            const nextChar = /\s/.test(outputChar) ? ' ' : outputChar

            if (nextChar === ' ') {
                if (previousWasSpace) continue
                previousWasSpace = true
            } else {
                previousWasSpace = false
            }

            normalized += nextChar
            rawIndexByNormalizedIndex.push(charStart)
        }
    }

    return {
        normalized,
        rawIndexByNormalizedIndex,
    }
}

function isWordChar(char: string | undefined): boolean {
    return Boolean(char && /[a-z0-9]/i.test(char))
}

function hasWordBoundary(normalizedText: string, start: number, end: number): boolean {
    return !isWordChar(normalizedText[start - 1]) && !isWordChar(normalizedText[end])
}

function normalizedIndexToRawIndex(
    map: NormalizedIndexMap,
    normalizedIndex: number,
    rawTextLength: number,
): number {
    if (normalizedIndex <= 0) return 0

    const mapped = map.rawIndexByNormalizedIndex[normalizedIndex]

    if (typeof mapped === 'number') {
        return mapped
    }

    return rawTextLength
}

function normalizeTextWithSpaces(value: string): string {
    return Array.from(value)
        .map((char) => normalizeCharForMatch(char))
        .join('')
        .replace(/[^a-z0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function findBestMatch(
    text: string,
    candidates: CompiledKeyword[],
    isAllowed?: (match: MatchResult) => boolean,
): MatchResult | null {
    const map = buildNormalizedIndexMap(text)
    const normalizedText = map.normalized

    let best: MatchResult | null = null
    let bestScore = -1

    for (const candidate of candidates) {
        let searchFrom = 0

        while (searchFrom < normalizedText.length) {
            const index = normalizedText.indexOf(candidate.normalizedKeyword, searchFrom)

            if (index < 0) break

            const end = index + candidate.normalizedKeyword.length
            const needsBoundary = candidate.matchType !== 'contains'

            if (needsBoundary && !hasWordBoundary(normalizedText, index, end)) {
                searchFrom = index + 1
                continue
            }

            const rawStart = normalizedIndexToRawIndex(map, index, text.length)
            const rawEnd = normalizedIndexToRawIndex(map, end, text.length)

            if (rawStart >= 0 && rawEnd > rawStart) {
                const match: MatchResult = {
                    candidate,
                    start: rawStart,
                    end: rawEnd,
                }

                if (isAllowed && !isAllowed(match)) {
                    searchFrom = index + 1
                    continue
                }

                const score = candidate.score * 1000 + candidate.normalizedKeyword.length

                if (score > bestScore) {
                    best = match
                    bestScore = score
                }
            }

            searchFrom = index + 1
        }
    }

    return best
}

function isGenericAnchorText(anchorText: string): boolean {
    const normalized = normalizeTextWithSpaces(anchorText)
    const words = normalized.split(' ').filter(Boolean)

    if (!normalized || normalized.length < 3) return true
    if (GENERIC_ANCHOR_PHRASES.has(normalized)) return true
    if (words.length <= 2 && words.every((word) => GENERIC_ANCHOR_WORDS.has(word))) return true

    return false
}

function hasBrandIntent(before: string): boolean {
    const normalizedBefore = normalizeTextWithSpaces(before)

    return BRAND_INTENT_BEFORE_ENDINGS.some((ending) => normalizedBefore.endsWith(ending))
}

function hasProductNameContinuation(rawAfter: string): boolean {
    const tokens = rawAfter
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter(Boolean)

    if (tokens.length < 2) return false

    const titleLikeCount = tokens.filter((token) => /^[A-Z0-9À-Ỵ]/.test(token)).length

    return titleLikeCount >= 2
}

function isLikelyProductNameFragment(
    rawText: string,
    match: MatchResult,
): boolean {
    const priority = match.candidate.rule.priority

    if (priority !== 'brand' && priority !== 'category') return false

    const before = rawText.slice(Math.max(0, match.start - 70), match.start)
    const after = rawText.slice(match.end, Math.min(rawText.length, match.end + 100))

    if (priority === 'brand' && hasBrandIntent(before)) return false

    const afterWords = normalizeTextWithSpaces(after).split(' ').filter(Boolean).slice(0, 8)

    if (afterWords.some((word) => PRODUCT_CONTEXT_HINTS.has(word))) return true
    if (priority === 'brand' && hasProductNameContinuation(after)) return true

    return false
}

function getAnchorSkipReason(
    rawText: string,
    match: MatchResult,
): InternalLinkSkippedItem['reason'] | null {
    const anchorText = rawText.slice(match.start, match.end)

    if (isGenericAnchorText(anchorText)) return 'generic_anchor'
    if (isLikelyProductNameFragment(rawText, match)) return 'product_name_fragment'

    return null
}

function replaceTextNode(
    node: Text,
    start: number,
    end: number,
    targetUrl: string,
): string {
    const text = node.data
    const before = text.slice(0, start)
    const anchorText = text.slice(start, end)
    const after = text.slice(end)

    const parent = node.parent

    if (!parent || !('children' in parent) || !Array.isArray(parent.children)) {
        return anchorText
    }

    const nextNodes: Node[] = []

    if (before) {
        nextNodes.push(new Text(before))
    }

    const link = new Element('a', {
        class: 'internal-link',
        href: targetUrl,
    })

    link.children = [new Text(anchorText)]
    link.children[0].parent = link

    nextNodes.push(link)

    if (after) {
        nextNodes.push(new Text(after))
    }

    const index = parent.children.indexOf(node as never)

    if (index < 0) {
        return anchorText
    }

    ; (parent.children as any).splice(index, 1, ...(nextNodes as any))

    for (const child of nextNodes) {
        child.parent = parent
    }

    return anchorText
}

function walkTextNodes(node: Node, callback: (node: Text) => void): void {
    if (isText(node)) {
        callback(node)
        return
    }

    if ('children' in node && Array.isArray(node.children)) {
        for (const child of [...node.children]) {
            walkTextNodes(child as Node, callback)
        }
    }
}

export function applyInternalLinksToHtml(
    input: ApplyInternalLinksInput,
): ApplyInternalLinksResult {
    const skipped: InternalLinkSkippedItem[] = []
    const html = normalizeContentHtml(input.html || '')

    if (!html.trim()) {
        return createResult(html, [], [{ reason: 'empty_html' }])
    }

    if (input.disabled || input.settings?.enabled === false) {
        return createResult(html, [], [{ reason: 'disabled' }])
    }

    const maxLinks = getMaxLinks(input)

    if (maxLinks <= 0) {
        return createResult(html, [], [{ reason: 'max_links_reached' }])
    }

    const candidates = compileRules(input, skipped)

    if (!candidates.length) {
        return createResult(html, [], skipped.length ? skipped : [{ reason: 'no_rules' }])
    }

    const document = parseDocument(html, {
        decodeEntities: false,
    })

    const insertions: InternalLinkInsertion[] = []
    const targetCount = new Map<string, number>()
    const anchorCount = new Map<string, number>()
    const ruleCount = new Map<string | number, number>()
    const paragraphCount = new WeakMap<Node, number>()

    walkTextNodes(document as unknown as Node, (textNode) => {
        if (insertions.length >= maxLinks) {
            const possibleMatch = findBestMatch(textNode.data, candidates)

            if (possibleMatch) {
                pushSkipped(skipped, {
                    keyword: possibleMatch.candidate.keyword,
                    anchorText: possibleMatch.candidate.keyword,
                    targetUrl: possibleMatch.candidate.targetUrl,
                    ruleId: possibleMatch.candidate.rule.id,
                    ruleTitle: possibleMatch.candidate.rule.title,
                    reason: 'max_links_reached',
                    textPreview: textNode.data.slice(0, 160),
                })
            }

            return
        }

        if (!textNode.data.trim()) return

        const blockedReason = getBlockedReason(textNode)

        if (blockedReason) {
            const possibleMatch = findBestMatch(textNode.data, candidates)

            if (possibleMatch) {
                pushSkipped(skipped, {
                    keyword: possibleMatch.candidate.keyword,
                    anchorText: possibleMatch.candidate.keyword,
                    targetUrl: possibleMatch.candidate.targetUrl,
                    ruleId: possibleMatch.candidate.rule.id,
                    ruleTitle: possibleMatch.candidate.rule.title,
                    reason: blockedReason,
                    textPreview: textNode.data.slice(0, 160),
                })
            }

            return
        }

        const paragraph = getParagraphKey(textNode)

        if (paragraph) {
            const count = paragraphCount.get(paragraph) || 0
            const maxPerParagraph = input.settings?.maxLinksPerParagraph ?? 1

            if (count >= maxPerParagraph) {
                const possibleMatch = findBestMatch(textNode.data, candidates)

                if (possibleMatch) {
                    pushSkipped(skipped, {
                        keyword: possibleMatch.candidate.keyword,
                        anchorText: possibleMatch.candidate.keyword,
                        targetUrl: possibleMatch.candidate.targetUrl,
                        ruleId: possibleMatch.candidate.rule.id,
                        ruleTitle: possibleMatch.candidate.rule.title,
                        reason: 'duplicate_paragraph',
                        textPreview: textNode.data.slice(0, 160),
                    })
                }

                return
            }
        }

        const filteredCandidates = candidates.filter((candidate) => {
            const targetUsed = targetCount.get(candidate.targetUrl) || 0
            const maxTarget = input.settings?.maxSameTargetUrl ?? 2

            if (targetUsed >= maxTarget) {
                pushSkipped(skipped, {
                    keyword: candidate.keyword,
                    anchorText: candidate.keyword,
                    targetUrl: candidate.targetUrl,
                    ruleId: candidate.rule.id,
                    ruleTitle: candidate.rule.title,
                    reason: 'max_target_reached',
                    textPreview: textNode.data.slice(0, 160),
                })

                return false
            }

            const normalizedAnchor = normalizeVietnameseText(candidate.keyword)
            const anchorUsed = anchorCount.get(normalizedAnchor) || 0
            const maxAnchor = input.settings?.maxSameAnchor ?? 1

            if (anchorUsed >= maxAnchor) {
                pushSkipped(skipped, {
                    keyword: candidate.keyword,
                    anchorText: candidate.keyword,
                    targetUrl: candidate.targetUrl,
                    ruleId: candidate.rule.id,
                    ruleTitle: candidate.rule.title,
                    reason: 'max_anchor_reached',
                    textPreview: textNode.data.slice(0, 160),
                })

                return false
            }

            const ruleId = candidate.rule.id || candidate.targetUrl
            const currentRuleCount = ruleCount.get(ruleId) || 0
            const maxRuleCount = candidate.rule.maxInsertionsPerPage ?? maxLinks

            if (currentRuleCount >= maxRuleCount) {
                pushSkipped(skipped, {
                    keyword: candidate.keyword,
                    anchorText: candidate.keyword,
                    targetUrl: candidate.targetUrl,
                    ruleId: candidate.rule.id,
                    ruleTitle: candidate.rule.title,
                    reason: 'max_links_reached',
                    textPreview: textNode.data.slice(0, 160),
                })

                return false
            }

            return true
        })

        if (!filteredCandidates.length) return

        const match = findBestMatch(textNode.data, filteredCandidates, (possibleMatch) => {
            const reason = getAnchorSkipReason(textNode.data, possibleMatch)

            if (reason) {
                pushSkipped(skipped, {
                    keyword: possibleMatch.candidate.keyword,
                    anchorText: textNode.data.slice(possibleMatch.start, possibleMatch.end),
                    targetUrl: possibleMatch.candidate.targetUrl,
                    ruleId: possibleMatch.candidate.rule.id,
                    ruleTitle: possibleMatch.candidate.rule.title,
                    reason,
                    textPreview: textNode.data.slice(0, 160),
                })

                return false
            }

            return true
        })

        if (!match) return

        const anchorText = replaceTextNode(
            textNode,
            match.start,
            match.end,
            match.candidate.targetUrl,
        )

        insertions.push({
            ruleId: match.candidate.rule.id,
            ruleTitle: match.candidate.rule.title,
            keyword: match.candidate.keyword,
            anchorText,
            targetUrl: match.candidate.targetUrl,
            paragraphIndex: insertions.length + 1,
        })

        targetCount.set(
            match.candidate.targetUrl,
            (targetCount.get(match.candidate.targetUrl) || 0) + 1,
        )

        const normalizedAnchor = normalizeVietnameseText(match.candidate.keyword)

        anchorCount.set(normalizedAnchor, (anchorCount.get(normalizedAnchor) || 0) + 1)

        const ruleId = match.candidate.rule.id || match.candidate.targetUrl
        ruleCount.set(ruleId, (ruleCount.get(ruleId) || 0) + 1)

        if (paragraph) {
            paragraphCount.set(paragraph, (paragraphCount.get(paragraph) || 0) + 1)
        }
    })

    const outputHtml = serialize(document, {
        encodeEntities: false,
    })

    return createResult(outputHtml, insertions, skipped)
}
