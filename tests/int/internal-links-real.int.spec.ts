import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseCsv } from '../../src/lib/content-excel/workbook'
import { applyInternalLinksToHtml as oldRun } from '../../src/lib/internal-links/htmlLinkInjector.baseline'
import { applyInternalLinksToHtml as newRun } from '../../src/lib/internal-links/htmlLinkInjector'
import type { ApplyInternalLinksInput, InternalLinkRule } from '../../src/lib/internal-links/types'

test('Compare old and new using real CSV', () => {
    const folder = 'C:/Users/Xuan Vu/Downloads/'
    const read = (name: string) =>
        parseCsv(readFileSync(folder + name, 'utf8'))
    const post = read('mfparis-blog-loreal-baseline.csv')
        .find(row => row.id === '841')
    if (!post) throw new Error('Missing post 841')

    const rules: InternalLinkRule[] =
        read('mfparis-internal-link-rules-baseline.csv').map(row => ({
            id: row.id,
            title: row.title,
            enabled: row.enabled === 'true',
            priority: row.priority as InternalLinkRule['priority'],
            targetUrl: row.targetUrl,
            keywords: JSON.parse(row.keywords || '[]'),
            scope: JSON.parse(row.scope || '[]'),
            maxInsertionsPerPage: row.maxInsertionsPerPage
                ? Number(row.maxInsertionsPerPage) : null,
        }))
    const input: ApplyInternalLinksInput = {
        html: post.content, currentUrl: '/blog/' + post.slug,
        scope: 'posts', rules, collectDiagnostics: false,
        settings: {
            enabled: true, previewOnly: false, maxLinksPerPost: 8,
            maxLinksPerParagraph: 1, maxSameTargetUrl: 2, maxSameAnchor: 1,
        },
    }
    const before = oldRun(input)
    const after = newRun(input)
    console.log('OLD links:', before.insertions)
    console.log('NEW links:', after.insertions)
    console.log('Same HTML:', before.html === after.html)
    expect(after.insertions).toEqual(before.insertions)
    expect(after.html).toBe(before.html)
    // Warm up both implementations before measuring.
    for (let i = 0; i < 3; i++) {
        oldRun(input)
        newRun(input)
    }

    const oldTimes: number[] = []
    const newTimes: number[] = []

    const measure = (fn: typeof newRun, times: number[]) => {
        const start = performance.now()
        const result = fn(input)
        times.push(performance.now() - start)

        // Keep assertions outside the measured interval.
        expect(result.html).toBe(before.html)
        expect(result.insertions).toEqual(before.insertions)
    }

    for (let i = 0; i < 10; i++) {
        // Alternate order to reduce measurement bias.
        if (i % 2 === 0) {
            measure(oldRun, oldTimes)
            measure(newRun, newTimes)
        } else {
            measure(newRun, newTimes)
            measure(oldRun, oldTimes)
        }
    }

    const summarize = (name: string, values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b)
        return {
            version: name,
            medianMs: Number(((sorted[4] + sorted[5]) / 2).toFixed(2)),
            minMs: Number(sorted[0].toFixed(2)),
            maxMs: Number(sorted[9].toFixed(2)),
        }
    }

    console.table([
        summarize('OLD', oldTimes),
        summarize('NEW', newTimes),
    ])
}, 60_000)