import { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Trang Giới thiệu',
  admin: {
    group: 'Nội dung',
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', label: 'Tiêu đề lớn' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh Hero (16:9)' },
      ],
    },
    {
      name: 'story',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', label: 'Tiêu đề câu chuyện' },
        { name: 'content', type: 'richText', label: 'Nội dung kể chuyện' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh minh họa câu chuyện' },
      ],
    },
    {
      name: 'values',
      type: 'array',
      label: 'Giá trị cốt lõi',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}
