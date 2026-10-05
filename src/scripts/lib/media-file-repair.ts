import path from 'path'

const sizeSuffixPattern = /-(\d+)x(\d+)$/i

export type ImageDimensions = {
  height: number
  width: number
}

export function getFilenameParts(filename: string) {
  const basename = path.basename(String(filename || '').replace(/\\/g, '/'))
  const extension = path.extname(basename)
  const stem = extension ? basename.slice(0, -extension.length) : basename

  return {
    basename,
    extension,
    stem,
  }
}

export function parseSizeDimensions(filename: string): ImageDimensions | null {
  const { stem } = getFilenameParts(filename)
  const match = stem.match(sizeSuffixPattern)

  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return { height, width }
}

export function getImageFamilyStem(filename: string): string {
  const { stem } = getFilenameParts(filename)
  return stem.replace(sizeSuffixPattern, '')
}

/**
 * A generated size belongs to a main file only when removing its complete
 * `-WIDTHxHEIGHT` suffix produces the exact main stem. This intentionally does
 * not use a loose prefix check: `product-414x552.avif` is not a variant of
 * `product-4.webp`.
 */
export function isExactImageFamilyVariant(
  mainFilename: string,
  candidateFilename: string,
): boolean {
  const mainStem = getFilenameParts(mainFilename).stem
  const candidate = getFilenameParts(candidateFilename)

  if (!mainStem || !candidate.stem || candidate.basename === path.basename(mainFilename)) {
    return false
  }

  if (candidate.stem === mainStem) {
    return true
  }

  const dimensions = parseSizeDimensions(candidateFilename)

  return Boolean(dimensions && getImageFamilyStem(candidateFilename) === mainStem)
}

export function parseSizeArea(filename: string): number {
  const dimensions = parseSizeDimensions(filename)
  return dimensions ? dimensions.width * dimensions.height : 0
}
