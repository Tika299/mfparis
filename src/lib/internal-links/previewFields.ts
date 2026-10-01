export const INTERNAL_LINK_PREVIEW_FIELDS = {
    posts: [
        { name: 'content', label: 'Nội dung bài viết' },
    ],
    products: [
        { name: 'description', label: 'Mô tả sản phẩm' },
    ],
    categories: [
        { name: 'description', label: 'Mô tả danh mục' },
        { name: 'bottomContentHtml', label: 'Nội dung cuối trang' },
    ],
    brands: [
        { name: 'description', label: 'Mô tả thương hiệu' },
        { name: 'bottomContentHtml', label: 'Nội dung cuối trang' },
    ],
    'post-categories': [
        { name: 'description', label: 'Mô tả danh mục blog' },
        { name: 'introHtml', label: 'Nội dung giới thiệu' },
        { name: 'bottomContentHtml', label: 'Nội dung cuối trang' },
    ],
} as const

export type InternalLinkPreviewCollection =
    keyof typeof INTERNAL_LINK_PREVIEW_FIELDS

export type InternalLinkPreviewField =
    (typeof INTERNAL_LINK_PREVIEW_FIELDS)[InternalLinkPreviewCollection][number]['name']

export function isInternalLinkPreviewCollection(
    value: unknown,
): value is InternalLinkPreviewCollection {
    return (
        typeof value === 'string' &&
        Object.prototype.hasOwnProperty.call(
            INTERNAL_LINK_PREVIEW_FIELDS,
            value,
        )
    )
}

export function getInternalLinkPreviewField(
    collection: InternalLinkPreviewCollection,
    field: unknown,
) {
    if (typeof field !== 'string') return undefined

    return INTERNAL_LINK_PREVIEW_FIELDS[collection].find(
        (item) => item.name === field,
    )
}