import { parseDocument } from 'htmlparser2'
import serialize from 'dom-serializer'
import { Element, Text, Node } from 'domhandler'
import { normalizeContentHtml } from '@/lib/html/contentHtml'
import {
    isSameUrl,
    normalizeVietnameseText,
} from './normalizeVietnamese'
import type {
    ApplyInternalLinksInput,
    ApplyInternalLinksResult,
    InternalLinkInsertion,
    InternalLinkRule,
} from './types'

const BLOCKED_TAGS = new Set([
    'a',
    'button',
    'script',
    'style',
    'textarea',
    'pre',
    'code',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
])

const priorityScore: Record<string, number> = {
    primary_keyword: 100,
    category: 80,
    brand: 70,
    product: 60,
    post: 50,
}

type CompiledKeyword = {
    rule: InternalLinkRule
    keyword: string
    normalizedKeyword: string
    targetUrl: string
    score: number
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

function isElement(node: Node): node is Element {
    return node.type === 'tag'
}

function isText(node: Node): node is Text {
    return node.type === 'text'
}

function isInsideBlockedTag(node: Node): boolean {
    let current = node.parent

    while (current) {
        if (isElement(current) && BLOCKED_TAGS.has(current.name.toLowerCase())) {
            return true
        }

        current = current.parent
    }

    return false
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

function compileRules(input: ApplyInternalLinksInput): CompiledKeyword[] {
    const excluded = new Set(
        (input.excludeKeywords || []).map(normalizeVietnameseText),
    )

    return input.rules
        .filter((rule) => {
            if (!rule.enabled) return false
            if (!rule.targetUrl) return false
            if (isSameUrl(rule.targetUrl, input.currentUrl)) return false
            if (Array.isArray(rule.scope) && !rule.scope.includes(input.scope)) return false
            return true
        })
        .flatMap((rule) => {
            return (rule.keywords || [])
                .map((item) => {
                    const keyword = item.keyword?.trim()
                    const targetUrl = rule.targetUrl?.trim()

                    if (!keyword || !targetUrl) return null

                    const normalizedKeyword = normalizeVietnameseText(keyword)

                    if (!normalizedKeyword || excluded.has(normalizedKeyword)) {
                        return null
                    }

                    return {
                        rule,
                        keyword,
                        normalizedKeyword,
                        targetUrl,
                        score:
                            (priorityScore[rule.priority || 'post'] || 0) +
                            Number(item.weight || 1),
                    }
                })
                .filter(Boolean)
        }) as CompiledKeyword[]
}

function findBestMatch(
    text: string,
    candidates: CompiledKeyword[],
): {
    candidate: CompiledKeyword
    start: number
    end: number
} | null {
    const normalizedText = normalizeVietnameseText(text)

    let best:
        | {
            candidate: CompiledKeyword
            start: number
            end: number
        }
        | null = null

    for (const candidate of candidates) {
        const index = normalizedText.indexOf(candidate.normalizedKeyword)

        if (index < 0) continue

        const score =
            candidate.score * 1000 +
            candidate.normalizedKeyword.length

        const bestScore = best
            ? best.candidate.score * 1000 + best.candidate.normalizedKeyword.length
            : -1

        if (score > bestScore) {
            const rawStart = findApproxRawIndex(text, normalizedText, index)
            const rawEnd = findApproxRawIndex(
                text,
                normalizedText,
                index + candidate.normalizedKeyword.length,
            )

            if (rawStart >= 0 && rawEnd > rawStart) {
                best = {
                    candidate,
                    start: rawStart,
                    end: rawEnd,
                }
            }
        }
    }

    return best
}

function findApproxRawIndex(
    rawText: string,
    normalizedText: string,
    normalizedIndex: number,
): number {
    if (normalizedIndex <= 0) return 0

    for (let rawIndex = 0; rawIndex <= rawText.length; rawIndex += 1) {
        const current = normalizeVietnameseText(rawText.slice(0, rawIndex))

        if (current.length >= normalizedIndex) {
            return rawIndex
        }
    }

    return rawText.length
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
    if (!parent) return anchorText

    const nodes: Node[] = []

    if (before) nodes.push(new Text(before))

    const link = new Element('a', {
        href: targetUrl,
    })

    link.children = [new Text(anchorText)]
    link.children[0].parent = link

    nodes.push(link)

    if (after) nodes.push(new Text(after))

    const index = parent.children.indexOf(node)

    // parent.children expects ChildNode[] but our Node type may differ;
    // cast to any to satisfy TypeScript while keeping runtime behavior.
    ;(parent.children as any).splice(index, 1, ...(nodes as any))

    for (const child of nodes) {
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
            walkTextNodes(child, callback)
        }
    }
}

export function applyInternalLinksToHtml(
    input: ApplyInternalLinksInput,
): ApplyInternalLinksResult {
    const html = normalizeContentHtml(input.html)

    if (!html || input.disabled || input.settings?.enabled === false) {
        return {
            html,
            insertions: [],
        }
    }

    const maxLinks = getMaxLinks(input)

    if (maxLinks <= 0) {
        return {
            html,
            insertions: [],
        }
    }

    const document = parseDocument(html, {
        decodeEntities: false,
    })

    const candidates = compileRules(input)

    if (!candidates.length) {
        return {
            html,
            insertions: [],
        }
    }

    const insertions: InternalLinkInsertion[] = []
    const targetCount = new Map<string, number>()
    const anchorCount = new Map<string, number>()
    const paragraphCount = new WeakMap<Node, number>()

    walkTextNodes(document as unknown as Node, (textNode) => {
        if (insertions.length >= maxLinks) return
        if (isInsideBlockedTag(textNode)) return
        if (!textNode.data.trim()) return

        const paragraph = getParagraphKey(textNode)

        if (paragraph) {
            const count = paragraphCount.get(paragraph) || 0
            const maxPerParagraph = input.settings?.maxLinksPerParagraph ?? 1

            if (count >= maxPerParagraph) return
        }

        const filteredCandidates = candidates.filter((candidate) => {
            const targetUsed = targetCount.get(candidate.targetUrl) || 0
            const maxTarget = input.settings?.maxSameTargetUrl ?? 2

            if (targetUsed >= maxTarget) return false

            const anchorUsed =
                anchorCount.get(normalizeVietnameseText(candidate.keyword)) || 0
            const maxAnchor = input.settings?.maxSameAnchor ?? 1

            if (anchorUsed >= maxAnchor) return false

            return true
        })

        const match = findBestMatch(textNode.data, filteredCandidates)

        if (!match) return

        const anchorText = replaceTextNode(
            textNode,
            match.start,
            match.end,
            match.candidate.targetUrl,
        )

        insertions.push({
            ruleId: match.candidate.rule.id,
            keyword: match.candidate.keyword,
            anchorText,
            targetUrl: match.candidate.targetUrl,
        })

        targetCount.set(
            match.candidate.targetUrl,
            (targetCount.get(match.candidate.targetUrl) || 0) + 1,
        )

        const normalizedAnchor = normalizeVietnameseText(match.candidate.keyword)

        anchorCount.set(
            normalizedAnchor,
            (anchorCount.get(normalizedAnchor) || 0) + 1,
        )

        if (paragraph) {
            paragraphCount.set(paragraph, (paragraphCount.get(paragraph) || 0) + 1)
        }
    })

    return {
        html: serialize(document, {
            encodeEntities: false,
        }),
        insertions,
    }
}