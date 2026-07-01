'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import { ExpandableContent } from '@/components/ExpandableContent'

type LexicalNode = Record<string, any>

type TocItem = {
    id: string
    text: string
}

type BlogRichTextContentProps = {
    content: any
    tocItems: TocItem[]
    maxHeight?: number
}

type BlogTocNavProps = {
    tocItems: TocItem[]
}

const BLOG_TOC_SCROLL_EVENT = 'blog-toc-scroll-to-heading'

function getTextFromNode(node: LexicalNode): string {
    if (!node) return ''
    if (typeof node.text === 'string') return node.text

    if (Array.isArray(node.children)) {
        return node.children.map(getTextFromNode).join('')
    }

    return ''
}

function getBlogHeadingClassName(tag?: string) {
    if (tag === 'h2') {
        return 'scroll-mt-28 mt-12 mb-5 text-2xl font-black leading-tight text-gray-950 md:text-3xl'
    }

    if (tag === 'h3') {
        return 'mt-9 mb-4 text-xl font-bold leading-snug text-gray-900 md:text-2xl'
    }

    return 'mt-8 mb-4 text-lg font-bold leading-snug text-gray-900'
}

function scrollToHeading(id: string) {
    const scroll = (attempt = 0) => {
        const element = document.getElementById(id)

        if (!element) {
            if (attempt < 10) {
                requestAnimationFrame(() => scroll(attempt + 1))
            }

            return
        }

        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        })

        window.history.replaceState(null, '', `#${id}`)
    }

    requestAnimationFrame(() => scroll())
}

export function BlogRichTextContent({
    content,
    tocItems,
    maxHeight = 500,
}: BlogRichTextContentProps) {
    const [expanded, setExpanded] = useState(false)

    const children = content?.root?.children || []

    const headingIdByNode = useMemo(() => {
        const map = new Map<LexicalNode, string>()
        let index = 0

        children.forEach((node: LexicalNode) => {
            if (node?.type !== 'heading' || node?.tag !== 'h2') return

            const id = tocItems[index]?.id

            if (id) {
                map.set(node, id)
            }

            index += 1
        })

        return map
    }, [children, tocItems])

    const converters = useCallback(
        ({ defaultConverters }: any) => ({
            ...defaultConverters,

            heading: ({ node, nodesToJSX }: any) => {
                const Tag = node.tag || 'h2'
                const id =
                    node.tag === 'h2'
                        ? headingIdByNode.get(node)
                        : undefined

                return (
                    <Tag id={id} className={getBlogHeadingClassName(node.tag)}>
                        {nodesToJSX({ nodes: node.children })}
                    </Tag>
                )
            },
        }),
        [headingIdByNode],
    )

    const openAndScrollTo = useCallback((id: string) => {
        setExpanded(true)

        window.setTimeout(() => {
            scrollToHeading(id)
        }, 160)
    }, [])

    useEffect(() => {
        const handleTocScroll = (event: Event) => {
            const customEvent = event as CustomEvent<{ id?: string }>
            const id = customEvent.detail?.id

            if (!id) return

            openAndScrollTo(id)
        }

        window.addEventListener(BLOG_TOC_SCROLL_EVENT, handleTocScroll)

        return () => {
            window.removeEventListener(BLOG_TOC_SCROLL_EVENT, handleTocScroll)
        }
    }, [openAndScrollTo])

    return (
        <div className="blog-content prose max-w-none">
            <ExpandableContent
                maxHeight={maxHeight}
                expanded={expanded}
                onExpandedChange={setExpanded}
            >
                <PayloadRichText
                    data={content}
                    converters={converters}
                    disableContainer
                />
            </ExpandableContent>
        </div>
    )
}

export function BlogTocNav({ tocItems }: BlogTocNavProps) {
    return (
        <nav className="space-y-2">
            {tocItems.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                        window.dispatchEvent(
                            new CustomEvent(BLOG_TOC_SCROLL_EVENT, {
                                detail: { id: item.id },
                            }),
                        )
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm leading-6 text-gray-700 transition hover:bg-gray-50 hover:text-primary"
                >
                    {index + 1}. {item.text}
                </button>
            ))}
        </nav>
    )
}