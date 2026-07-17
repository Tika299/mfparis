import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

import type { FilterFacetGroup, FilterItem } from '@/components/search-filters/search-filters.types'

const PRODUCTS_CACHE_TAG = 'products'
const BRANDS_CACHE_TAG = 'brands'
const CATEGORIES_CACHE_TAG = 'categories'
const ATTRIBUTES_CACHE_TAG = 'attributes'

const MAX_DYNAMIC_FACET_VALUES = 18

type RelationshipID = string | number
type FacetCountMap = Record<string, number>

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

export const getProductFilterOptions = unstable_cache(
  async (): Promise<{
    brands: FilterItem[]
    categories: FilterItem[]
    facets: FilterFacetGroup[]
  }> => {
    const payload = await getPayload({
      config: configPromise,
    })

    const [
      brandsResult,
      categoriesResult,
      attributesResult,
      attributeValuesResult,
      fragranceNotesResult,
      productRelationsResult,
    ] = await Promise.all([
      payload.find({
        collection: 'brands',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'name',
      }),
      payload.find({
        collection: 'categories',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'name',
      }),
      payload.find({
        collection: 'attributes',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'sortOrder',
        where: {
          and: [
            { isActive: { equals: true } },
            { filterable: { equals: true } },
          ],
        },
      }),
      payload.find({
        collection: 'attribute-values',
        depth: 1,
        pagination: false,
        overrideAccess: true,
        sort: 'sortOrder',
        where: {
          isActive: {
            equals: true,
          },
        },
      }),
      payload.find({
        collection: 'fragrance-notes',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'name',
        where: {
          isActive: {
            equals: true,
          },
        },
      }),
      payload.find({
        collection: 'products',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        where: {
          status: {
            equals: 'published',
          },
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

    const brands: FilterItem[] = brandsResult.docs.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      count: brandCounts[String(brand.id)] ?? 0,
    }))

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

    const attributeFacets: FilterFacetGroup[] = attributesResult.docs
      .map((attribute) => {
        const items = (attributeValuesByAttribute.get(String(attribute.id)) ?? [])
          .sort((left, right) => {
            const countDiff = (right.count ?? 0) - (left.count ?? 0)
            return countDiff || left.name.localeCompare(right.name, 'vi')
          })
          .slice(0, MAX_DYNAMIC_FACET_VALUES)

        return {
          key: `attr_${attribute.slug}`,
          title: attribute.name,
          placeholder: `Chọn ${attribute.name.toLocaleLowerCase('vi')}`,
          emptyMessage: `Chưa có ${attribute.name.toLocaleLowerCase('vi')}`,
          multiple: attribute.allowsMultiple !== false,
          description: attribute.description || undefined,
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
      .slice(0, MAX_DYNAMIC_FACET_VALUES)

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
  ['mfparis-product-filter-options-v4'],
  {
    revalidate: 300,
    tags: [
      PRODUCTS_CACHE_TAG,
      BRANDS_CACHE_TAG,
      CATEGORIES_CACHE_TAG,
      ATTRIBUTES_CACHE_TAG,
    ],
  },
)
