import fs from 'node:fs/promises'
import path from 'node:path'

type AuditRow = {
    oldUrl: string
    newUrl: string
}

type AuditResult = {
    expectedNewUrl: string
    finalStatus: string
    finalUrl: string
    firstLocation: string
    hops: number
    initialStatus: string
    notes: string
    oldUrl: string
    result: 'fail' | 'pass'
}

const DEFAULT_MAX_HOPS = 8

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`
    const value = process.argv.find((arg) =>
        arg.startsWith(prefix),
    )

    return value?.slice(prefix.length)
}

function csvEscape(value: string | number): string {
    const text = String(value)

    if (!/[",\n\r]/u.test(text)) {
        return text
    }

    return `"${text.replace(/"/gu, '""')}"`
}

function parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let quoted = false

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index]

        if (char === '"') {
            if (quoted && line[index + 1] === '"') {
                current += '"'
                index += 1
            } else {
                quoted = !quoted
            }

            continue
        }

        if (char === ',' && !quoted) {
            values.push(current.trim())
            current = ''
            continue
        }

        current += char
    }

    values.push(current.trim())
    return values
}

async function readInputCsv(filePath: string): Promise<AuditRow[]> {
    const raw = await fs.readFile(filePath, 'utf8')
    const lines = raw
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)

    const [headerLine, ...dataLines] = lines
    const headers = parseCsvLine(headerLine ?? '')
    const oldUrlIndex = headers.indexOf('oldUrl')
    const newUrlIndex = headers.indexOf('newUrl')

    if (oldUrlIndex === -1 || newUrlIndex === -1) {
        throw new Error('CSV must include oldUrl,newUrl headers.')
    }

    return dataLines
        .map((line) => {
            const values = parseCsvLine(line)
            return {
                oldUrl: values[oldUrlIndex] ?? '',
                newUrl: values[newUrlIndex] ?? '',
            }
        })
        .filter((row) => row.oldUrl && row.newUrl)
}

function toAbsoluteUrl(value: string, baseUrl: string): URL {
    return new URL(value, baseUrl)
}

async function fetchManualRedirect(url: URL): Promise<Response> {
    const headResponse = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
    })

    if (headResponse.status !== 405) {
        return headResponse
    }

    return fetch(url, {
        method: 'GET',
        redirect: 'manual',
    })
}

async function auditRow(
    row: AuditRow,
    baseUrl: string,
    maxHops: number,
): Promise<AuditResult> {
    const visited = new Set<string>()
    const expectedUrl = toAbsoluteUrl(row.newUrl, baseUrl)
    let currentUrl = toAbsoluteUrl(row.oldUrl, baseUrl)
    let firstLocation = ''
    let initialStatus = ''
    let finalStatus = ''
    let hops = 0
    let notes = ''

    for (; hops <= maxHops; hops += 1) {
        if (visited.has(currentUrl.href)) {
            notes = 'redirect_loop'
            break
        }

        visited.add(currentUrl.href)

        const response = await fetchManualRedirect(currentUrl)
        const status = response.status

        if (!initialStatus) {
            initialStatus = String(status)
        }

        if (status < 300 || status >= 400) {
            finalStatus = String(status)
            break
        }

        const location = response.headers.get('location')

        if (!location) {
            notes = 'missing_location'
            finalStatus = String(status)
            break
        }

        const nextUrl = new URL(location, currentUrl)

        if (!firstLocation) {
            firstLocation = nextUrl.pathname + nextUrl.search
        }

        currentUrl = nextUrl
    }

    if (hops > maxHops) {
        notes = 'too_many_redirects'
    }

    const finalUrl = currentUrl.href
    const expectedHref = expectedUrl.href
    const pass =
        (initialStatus === '301' || initialStatus === '308') &&
        finalStatus === '200' &&
        finalUrl === expectedHref &&
        hops <= 1 &&
        !notes

    return {
        expectedNewUrl: expectedHref,
        finalStatus,
        finalUrl,
        firstLocation,
        hops,
        initialStatus,
        notes: notes || (hops > 1 ? 'redirect_chain' : ''),
        oldUrl: toAbsoluteUrl(row.oldUrl, baseUrl).href,
        result: pass ? 'pass' : 'fail',
    }
}

async function run(): Promise<void> {
    const input = getArg('input')
    const output =
        getArg('output') ??
        path.resolve(process.cwd(), 'redirect-audit.csv')
    const baseUrl =
        getArg('base-url') ??
        process.env.NEXT_PUBLIC_BASE_URL ??
        'https://mfparis.vn'
    const maxHops = Number(getArg('max-hops') ?? DEFAULT_MAX_HOPS)

    if (!input) {
        throw new Error(
            'Missing --input=path/to/redirects.csv argument.',
        )
    }

    const rows = await readInputCsv(input)
    const results: AuditResult[] = []

    for (const row of rows) {
        results.push(await auditRow(row, baseUrl, maxHops))
    }

    const headers: (keyof AuditResult)[] = [
        'oldUrl',
        'expectedNewUrl',
        'initialStatus',
        'firstLocation',
        'hops',
        'finalUrl',
        'finalStatus',
        'result',
        'notes',
    ]

    const csv = [
        headers.join(','),
        ...results.map((result) =>
            headers
                .map((header) => csvEscape(result[header]))
                .join(','),
        ),
    ].join('\n')

    await fs.writeFile(output, `${csv}\n`, 'utf8')

    const failedCount = results.filter(
        (result) => result.result === 'fail',
    ).length

    console.log('[RedirectAudit] Summary', {
        failed: failedCount,
        output,
        total: results.length,
    })

    if (failedCount > 0) {
        process.exitCode = 1
    }
}

run().catch((error: unknown) => {
    console.error(
        '[RedirectAudit] Fatal error',
        error instanceof Error ? error.message : error,
    )
    process.exit(1)
})