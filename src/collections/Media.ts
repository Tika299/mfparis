import type { CollectionConfig } from 'payload'
import fs from 'fs/promises'
import path from 'path'

const mediaStaticDir =
  process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media')

type UploadSize = {
  filename?: string | null
  url?: string | null
  [key: string]: unknown
}

type UploadDoc = {
  filename?: string | null
  thumbnailURL?: string | null
  sizes?: Record<string, UploadSize | null | undefined> | null
}

function slugifyFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function getFilenameParts(filename: string) {
  const extension = path.extname(filename)
  const stem = extension ? filename.slice(0, -extension.length) : filename

  return {
    extension,
    stem,
  }
}

function normalizeEditableFilename(input: unknown, currentFilename: string): string {
  const raw = String(input || '').trim()
  const { extension: currentExtension } = getFilenameParts(currentFilename)

  if (!raw) {
    return currentFilename
  }

  const inputName = path.basename(raw.replace(/\\/g, '/'))
  const inputExtension = path.extname(inputName)
  const rawStem = inputExtension ? inputName.slice(0, -inputExtension.length) : inputName
  const safeStem = slugifyFilenamePart(rawStem) || 'media'
  const safeExtension = (inputExtension || currentExtension || '.webp').toLowerCase()

  return `${safeStem}${safeExtension}`
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function getUniqueFilename(filename: string, currentFilename?: string | null) {
  const { extension, stem } = getFilenameParts(filename)
  let candidate = filename
  let count = 2

  while (
    candidate !== currentFilename &&
    (await pathExists(path.join(mediaStaticDir, candidate)))
  ) {
    candidate = `${stem}-${count}${extension}`
    count += 1
  }

  return candidate
}

function getFileUrl(filename: string): string {
  return `/api/media/file/${encodeURIComponent(filename)}`
}

function getRenamedSizeFilename(
  currentSizeFilename: string,
  currentMainFilename: string,
  nextMainFilename: string,
): string {
  const currentMain = getFilenameParts(currentMainFilename)
  const nextMain = getFilenameParts(nextMainFilename)
  const currentSize = getFilenameParts(currentSizeFilename)

  if (currentSize.stem.startsWith(currentMain.stem)) {
    return `${nextMain.stem}${currentSize.stem.slice(currentMain.stem.length)}${currentSize.extension}`
  }

  return `${nextMain.stem}-${slugifyFilenamePart(currentSize.stem)}${currentSize.extension}`
}

async function copyStoredFileToNewName(currentFilename: string, nextFilename: string) {
  if (!currentFilename || !nextFilename || currentFilename === nextFilename) {
    return
  }

  const from = path.join(mediaStaticDir, currentFilename)
  const to = path.join(mediaStaticDir, nextFilename)

  if (!(await pathExists(from))) {
    return
  }

  await fs.copyFile(from, to)
}

async function renameMediaFiles({
  data,
  originalDoc,
}: {
  data: Record<string, unknown>
  originalDoc?: UploadDoc | null
}) {
  const currentFilename = originalDoc?.filename

  if (!currentFilename) {
    return data
  }

  const requestedFilename = normalizeEditableFilename(data.fileName, currentFilename)
  const nextFilename = await getUniqueFilename(requestedFilename, currentFilename)

  if (nextFilename === currentFilename) {
    return {
      ...data,
      fileName: currentFilename,
    }
  }

  await copyStoredFileToNewName(currentFilename, nextFilename)

  const nextSizes: Record<string, UploadSize | null | undefined> = {
    ...(originalDoc?.sizes || {}),
  }

  for (const [sizeName, size] of Object.entries(nextSizes)) {
    if (!size?.filename) {
      continue
    }

    const nextSizeFilename = await getUniqueFilename(
      getRenamedSizeFilename(size.filename, currentFilename, nextFilename),
      size.filename,
    )

    await copyStoredFileToNewName(size.filename, nextSizeFilename)

    nextSizes[sizeName] = {
      ...size,
      filename: nextSizeFilename,
      url: getFileUrl(nextSizeFilename),
    }
  }

  const thumbnailFilename = nextSizes.thumbnail?.filename

  return {
    ...data,
    fileName: nextFilename,
    filename: nextFilename,
    url: getFileUrl(nextFilename),
    thumbnailURL: thumbnailFilename
      ? getFileUrl(thumbnailFilename)
      : originalDoc?.thumbnailURL,
    sizes: nextSizes,
  }
}

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    beforeChange: [renameMediaFiles],
  },

  upload: {
    // Local: ./media
    // Production Coolify: /app/media
    staticDir: mediaStaticDir,

    formatOptions: {
      format: 'webp',
      options: {
        quality: 82,
      },
    },

    imageSizes: [
      {
        name: 'thumbnail',
        width: 160,
        height: 160,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'blogCard',
        width: 960,
        height: 540,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'heroMobile',
        width: 414,
        height: 552,
        position: 'centre',
        formatOptions: {
          format: 'avif',
        },
      },
      {
        name: 'heroTablet',
        width: 1024,
        height: 1024,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'heroDesktop',
        width: 1920,
        height: 800,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      },
    ],

    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },

  access: {
    read: () => true,
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Mô tả hình ảnh (SEO)',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Ten hien thi',
      admin: {
        description:
          'Tên để quản trị tìm kiếm media. Đổi tên này sẽ cập nhật ở các nội dung dùng relationship media.',
      },
    },
    {
      name: 'fileName',
      type: 'text',
      label: 'Tên file URL',
      admin: {
        position: 'sidebar',
        description:
          'Đổi phần tên file trong URL ảnh, ví dụ ten-anh-moi.webp. Nếu không nhập đuôi file, hệ thống giữ đuôi hiện tại.',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Chu thich anh',
      admin: {
        rows: 3,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Mô tả ảnh',
      admin: {
        rows: 4,
        description:
          'Mô tả nội dung/hậu trường của ảnh, tương tự trường Description trong WordPress Media.',
      },
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WordPress media ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      index: true,
      label: 'URL anh goc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceFilename',
      type: 'text',
      index: true,
      label: 'Ten file goc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'importedFrom',
      type: 'select',
      label: 'Nguon import',
      defaultValue: 'manual',
      options: [
        { label: 'Nhap tay', value: 'manual' },
        { label: 'WordPress', value: 'wordpress' },
        { label: 'WooCommerce', value: 'woocommerce' },
      ],
      admin: {
        position: 'sidebar',
      },
    }
  ],
}
