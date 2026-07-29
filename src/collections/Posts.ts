import { CollectionConfig } from 'payload'
import { beforeChangeSlug } from '../hooks/beforeChangeSlug'
import { htmlEditorField } from '@/collections/fields/htmlEditorField'
import { internalLinkingFields } from '@/collections/fields/internalLinkingFields'


const DEFAULT_BLOG_AUTHOR_DATA = {
  name: 'Marais de France',
  slug: 'mfparis',
  title: 'MF Paris Editorial',
  url: '/author/mfparis/',
  bio: 'Marais de France là đội ngũ yêu thích hương thơm, chia sẻ kinh nghiệm đánh giá nước hoa và mỹ phẩm nhằm giúp khách hàng lựa chọn sản phẩm phù hợp.',
  isDefault: true,
}

function getRelationshipId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    const id = (value as { id?: number | string }).id

    if (typeof id === 'number' || typeof id === 'string') {
      return id
    }
  }

  return null
}

async function findDefaultBlogAuthorId(req: any): Promise<number | string | null> {
  const payload = req?.payload

  if (!payload?.find) {
    return null
  }

  const defaultResult = await payload.find({
    collection: 'blog-authors',
    depth: 0,
    limit: 1,
    pagination: false,
    sort: '-updatedAt',
    where: {
      isDefault: {
        equals: true,
      },
    },
  })

  const defaultId = getRelationshipId(defaultResult?.docs?.[0])

  if (defaultId) {
    return defaultId
  }

  const slugResult = await payload.find({
    collection: 'blog-authors',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      slug: {
        equals: DEFAULT_BLOG_AUTHOR_DATA.slug,
      },
    },
  })

  const slugId = getRelationshipId(slugResult?.docs?.[0])

  if (slugId) {
    return slugId
  }

  if (!payload?.create) {
    return null
  }

  const created = await payload.create({
    collection: 'blog-authors',
    data: DEFAULT_BLOG_AUTHOR_DATA,
    overrideAccess: true,
  })

  return getRelationshipId(created)
}

async function assignDefaultBlogAuthor({ data, originalDoc, req }: any) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const incomingAuthorId = getRelationshipId(data.authorProfile)
  const existingAuthorId = getRelationshipId(originalDoc?.authorProfile)

  if (incomingAuthorId || (data.authorProfile === undefined && existingAuthorId)) {
    return data
  }

  const defaultAuthorId = await findDefaultBlogAuthorId(req)

  if (!defaultAuthorId) {
    return data
  }

  return {
    ...data,
    authorProfile: defaultAuthorId,
  }
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    group: 'Nội dung',
  },
  hooks: {
    beforeValidate: [assignDefaultBlogAuthor],
  },
  fields: [
    internalLinkingFields,
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tiêu đề bài viết',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [beforeChangeSlug],
      },
      admin: {
        position: 'sidebar',
        description:
          'Tự động tạo từ tên, có thể chỉnh sửa thủ công để tối ưu SEO',
      },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Ảnh đại diện bài viết',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'post-categories',
      hasMany: true,
      label: 'Danh mục bài viết',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'authorProfile',
      type: 'relationship',
      relationTo: 'blog-authors',
      label: 'T\u00e1c gi\u1ea3',
      admin: {
        position: 'sidebar',
        description:
          'Chọn tác giả từ Blog Authors. Nếu bỏ trống, hệ thống sẽ tự gán tác giả mặc định.',
      },
    },
    {
      name: 'reviewer',
      type: 'group',
      label: 'Kiểm duyệt nội dung',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Người kiểm duyệt',
          defaultValue: 'Marais de France',
        },
        {
          name: 'title',
          type: 'text',
          label: 'Vai trò',
          defaultValue: 'Content Reviewer',
        },
        {
          name: 'url',
          type: 'text',
          label: 'URL người kiểm duyệt',
          defaultValue: '/about',
        },
        {
          name: 'reviewedAt',
          type: 'date',
          label: 'Ngày kiểm duyệt',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    {
      name: 'viewCount',
      type: 'number',
      label: 'Lượt xem',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'rating',
      type: 'group',
      label: 'Đánh giá bài viết',
      admin: {
        description:
          'Điểm trung bình được cập nhật tự động từ phần đánh giá sao ngoài frontend.',
      },
      fields: [
        {
          name: 'average',
          type: 'number',
          label: 'Điểm trung bình',
          defaultValue: 0,
          min: 0,
          max: 5,
          admin: {
            readOnly: true,
            step: 0.1,
          },
        },
        {
          name: 'count',
          type: 'number',
          label: 'Số lượt đánh giá',
          defaultValue: 0,
          min: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'total',
          type: 'number',
          label: 'Tổng điểm',
          defaultValue: 0,
          min: 0,
          admin: {
            readOnly: true,
            hidden: true,
          },
        },
      ],
    },
    htmlEditorField({
      name: 'content',
      label: 'Nội dung bài viết',
      description:
        'Nội dung bài viết luu dang HTML, co the soan truc quan hoac chinh ma HTML.',
    }),
    {
      name: 'faq',
      type: 'array',
      label: 'FAQ bài viết',
      labels: {
        singular: 'Câu hỏi',
        plural: 'Câu hỏi',
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          label: 'Câu hỏi',
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          label: 'Câu trả lời',
        },
      ],
      admin: {
        description:
          'Các câu hỏi này sẽ hiển thị ở frontend và được xuất vào FAQPage schema.',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Mô tả ngắn',
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Cấu hình SEO',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        {
          name: 'keywords',
          type: 'array',
          label: 'Từ khóa SEO',
          fields: [
            {
              name: 'keyword',
              type: 'text',
              required: true,
              label: 'Từ khóa',
            },
          ],
        },
      ],
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WordPress ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      label: 'URL gốc',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'importNotes',
      type: 'textarea',
      label: 'Ghi chú import post',
      admin: {
        position: 'sidebar',
        rows: 3,
      },
    },
    {
      name: 'internalLinkPreview',
      type: 'ui',
      admin: {
        components: {
          Field: {
            path: '@/components/Admin/InternalLinkPreview#InternalLinkPreview',
            clientProps: {
              collection: 'posts',
            },
          },
        },
      },
    }
  ],
}
