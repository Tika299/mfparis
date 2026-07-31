import { FieldHook } from 'payload'
import { formatSlug } from '../utilities/formatSlug'

export const beforeChangeSlug: FieldHook = ({ operation, value, data, originalDoc }) => {
  const currentValue = typeof value === 'string' ? value.trim() : ''
  const originalSlug =
    typeof originalDoc?.slug === 'string' ? originalDoc.slug.trim() : ''

  if (operation === 'update' && originalSlug) {
    if (!currentValue || currentValue === originalSlug) {
      return formatSlug(originalSlug)
    }

    const titleSlug =
      typeof data?.title === 'string' && data.title.trim()
        ? formatSlug(data.title)
        : ''

    if (titleSlug && currentValue === titleSlug && originalSlug !== titleSlug) {
      return formatSlug(originalSlug)
    }

    return formatSlug(currentValue)
  }

  if (currentValue) {
    return formatSlug(currentValue)
  }

  if (typeof data?.title === 'string' && data.title.trim()) {
    return formatSlug(data.title)
  }

  return value
}
