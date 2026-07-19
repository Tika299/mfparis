import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload'

type BlogCommentStatus = 'pending' | 'approved' | 'rejected'

type BlogCommentDocument = {
  id: string | number
  post?: string | number | { id: string | number } | null
  parent?: string | number | { id: string | number } | null
  name?: string | null
  email?: string | null
  comment?: string | null
  status?: BlogCommentStatus | null
  ipAddress?: string | null
  userAgent?: string | null
}

const isStaff: Access = ({ req }) => Boolean(req.user)

const readApprovedOrStaff: Access = ({ req }) => {
  if (req.user) {
    return true
  }

  return {
    status: {
      equals: 'approved',
    },
  }
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.replace(/\s+/g, ' ').trim()

  return trimmed || undefined
}

const prepareBlogCommentBeforeValidate: CollectionBeforeValidateHook<
  BlogCommentDocument
> = async ({ data, operation }) => {
  const nextData = {
    ...data,
    name: trimString(data?.name),
    email: trimString(data?.email)?.toLowerCase(),
    comment: trimString(data?.comment),
  }

  if (operation === 'create') {
    nextData.status = 'pending'
  }

  return nextData
}

export const BlogComments: CollectionConfig = {
  slug: 'blog-comments',
  labels: {
    singular: 'B\u00ecnh lu\u1eadn blog',
    plural: 'B\u00ecnh lu\u1eadn blog',
  },
  admin: {
    useAsTitle: 'comment',
    defaultColumns: [
      'post',
      'name',
      'email',
      'status',
      'createdAt',
    ],
    group: 'N\u1ed9i dung',
    description:
      'Duy\u1ec7t b\u00ecnh lu\u1eadn b\u00e0i vi\u1ebft tr\u01b0\u1edbc khi hi\u1ec3n th\u1ecb c\u00f4ng khai tr\u00ean frontend.',
  },
  defaultSort: '-createdAt',
  access: {
    read: readApprovedOrStaff,
    create: () => true,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeValidate: [prepareBlogCommentBeforeValidate],
  },
  fields: [
    {
      name: 'post',
      label: 'B\u00e0i vi\u1ebft',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      index: true,
      admin: {
        allowCreate: false,
      },
    },
    {
      name: 'parent',
      label: 'B\u00ecnh lu\u1eadn cha',
      type: 'relationship',
      relationTo: 'blog-comments',
      index: true,
      admin: {
        position: 'sidebar',
        allowCreate: false,
        description:
          'D\u00f9ng khi \u0111\u00e2y l\u00e0 ph\u1ea3n h\u1ed3i cho m\u1ed9t b\u00ecnh lu\u1eadn kh\u00e1c.',
      },
    },
    {
      name: 'name',
      label: 'T\u00ean ng\u01b0\u1eddi b\u00ecnh lu\u1eadn',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      index: true,
      admin: {
        description:
          'Email d\u00f9ng \u0111\u1ec3 ki\u1ec3m tra n\u1ed9i b\u1ed9, kh\u00f4ng hi\u1ec3n th\u1ecb c\u00f4ng khai.',
      },
    },
    {
      name: 'comment',
      label: 'N\u1ed9i dung b\u00ecnh lu\u1eadn',
      type: 'textarea',
      required: true,
      maxLength: 2000,
    },
    {
      name: 'status',
      label: 'Tr\u1ea1ng th\u00e1i duy\u1ec7t',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        {
          label: 'Ch\u1edd duy\u1ec7t',
          value: 'pending',
        },
        {
          label: '\u0110\u00e3 duy\u1ec7t',
          value: 'approved',
        },
        {
          label: 'T\u1eeb ch\u1ed1i',
          value: 'rejected',
        },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Ch\u1ec9 b\u00ecnh lu\u1eadn \u0111\u00e3 duy\u1ec7t m\u1edbi \u0111\u01b0\u1ee3c hi\u1ec3n th\u1ecb tr\u00ean frontend.',
      },
    },
    {
      name: 'ipAddress',
      label: 'IP g\u1eedi',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'userAgent',
      label: 'Thi\u1ebft b\u1ecb / tr\u00ecnh duy\u1ec7t',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
  ],
}
