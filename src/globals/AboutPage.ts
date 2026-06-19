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
        /*
         * Video được dùng cho StoreIntro
         * ở cuối trang chủ.
         */
        {
          name: 'videoUrl',
          type: 'text',
          label: 'Link video giới thiệu',

          admin: {
            description:
              'Dán link YouTube, YouTube Shorts, youtu.be hoặc Vimeo. Ví dụ: https://www.youtube.com/watch?v=VIDEO_ID',
          },
        },
        {
          name: 'videoTitle',
          type: 'text',
          label: 'Tiêu đề mô tả video',

          defaultValue:
            'Video giới thiệu Marais de France',

          admin: {
            description:
              'Nội dung này được dùng làm title cho iframe và hỗ trợ khả năng truy cập.',
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
