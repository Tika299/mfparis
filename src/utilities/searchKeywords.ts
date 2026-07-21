type AnyRecord = Record<string, any>

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null
}

export function normalizeSearchText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Ä‘Ä]/g, 'd')
    .toLowerCase()
    .replace(/&amp;|&#038;/g, ' va ')
    .replace(/&quot;|&#34;/g, ' ')
    .replace(/&#039;|&apos;/g, ' ')
    .replace(/&lt;|&gt;/g, ' ')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addValue(parts: string[], value: unknown) {
  const normalized = normalizeSearchText(value)

  if (normalized) {
    parts.push(normalized)
  }
}

function addRelationship(parts: string[], value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) {
      addRelationship(parts, item)
    }
    return
  }

  if (!isRecord(value)) {
    return
  }

  addValue(parts, value.name)
  addValue(parts, value.label)
  addValue(parts, value.title)
  addValue(parts, value.slug)
}

export function buildProductSearchKeywords(product: AnyRecord): string {
  const parts: string[] = []

  addValue(parts, product.title)
  addValue(parts, product.slug)
  addValue(parts, product.sku)
  addValue(parts, product.gtin)
  addValue(parts, product.mpn)
  addValue(parts, product.shortDescription)
  addValue(parts, product.seoTitle)
  addValue(parts, product.seoDescription)

  addRelationship(parts, product.brand)
  addRelationship(parts, product.categories)

  if (Array.isArray(product.specifications)) {
    for (const spec of product.specifications) {
      if (!isRecord(spec)) continue
      addValue(parts, spec.label)
      addValue(parts, spec.value)
    }
  }

  if (Array.isArray(product.productAttributes)) {
    for (const row of product.productAttributes) {
      if (!isRecord(row)) continue
      addRelationship(parts, row.attribute)
      addRelationship(parts, row.values)
      addValue(parts, row.textValue)
      addValue(parts, row.numericValue)
      addValue(parts, row.booleanValue)
    }
  }

  if (isRecord(product.fragranceProfile)) {
    addRelationship(parts, product.fragranceProfile.topNotes)
    addRelationship(parts, product.fragranceProfile.middleNotes)
    addRelationship(parts, product.fragranceProfile.baseNotes)
  }

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (!isRecord(variant)) continue
      addValue(parts, variant.name)
      addValue(parts, variant.sku)
      addRelationship(parts, variant.optionValues)
    }
  }

  return Array.from(new Set(parts.join(' ').split(/\s+/).filter(Boolean))).join(' ')
}
