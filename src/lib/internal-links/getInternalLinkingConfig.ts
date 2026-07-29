export function getInternalLinkingConfig(doc: any) {
    const config = doc?.internalLinking || {}

    return {
        disabled: Boolean(config.disableAutoLinks),
        maxLinksOverride:
            typeof config.maxLinksOverride === 'number'
                ? config.maxLinksOverride
                : null,
        excludeKeywords: Array.isArray(config.excludeKeywords)
            ? config.excludeKeywords
                .map((item: any) => item?.keyword)
                .filter(Boolean)
            : [],
    }
}