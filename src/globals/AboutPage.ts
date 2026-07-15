import { GlobalConfig } from 'payload'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'

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
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Ảnh Hero (16:9)',
        },
      ],
    },
    {
      name: 'story',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', label: 'Tiêu đề câu chuyện' },
        htmlEditorField({
          name: 'content',
          label: 'Nội dung ke chuyen',
          rows: 20,
        }),
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Ảnh minh họa câu chuyện',
        },
        {
          name: 'videoUrl',
          type: 'text',
          label: 'Link video giới thiệu',
          admin: {
            description:
              'Dán link YouTube, YouTube Shorts, youtu.be hoặc Vimeo.',
          },
        },
        {
          name: 'videoTitle',
          type: 'text',
          label: 'Tiêu đề mô tả video',
          defaultValue: 'Video giới thiệu Marais de France',
          admin: {
            description:
              'Nội dung nay duoc dung lam title cho iframe va ho tro kha nang truy cap.',
          },
        },
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
