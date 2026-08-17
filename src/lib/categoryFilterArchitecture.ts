import type { CoreFilterKey } from '@/components/search-filters/search-filters.types'

type CategoryFilterPreset =
  | 'auto'
  | 'fragrance'
  | 'skincare'
  | 'makeup'
  | 'health'
  | 'hair'
  | 'body'
  | 'minimal'
  | 'custom'

type CategoryFilterProfile = {
  preset?: CategoryFilterPreset | null
  inheritParentProfile?: boolean | null
  coreFilters?: Partial<Record<CoreFilterKey, boolean | null>> | null
  showFragranceNotes?: boolean | null
  facetKeys?: Array<{
    key?: string | null
  }> | null
}

type CategoryLike = {
  name?: string | null
  slug?: string | null
  filterProfile?: CategoryFilterProfile | null
  parent?: CategoryLike | string | number | null
}

export type CategoryFilterArchitecture = {
  coreFilters: CoreFilterKey[]
  facetKeys: string[]
  preset: CategoryFilterPreset
}

const DEFAULT_CORE_FILTERS: CoreFilterKey[] = [
  'brand',
  'category',
  'price',
  'availability',
  'sale',
  'rating',
]

const PRESET_FACET_KEYS: Record<Exclude<CategoryFilterPreset, 'auto' | 'custom'>, string[]> = {
  fragrance: [
    'attr_nhom-huong',
    'attr_nong-do',
    'attr_do-luu-huong',
    'attr_do-toa-huong',
    'attr_dung-tich',
    'attr_gioi-tinh',
    'attr_phong-cach',
    'attr_mua',
    'note',
  ],
  skincare: [
    'attr_loai-da',
    'attr_van-de-da',
    'attr_thanh-phan',
    'attr_ket-cau',
    'attr_thoi-diem-su-dung',
    'attr_spf',
    'attr_dung-tich',
    'attr_do-tuoi',
  ],
  makeup: [
    'attr_tong-mau',
    'attr_mau',
    'attr_undertone',
    'attr_finish',
    'attr_do-che-phu',
    'attr_chong-nuoc',
    'attr_loai-da',
  ],
  health: [
    'attr_nhu-cau-suc-khoe',
    'attr_thanh-phan',
    'attr_doi-tuong',
    'attr_dang-dung',
    'attr_lieu-trinh',
    'attr_xuat-xu',
    'attr_chung-nhan',
  ],
  hair: [
    'attr_loai-toc',
    'attr_van-de-toc',
    'attr_thanh-phan',
    'attr_khong-chua',
    'attr_dung-tich',
  ],
  body: [
    'attr_van-de-body',
    'attr_mui-huong',
    'attr_ket-cau',
    'attr_loai-da',
    'attr_vung-dung',
    'attr_dung-tich',
  ],
  minimal: [],
}

const PRESET_KEYWORDS: Array<{
  preset: Exclude<CategoryFilterPreset, 'auto' | 'custom'>
  keywords: string[]
}> = [
  {
    preset: 'fragrance',
    keywords: [
      'nuoc hoa',
      'perfume',
      'fragrance',
      'parfum',
      'mui huong',
    ],
  },
  {
    preset: 'skincare',
    keywords: [
      'skincare',
      'duong da',
      'cham soc da',
      'duoc my pham',
      'serum',
      'kem duong',
      'sua rua mat',
      'chong nang',
      'tri mun',
    ],
  },
  {
    preset: 'makeup',
    keywords: [
      'makeup',
      'trang diem',
      'son',
      'phan',
      'mascara',
      'eyeliner',
      'che khuyet diem',
    ],
  },
  {
    preset: 'health',
    keywords: [
      'suc khoe',
      'thuc pham chuc nang',
      'vitamin',
      'omega',
      'collagen',
      'canxi',
      'xuong khop',
      'tieu hoa',
    ],
  },
  {
    preset: 'hair',
    keywords: [
      'toc',
      'dau goi',
      'dau xa',
      'hair',
      'scalp',
    ],
  },
  {
    preset: 'body',
    keywords: [
      'body',
      'co the',
      'duong the',
      'sua tam',
      'tay te bao chet',
    ],
  },
]

function normalizeText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
}

function unique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function getParentCategory(category: CategoryLike): CategoryLike | null {
  const parent = category.parent

  return parent && typeof parent === 'object' ? parent : null
}

function hasCustomFacetKeys(profile?: CategoryFilterProfile | null): boolean {
  return Boolean(profile?.facetKeys?.some((facet) => facet.key?.trim()))
}

function shouldInheritParentProfile(profile?: CategoryFilterProfile | null): boolean {
  return (
    profile?.inheritParentProfile !== false &&
    !hasCustomFacetKeys(profile) &&
    (!profile?.preset || profile.preset === 'auto')
  )
}

function getEffectiveProfile(category: CategoryLike): CategoryFilterProfile {
  const profile = category.filterProfile ?? {}
  const parent = getParentCategory(category)

  if (parent && shouldInheritParentProfile(profile)) {
    const parentProfile = getEffectiveProfile(parent)

    if (parentProfile.preset || hasCustomFacetKeys(parentProfile)) {
      return parentProfile
    }
  }

  return profile
}

function inferPreset(category: CategoryLike): Exclude<CategoryFilterPreset, 'auto' | 'custom'> {
  const searchableText = normalizeText(`${category.name || ''} ${category.slug || ''}`)

  for (const candidate of PRESET_KEYWORDS) {
    if (candidate.keywords.some((keyword) => searchableText.includes(keyword))) {
      return candidate.preset
    }
  }

  return 'minimal'
}

function resolveCoreFilters(profile: CategoryFilterProfile): CoreFilterKey[] {
  const coreFilters = profile.coreFilters ?? {}

  return DEFAULT_CORE_FILTERS.filter((key) => coreFilters[key] !== false)
}

function resolveFacetKeys(
  category: CategoryLike,
  profile: CategoryFilterProfile,
  preset: CategoryFilterPreset,
): string[] {
  const customFacetKeys = unique(
    (profile.facetKeys ?? []).map((facet) => facet.key ?? ''),
  )

  if (customFacetKeys.length > 0 || preset === 'custom') {
    return unique([
      ...customFacetKeys,
      profile.showFragranceNotes ? 'note' : '',
    ])
  }

  const resolvedPreset = preset === 'auto' ? inferPreset(category) : preset

  return unique([
    ...PRESET_FACET_KEYS[resolvedPreset],
    profile.showFragranceNotes ? 'note' : '',
  ])
}

export function resolveCategoryFilterArchitecture(
  category: CategoryLike,
): CategoryFilterArchitecture {
  const profile = getEffectiveProfile(category)
  const preset = profile.preset || 'auto'

  return {
    coreFilters: resolveCoreFilters(profile),
    facetKeys: resolveFacetKeys(category, profile, preset),
    preset,
  }
}
