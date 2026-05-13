import { FieldHook } from 'payload'
import { formatSlug } from '../utilities/formatSlug'

export const beforeChangeSlug: FieldHook = ({ operation, value, data, originalDoc }) => {
  // 1. Nếu người dùng đang tự gõ vào ô Slug, hãy lấy giá trị đó và format lại cho chuẩn
  if (typeof value === 'string' && value.length > 0 && value !== originalDoc?.slug) {
    return formatSlug(value)
  }

  // 2. Nếu tên (title) thay đổi, tự động tạo slug mới từ tên
  if (data?.title) {
    return formatSlug(data.title)
  }

  return value
}
