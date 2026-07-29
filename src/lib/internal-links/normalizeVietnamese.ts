export function normalizeVietnameseText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/\s+/g, '')
        .trim()
}

export function normalizeUrlPath(value: string): string {
    try {
        const url = new URL(value, 'https://mfparis.vn')
        return url.pathname.replace(/\/+$/u, '') || '/'
    } catch {
        return value.trim().replace(/\/+$/u, '') || '/'
    }
}

export function isSameUrl(left: string, right: string): boolean {
    return normalizeUrlPath(left) === normalizeUrlPath(right)
}