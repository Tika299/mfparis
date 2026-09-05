type RelationshipValue =
    | string
    | number
    | {
        id?: string | number | null
    }
    | null
    | undefined

export type CategoryTreeItem = {
    id: string | number
    name?: string | null
    slug?: string | null
    image?: unknown
    parent?: RelationshipValue
}

export function getRelationshipID(value: RelationshipValue): string | null {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
    }

    if (value && typeof value === 'object' && 'id' in value) {
        const id = value.id

        if (typeof id === 'string' || typeof id === 'number') {
            return String(id)
        }
    }

    return null
}

export function buildChildrenByParentID(categories: CategoryTreeItem[]) {
    const childrenByParentID = new Map<string, CategoryTreeItem[]>()

    for (const category of categories) {
        const parentID = getRelationshipID(category.parent)

        if (!parentID) continue

        const children = childrenByParentID.get(parentID) ?? []
        children.push(category)
        childrenByParentID.set(parentID, children)
    }

    for (const children of childrenByParentID.values()) {
        children.sort((left, right) =>
            String(left.name || '').localeCompare(String(right.name || ''), 'vi'),
        )
    }

    return childrenByParentID
}

export function buildCategoryByID(categories: CategoryTreeItem[]) {
    const categoryByID = new Map<string, CategoryTreeItem>()

    for (const category of categories) {
        categoryByID.set(String(category.id), category)
    }

    return categoryByID
}

export function getCategoryChildren(
    categoryID: string | number,
    categories: CategoryTreeItem[],
) {
    return buildChildrenByParentID(categories).get(String(categoryID)) ?? []
}

export function getCategoryDescendants(
    categoryID: string | number,
    categories: CategoryTreeItem[],
) {
    const childrenByParentID = buildChildrenByParentID(categories)
    const result: CategoryTreeItem[] = []
    const queue = [...(childrenByParentID.get(String(categoryID)) ?? [])]
    const seen = new Set<string>([String(categoryID)])

    while (queue.length > 0) {
        const category = queue.shift()
        if (!category) continue

        const id = String(category.id)
        if (seen.has(id)) continue

        seen.add(id)
        result.push(category)
        queue.push(...(childrenByParentID.get(id) ?? []))
    }

    return result
}

export function getCategoryDescendantIDs(
    categoryID: string | number,
    categories: CategoryTreeItem[],
) {
    return [
        String(categoryID),
        ...getCategoryDescendants(categoryID, categories).map((category) =>
            String(category.id),
        ),
    ]
}

export function getCategoryAncestors(
    category: CategoryTreeItem,
    categories: CategoryTreeItem[],
) {
    const categoryByID = buildCategoryByID(categories)
    const result: CategoryTreeItem[] = []
    const seen = new Set<string>([String(category.id)])

    let parentID = getRelationshipID(category.parent)

    while (parentID) {
        if (seen.has(parentID)) break

        const parent = categoryByID.get(parentID)
        if (!parent) break

        result.unshift(parent)
        seen.add(parentID)
        parentID = getRelationshipID(parent.parent)
    }

    return result
}

export function getCategorySiblings(
    category: CategoryTreeItem,
    categories: CategoryTreeItem[],
) {
    const parentID = getRelationshipID(category.parent)

    return categories
        .filter((item) => {
            if (String(item.id) === String(category.id)) return false
            return getRelationshipID(item.parent) === parentID
        })
        .sort((left, right) =>
            String(left.name || '').localeCompare(String(right.name || ''), 'vi'),
        )
}