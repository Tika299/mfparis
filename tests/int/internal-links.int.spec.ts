import { describe, expect, it } from 'vitest'
import { applyInternalLinksToHtml } from '../../src/lib/internal-links/htmlLinkInjector'
import type {
    ApplyInternalLinksInput,
    InternalLinkRule,
} from '../../src/lib/internal-links/types'

function rule(
    overrides: Partial<InternalLinkRule> = {},
): InternalLinkRule {
    return {
        id: 1,
        title: 'Chanel',
        enabled: true,
        priority: 'product',
        keywords: [{ keyword: 'Chanel', matchType: 'phrase' }],
        targetUrl: '/brands/chanel',
        scope: ['posts'],
        maxInsertionsPerPage: 10,
        ...overrides,
    }
}

function run(
    html: string,
    overrides: Partial<ApplyInternalLinksInput> = {},
) {
    return applyInternalLinksToHtml({
        html,
        currentUrl: '/blog/bai-kiem-tra',
        scope: 'posts',
        rules: [rule()],
        settings: {
            enabled: true,
            maxLinksPerPost: 8,
            maxLinksPerParagraph: 1,
            maxSameTargetUrl: 2,
            maxSameAnchor: 1,
        },
        ...overrides,
    })
}

describe('Hanh vi can giu', () => {
    it('chen link dung URL va giu anchor goc', () => {
        const result = run('<p>Toi chon CHANEL.</p>')
        expect(result.insertions).toHaveLength(1)
        expect(result.insertions[0].anchorText).toBe('CHANEL')
        expect(result.html).toContain('href="/brands/chanel"')
    })

    it.each(['h1', 'h2', 'h3', 'code', 'pre', 'strong', 'button'])(
        'khong chen trong %s',
        (tag) => {
            expect(run(`<${tag}>Chanel</${tag}>`).insertions).toHaveLength(0)
        },
    )

    it('giu link thu cong, khong tao link long nhau', () => {
        const result = run('<p><a href="/manual">Chanel</a></p>')
        expect(result.insertions).toHaveLength(0)
        expect(result.html).toContain('href="/manual"')
        expect(result.html.match(/<a\b/g)).toHaveLength(1)
    })

    it.each([
        '/blog/bai-kiem-tra',
        'https://mfparis.vn/blog/bai-kiem-tra/',
    ])('khong self-link: %s', (targetUrl) => {
        expect(run('<p>Chanel</p>', {
            rules: [rule({ targetUrl })],
        }).insertions).toHaveLength(0)
    })

    it('khong chen sai scope', () => {
        expect(run('<p>Chanel</p>', {
            scope: 'categories',
        }).insertions).toHaveLength(0)
    })

    it('ton trong keyword loai tru', () => {
        expect(run('<p>Chanel</p>', {
            excludeKeywords: ['CHANEL'],
        }).insertions).toHaveLength(0)
    })

    it('phrase khong khop mot phan tu', () => {
        expect(run('<p>Chanelabc</p>').insertions).toHaveLength(0)
    })

    it('tat tinh nang thi khong chen', () => {
        expect(run('<p>Chanel</p>', {
            disabled: true,
        }).insertions).toHaveLength(0)
    })

    it('gioi han bang 0 thi khong chen', () => {
        expect(run('<p>Chanel</p>', {
            maxLinksOverride: 0,
        }).insertions).toHaveLength(0)
    })

    it('noi dung rong thi khong chen', () => {
        expect(run('').insertions).toHaveLength(0)
    })

    it.each([
        ['maxLinksPerPost', 2],
        ['maxSameTargetUrl', 2],
        ['maxSameAnchor', 2],
        ['maxLinksPerParagraph', 1],
    ] as const)('ton trong %s', (key, limit) => {
        const html = key === 'maxLinksPerParagraph'
            ? '<p>Chanel<span> Chanel</span><span> Chanel</span></p>'
            : '<p>Chanel</p><p>Chanel</p><p>Chanel</p>'

        const result = run(html, {
            settings: {
                enabled: true,
                maxLinksPerPost: 10,
                maxLinksPerParagraph: 10,
                maxSameTargetUrl: 10,
                maxSameAnchor: 10,
                [key]: limit,
            },
        })
        expect(result.insertions).toHaveLength(limit)
    })

    it('ton trong gioi han cua rule', () => {
        const result = run('<p>Chanel</p><p>Chanel</p>', {
            rules: [rule({ maxInsertionsPerPage: 1 })],
            settings: {
                enabled: true,
                maxSameAnchor: 10,
                maxSameTargetUrl: 10,
            },
        })
        expect(result.insertions).toHaveLength(1)
    })

    it('chon rule uu tien cao va cho ket qua on dinh', () => {
        const input = {
            rules: [
                rule({ id: 1, priority: 'post', targetUrl: '/blog/chanel' }),
                rule({ id: 2, priority: 'product', targetUrl: '/products/chanel' }),
            ],
        }
        const first = run('<p>Chanel</p>', input)
        expect(first.insertions[0].targetUrl).toBe('/products/chanel')
        expect(run('<p>Chanel</p>', input)).toEqual(first)
    })
})

describe('Kiem tra loi khop tu khoa', () => {
    it.each([
        ['tiếng Việt', 'sữa', '<p>SỮA</p>'],
        ['bỏ dấu', 'sữa', '<p>sua</p>'],
        ['nhiều từ', 'serum loreal', '<p>serum loreal</p>'],
        ['nhiều khoảng trắng', 'serum loreal', '<p>serum   loreal</p>'],
        ['khoảng trắng entity', 'serum loreal', '<p>serum&nbsp;loreal</p>'],
        ['ký tự &', 'A&B', '<p>A&amp;B</p>'],
        ['dấu nháy', "L'Oreal", '<p>L&#39;Oreal</p>'],
    ])('%s', (_label, keyword, html) => {
        const result = run(html, {
            rules: [rule({
                keywords: [{ keyword, matchType: 'phrase' }],
            })],
        })
        expect(result.insertions).toHaveLength(1)
    })
})

describe('Render nhanh va preview', () => {
    it.each([
        '<h2>Chanel</h2><p>Chanel</p>',
        '<p><a href="/manual">Chanel</a></p><p>Chanel</p>',
        '<p>Chanel<span> Chanel</span></p><p>Chanel</p>',
        '<p>Chanel</p><p>Chanel</p><p>Chanel</p>',
    ])('giu cung HTML va link: %s', (html) => {
        const options = { maxLinksOverride: 1 }

        const fast = run(html, {
            ...options,
            collectDiagnostics: false,
        })

        const preview = run(html, {
            ...options,
            collectDiagnostics: true,
        })

        expect(fast.html).toBe(preview.html)
        expect(fast.insertions).toEqual(preview.insertions)
    })

    it('preview van giai thich keyword bi chan trong heading', () => {
        const result = run('<h2>Chanel</h2><p>Chanel</p>', {
            collectDiagnostics: true,
        })

        expect(result.skipped.some((item) => item.reason === 'heading')).toBe(true)
    })
})

describe('Dem anchor nhieu tu', () => {
    it('cac bien the cung anchor van chung gioi han', () => {
        const result = run(
            '<p>Serum Loreal</p><p>SERUM   LOREAL</p>',
            {
                rules: [rule({
                    keywords: [
                        { keyword: 'serum loreal', matchType: 'phrase' },
                        { keyword: 'SERUM   LOREAL', matchType: 'phrase' },
                    ],
                })],
                settings: {
                    enabled: true,
                    maxLinksPerPost: 8,
                    maxSameTargetUrl: 8,
                    maxSameAnchor: 1,
                },
            },
        )

        expect(result.insertions).toHaveLength(1)
        expect(result.insertions[0].anchorText).toBe('Serum Loreal')
    })
})

describe('Chan doan gioi han URL', () => {
    it('render bo log nhung van giu cung ket qua voi preview', () => {
        const html = '<p>Chanel</p><p>Chanel</p>'
        const settings = {
            enabled: true,
            maxLinksPerPost: 8,
            maxSameTargetUrl: 1,
            maxSameAnchor: 8,
        }

        const fast = run(html, {
            settings,
            collectDiagnostics: false,
        })

        const preview = run(html, {
            settings,
            collectDiagnostics: true,
        })

        expect(fast.insertions).toHaveLength(1)
        expect(fast.html).toBe(preview.html)
        expect(fast.insertions).toEqual(preview.insertions)
        expect(fast.skipped).toHaveLength(0)
        expect(
            preview.skipped.some((item) => item.reason === 'max_target_reached'),
        ).toBe(true)
    })
})

describe('Do hieu nang voi 721 rules', () => {
    it('so sanh render va preview tren ba tinh huong', () => {
        const rules = Array.from({ length: 721 }, (_, index) =>
            rule({
                id: index + 1,
                title: `Rule ${index}`,
                targetUrl: `/products/item-${index}`,
                keywords: [{
                    keyword: `brand${index}`,
                    matchType: 'phrase',
                }],
            }),
        )

        const matchingParagraphs = Array.from(
            { length: 80 },
            (_, index) =>
                `<p>Noi dung gioi thieu brand${index} va cach su dung.</p>`,
        )

        const emptyParagraphs = Array.from(
            { length: 80 },
            () => '<p>Noi dung cham soc da khong co tu khoa phu hop.</p>',
        )

        const cases = [
            {
                name: 'Du link som',
                html: matchingParagraphs.join(''),
                expected: 8,
            },
            {
                name: 'Keyword o cuoi bai',
                html: emptyParagraphs.join('') + matchingParagraphs.join(''),
                expected: 8,
            },
            {
                name: 'Khong co keyword',
                html: emptyParagraphs.join(''),
                expected: 0,
            },
        ]

        for (const sample of cases) {
            const execute = (collectDiagnostics: boolean) =>
                run(sample.html, { rules, collectDiagnostics })

            // Lam nong ca hai che do truoc khi do.
            execute(false)
            execute(true)

            const fastTimes: number[] = []
            const previewTimes: number[] = []

            for (let index = 0; index < 10; index++) {
                // Doi thu tu de giam anh huong cua thu tu chay.
                const modes = index % 2 === 0
                    ? [false, true]
                    : [true, false]

                for (const mode of modes) {
                    const start = performance.now()
                    const result = execute(mode)
                    const elapsed = performance.now() - start

                        ; (mode ? previewTimes : fastTimes).push(elapsed)
                    expect(result.insertions).toHaveLength(sample.expected)
                }
            }

            const fast = execute(false)
            const preview = execute(true)

            expect(fast.html).toBe(preview.html)
            expect(fast.insertions).toEqual(preview.insertions)

            const median = (values: number[]) => {
                const sorted = [...values].sort((a, b) => a - b)
                return (sorted[4] + sorted[5]) / 2
            }

            console.log('[LINK BENCH]', {
                case: sample.name,
                rules: rules.length,
                htmlCharacters: sample.html.length,
                inserted: fast.insertions.length,
                renderMedianMs: Number(median(fastTimes).toFixed(2)),
                previewMedianMs: Number(median(previewTimes).toFixed(2)),
            })
        }
    }, 60_000)
})