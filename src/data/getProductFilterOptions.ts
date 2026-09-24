import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

import type { FilterFacetGroup, FilterItem } from '@/components/search-filters/search-filters.types'

const PRODUCTS_CACHE_TAG = 'products'
const BRANDS_CACHE_TAG = 'brands'
const CATEGORIES_CACHE_TAG = 'categories'
const ATTRIBUTES_CACHE_TAG = 'attributes'

type RelationshipID = string | number
type FacetCountMap = Record<string, number>
type FilterSurface = 'products' | 'categories' | 'brands' | 'search'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRelationshipID(value: unknown): RelationshipID | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  const id = value.id

  if (typeof id === 'string' || typeof id === 'number') {
    return id
  }

  return null
}

function incrementCount(countMap: FacetCountMap, id: RelationshipID) {
  const key = String(id)
  countMap[key] = (countMap[key] ?? 0) + 1
}

function relationshipIDs(values: unknown): RelationshipID[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map(getRelationshipID)
    .filter((id): id is RelationshipID => id !== null)
}

const getFilterReferenceData = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise })
    return Promise.all([
      payload.find({
        collection: 'brands', depth: 0, pagination: false,
        overrideAccess: true, sort: 'name',
        select: { name: true, slug: true },
      }),
      payload.find({
        collection: 'categories', depth: 0, pagination: false,
        overrideAccess: true, sort: 'name',
        select: { name: true, slug: true },
      }),
      payload.find({
        collection: 'attributes', depth: 0, pagination: false,
        overrideAccess: true, sort: 'sortOrder',
        where: {
          and: [
            { isActive: { equals: true } },
            { filterable: { equals: true } },
          ]
        },
        select: {
          name: true, slug: true, allowsMultiple: true, description: true,
        },
      }),
      payload.find({
        collection: 'attribute-values', depth: 0, pagination: false,
        overrideAccess: true, sort: 'sortOrder',
        where: { isActive: { equals: true } },
        select: { attribute: true, label: true, slug: true },
      }),
      payload.find({
        collection: 'fragrance-notes', depth: 0, pagination: false,
        overrideAccess: true, sort: 'name',
        where: { isActive: { equals: true } },
        select: { name: true, slug: true },
      }),
      payload.find({
        collection: 'product-filter-groups',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'sortOrder',
        select: {
          label: true,
          queryKey: true,
          enabled: true,
          sortOrder: true,
          sourceType: true,
          attribute: true,
          displayType: true,
          showOn: true,
          maxOptions: true,
          collapsedByDefault: true,
        },
      }),
    ])
  },
  ['mfparis-filter-reference-v2-groups'],
  {
    revalidate: 300,
    tags: [
      'brands',
      'categories',
      'attributes',
      'attribute-values',
      'fragrance-notes',
      'product-filter-groups',
    ],
  },
)

export const getProductFilterOptions = unstable_cache(
  async (
    categoryIDs: string[] = [],
    surface: FilterSurface = 'products',
  ): Promise<{
    brands: FilterItem[]
    categories: FilterItem[]
    facets: FilterFacetGroup[]
  }> => {
    const payload = await getPayload({
      config: configPromise,
    })

    const [
      [brandsResult, categoriesResult, attributesResult,
        attributeValuesResult, fragranceNotesResult, filterGroupsResult],
      productRelationsResult,
    ] = await Promise.all([
      getFilterReferenceData(),
      payload.find({
        collection: 'products',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        where: {
          and: [
            { status: { equals: 'published' } },
            ...(categoryIDs.length > 0
              ? [{ categories: { in: categoryIDs } }]
              : []),
          ],
        },
        select: {
          brand: true,
          categories: true,
          productAttributes: true,
          fragranceProfile: true,
        },
      }),
    ])

    const brandCounts: FacetCountMap = {}
    const categoryCounts: FacetCountMap = {}
    const attributeValueCounts: FacetCountMap = {}
    const noteCounts: FacetCountMap = {}

    for (const product of productRelationsResult.docs) {
      const brandID = getRelationshipID(product.brand)

      if (brandID !== null) {
        incrementCount(brandCounts, brandID)
      }

      for (const categoryID of new Set(relationshipIDs(product.categories))) {
        incrementCount(categoryCounts, categoryID)
      }

      if (Array.isArray(product.productAttributes)) {
        const uniqueValueIDs = new Set<RelationshipID>()

        for (const row of product.productAttributes) {
          if (!isRecord(row)) {
            continue
          }

          for (const valueID of relationshipIDs(row.values)) {
            uniqueValueIDs.add(valueID)
          }
        }

        for (const valueID of uniqueValueIDs) {
          incrementCount(attributeValueCounts, valueID)
        }
      }

      const fragranceProfile = isRecord(product.fragranceProfile)
        ? product.fragranceProfile
        : null

      if (fragranceProfile) {
        const uniqueNoteIDs = new Set<RelationshipID>([
          ...relationshipIDs(fragranceProfile.topNotes),
          ...relationshipIDs(fragranceProfile.middleNotes),
          ...relationshipIDs(fragranceProfile.baseNotes),
        ])

        for (const noteID of uniqueNoteIDs) {
          incrementCount(noteCounts, noteID)
        }
      }
    }

    const brands: FilterItem[] = brandsResult.docs
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        count: brandCounts[String(brand.id)] ?? 0,
      }))
      .filter((brand) =>
        categoryIDs.length === 0 || brand.count > 0,
      )

    const categories: FilterItem[] = categoriesResult.docs.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: categoryCounts[String(category.id)] ?? 0,
    }))

    const attributeValuesByAttribute = new Map<string, FilterItem[]>()

    for (const value of attributeValuesResult.docs) {
      const attributeID = getRelationshipID(value.attribute)

      if (attributeID === null) {
        continue
      }

      const count = attributeValueCounts[String(value.id)] ?? 0

      if (count <= 0) {
        continue
      }

      const key = String(attributeID)
      const nextValues = attributeValuesByAttribute.get(key) ?? []

      nextValues.push({
        id: value.id,
        name: value.label,
        slug: value.slug,
        count,
      })

      attributeValuesByAttribute.set(key, nextValues)
    }

    type Group = (typeof filterGroupsResult.docs)[number]
    const groupsByAttribute = new Map<string, Group>()

    for (const group of filterGroupsResult.docs) {
      if (group.sourceType !== 'attribute') continue
      const id = getRelationshipID(group.attribute)
      if (id === null) continue
      const key = String(id)
      if (!groupsByAttribute.has(key)) groupsByAttribute.set(key, group)
    }

    const attributeFacets: FilterFacetGroup[] = attributesResult.docs
      .filter((attribute) => {
        const group = groupsByAttribute.get(String(attribute.id))
        if (!group) return true
        return group.enabled === true && group.showOn?.includes(surface) === true
      })
      .sort((a, b) =>
        (groupsByAttribute.get(String(a.id))?.sortOrder ?? 100) -
        (groupsByAttribute.get(String(b.id))?.sortOrder ?? 100),
      )
      .map((attribute) => {
        const group = groupsByAttribute.get(String(attribute.id))
        const items = (attributeValuesByAttribute.get(String(attribute.id)) ?? [])
          .sort((left, right) => {
            const countDiff = (right.count ?? 0) - (left.count ?? 0)
            return countDiff || left.name.localeCompare(right.name, 'vi')
          })

        return {
          key: `attr_${attribute.slug}`,
          title: group?.label || attribute.name,
          placeholder: `Chọn ${attribute.name.toLocaleLowerCase('vi')}`,
          emptyMessage: `Chưa có ${attribute.name.toLocaleLowerCase('vi')}`,
          multiple: attribute.allowsMultiple !== false,
          description: attribute.description || undefined,
          collapsedByDefault: group?.collapsedByDefault ?? true,
          items,
        }
      })
      .filter((facet) => facet.items.length > 0)

    const noteItems: FilterItem[] = fragranceNotesResult.docs
      .map((note) => ({
        id: note.id,
        name: note.name,
        slug: note.slug,
        count: noteCounts[String(note.id)] ?? 0,
      }))
      .filter((item) => (item.count ?? 0) > 0)
      .sort((left, right) => {
        const countDiff = (right.count ?? 0) - (left.count ?? 0)
        return countDiff || left.name.localeCompare(right.name, 'vi')
      })

    const facets: FilterFacetGroup[] = [
      ...attributeFacets,
      {
        key: 'note',
        title: 'Nốt hương',
        placeholder: 'Chọn nốt hương',
        emptyMessage: 'Chưa có nốt hương',
        multiple: true,
        description: 'Lọc theo hương đầu, hương giữa hoặc hương cuối.',
        items: noteItems,
      },
    ].filter((facet) => facet.items.length > 0)

    return {
      brands,
      categories,
      facets,
    }
  },
  ['mfparis-product-filter-options-v9-collapsed'],
  {
    revalidate: 300,
    tags: [
      PRODUCTS_CACHE_TAG,
      BRANDS_CACHE_TAG,
      CATEGORIES_CACHE_TAG,
      ATTRIBUTES_CACHE_TAG,
      'attribute-values',
      'fragrance-notes',
      'product-filter-groups',
    ],
  },
)
