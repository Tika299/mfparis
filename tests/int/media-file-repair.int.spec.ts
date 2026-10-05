import { describe, expect, it } from 'vitest'

import {
  getImageFamilyStem,
  isExactImageFamilyVariant,
  parseSizeDimensions,
} from '@/scripts/lib/media-file-repair'

describe('media file repair filename matching', () => {
  it('does not confuse a numbered filename with a size prefix', () => {
    expect(
      isExactImageFamilyVariant(
        'xit-khu-mui-roge-cavailles-deodorant-dermato-48h-spray-4.webp',
        'xit-khu-mui-roge-cavailles-deodorant-dermato-48h-spray-414x552.avif',
      ),
    ).toBe(false)
  })

  it('accepts a generated size with the exact main stem', () => {
    expect(
      isExactImageFamilyVariant(
        'xit-khu-mui-roge-cavailles-deodorant-dermato-48h-spray-4.webp',
        'xit-khu-mui-roge-cavailles-deodorant-dermato-48h-spray-4-414x552.avif',
      ),
    ).toBe(true)
  })

  it('accepts an alternate extension only when the stem is exact', () => {
    expect(
      isExactImageFamilyVariant('burberry-london-for-men.webp', 'burberry-london-for-men.jpg'),
    ).toBe(true)
    expect(
      isExactImageFamilyVariant('burberry-london-for-men-4.webp', 'burberry-london-for-men.jpg'),
    ).toBe(false)
  })

  it('parses and removes only a complete dimension suffix', () => {
    expect(parseSizeDimensions('burberry-london-for-men-1024x1024.jpg')).toEqual({
      height: 1024,
      width: 1024,
    })
    expect(getImageFamilyStem('burberry-london-for-men-1024x1024.jpg')).toBe(
      'burberry-london-for-men',
    )
    expect(parseSizeDimensions('burberry-london-for-men-4.webp')).toBeNull()
  })
})
