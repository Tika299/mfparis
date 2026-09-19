import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { applyInternalLinksCached as run, clearInternalLinkRenderCache as clear } from '../../src/lib/internal-links/renderCache'
import { applyInternalLinksToHtml } from '../../src/lib/internal-links/htmlLinkInjector'
import type { ApplyInternalLinksInput } from '../../src/lib/internal-links/types'

const makeInput = (): ApplyInternalLinksInput => ({
    html: '<p>Chanel</p>',
    currentUrl: '/blog/cache-test',
    scope: 'posts',
    collectDiagnostics: false,
    settings: { enabled: true, maxLinksPerPost: 8 },
    rules: [{
        id: 1, title: 'Chanel', enabled: true, priority: 'brand',
        targetUrl: '/brands/chanel', scope: ['posts'],
        keywords: [{ keyword: 'Chanel', matchType: 'phrase' }],
    }],
})

beforeEach(() => clear())
afterEach(() => { vi.restoreAllMocks(); clear() })

test('First call misses; repeated input hits with identical output', () => {
    const input = makeInput()
    const first = run(input)
    expect(first.cache).toBe('miss')
    expect(first.result.insertions).toHaveLength(1)
    expect(run(makeInput()).cache).toBe('hit')
    expect(run(input).result).toEqual(applyInternalLinksToHtml(input))
})

test.each([
    'html', 'url', 'scope', 'rules', 'settings', 'disabled', 'override', 'exclude',
])('Changing %s must not reuse the old result', (field) => {
    const input = makeInput()
    run(input)
    if (field === 'html') input.html = '<p>Chanel Chanel</p>'
    if (field === 'url') input.currentUrl = '/brands/chanel'
    if (field === 'scope') input.scope = 'products'
    if (field === 'rules') input.rules[0].targetUrl = '/brands/new-target'
    if (field === 'settings') input.settings = { enabled: false }
    if (field === 'disabled') input.disabled = true
    if (field === 'override') input.maxLinksOverride = 0
    if (field === 'exclude') input.excludeKeywords = ['Chanel']
    const actual = run(input)
    expect(actual.cache).toBe('miss')
    expect(actual.result).toEqual(applyInternalLinksToHtml(input))
})

test('Preview bypasses cache and preserves diagnostics', () => {
    const input = makeInput()
    input.html = '<h2>Chanel</h2>'
    run(input)
    input.collectDiagnostics = true
    expect(run(input).cache).toBe('bypass')
    expect(run(input).result).toEqual(applyInternalLinksToHtml(input))
})

test('Entry expires after 60 seconds', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000)
    run(makeInput())
    clock.mockReturnValue(159_999)
    expect(run(makeInput()).cache).toBe('hit')
    clock.mockReturnValue(160_001)
    expect(run(makeInput()).cache).toBe('miss')
})

test('Cached output cannot be changed by callers', () => {
    const first = run(makeInput())
    const expected = structuredClone(first.result)
    first.result.html = 'changed on miss'
    first.result.insertions.length = 0

    const second = run(makeInput())
    expect(second.cache).toBe('hit')
    expect(second.result).toEqual(expected)
    second.result.html = 'changed on hit'
    second.result.insertions.length = 0

    expect(run(makeInput()).result).toEqual(expected)
})

test('Keeps at most 100 entries and evicts least recently used', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000)
    const inputAt = (id: number) => ({
        ...makeInput(),
        currentUrl: `/blog/cache-${id}`,
    })

    for (let i = 0; i < 100; i++) run(inputAt(i))
    expect(run(inputAt(0)).cache).toBe('hit')
    expect(run(inputAt(100)).cache).toBe('miss')

    expect(run(inputAt(0)).cache).toBe('hit')
    expect(run(inputAt(1)).cache).toBe('miss')
})

test('Evicts entries when stored JSON exceeds the byte budget', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000)
    const largeInput = (id: number): ApplyInternalLinksInput => ({
        ...makeInput(),
        currentUrl: `/blog/large-${id}`,
        html: `<p>${'x'.repeat(3 * 1024 * 1024)}</p>`,
        disabled: true,
        rules: [],
    })

    run(largeInput(0))
    run(largeInput(1))
    run(largeInput(2))

    expect(run(largeInput(2)).cache).toBe('hit')
    expect(run(largeInput(0)).cache).toBe('miss')
}, 30_000)

test('Does not store an individual result larger than 8 MB', () => {
    const input: ApplyInternalLinksInput = {
        ...makeInput(),
        html: `<p>${'x'.repeat(9 * 1024 * 1024)}</p>`,
        disabled: true,
        rules: [],
    }

    expect(run(input).cache).toBe('miss')
    expect(run(input).cache).toBe('miss')
}, 30_000)