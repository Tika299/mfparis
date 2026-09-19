import { createHash } from 'node:crypto'
import { applyInternalLinksToHtml } from './htmlLinkInjector'
import type { ApplyInternalLinksInput, ApplyInternalLinksResult } from './types'

type Entry = { json: string; bytes: number; expiresAt: number }
const entries = new Map<string, Entry>()
const MAX_BYTES = 8 * 1024 * 1024
const MAX_ENTRIES = 100
const TTL_MS = 60_000
let totalBytes = 0

function remove(key: string) {
    const entry = entries.get(key)
    if (!entry) return
    totalBytes -= entry.bytes
    entries.delete(key)
}

export function clearInternalLinkRenderCache() {
    entries.clear()
    totalBytes = 0
}

export function applyInternalLinksCached(input: ApplyInternalLinksInput) {
    if (input.collectDiagnostics || typeof input.html !== 'string') {
        return { result: applyInternalLinksToHtml(input), cache: 'bypass' as const }
    }

    const now = Date.now()
    for (const [key, entry] of entries) {
        if (entry.expiresAt <= now) remove(key)
    }

    const key = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    const hit = entries.get(key)
    if (hit) {
        entries.delete(key)
        entries.set(key, hit)
        return {
            result: JSON.parse(hit.json) as ApplyInternalLinksResult,
            cache: 'hit' as const,
        }
    }

    const result = applyInternalLinksToHtml(input)
    const json = JSON.stringify(result)
    const bytes = Buffer.byteLength(json, 'utf8')
    if (bytes <= MAX_BYTES) {
        while (entries.size >= MAX_ENTRIES || totalBytes + bytes > MAX_BYTES) {
            const oldest = entries.keys().next().value
            if (oldest === undefined) break
            remove(oldest)
        }
        entries.set(key, { json, bytes, expiresAt: Date.now() + TTL_MS })
        totalBytes += bytes
    }
    return { result, cache: 'miss' as const }
}