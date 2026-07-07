import { GlobalConfig } from 'payload'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Trang Gioi thieu',
  admin: {
    group: 'Noi dung',
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', label: 'Tieu de lon' },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Anh Hero (16:9)',
        },
      ],
    },
    {
      name: 'story',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', label: 'Tieu de cau chuyen' },
        htmlEditorField({
          name: 'content',
          label: 'Noi dung ke chuyen',
          rows: 20,
        }),
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Anh minh hoa cau chuyen',
        },
        {
          name: 'videoUrl',
          type: 'text',
          label: 'Link video gioi thieu',
          admin: {
            description:
              'Dan link YouTube, YouTube Shorts, youtu.be hoac Vimeo.',
          },
        },
        {
          name: 'videoTitle',
          type: 'text',
          label: 'Tieu de mo ta video',
          defaultValue: 'Video gioi thieu Marais de France',
          admin: {
            description:
              'Noi dung nay duoc dung lam title cho iframe va ho tro kha nang truy cap.',
          },
        },
      ],
    },
    {
      name: 'values',
      type: 'array',
      label: 'Gia tri cot loi',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}
