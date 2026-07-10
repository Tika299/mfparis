import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

type EntityID = string | number

type AttributeValueType =
  | 'select'
  | 'multi_select'
  | 'number'
  | 'range'
  | 'boolean'
  | 'text'

type AttributeScope =
  | 'general'
  | 'fragrance'
  | 'beauty'

type AttributeDocument = {
  id: EntityID
  name?: string | null
  slug?: string | null
  scope?: AttributeScope | null
  valueType?: AttributeValueType | null
  unit?: string | null
  filterable?: boolean | null
  comparable?: boolean | null
  variantOption?: boolean | null
  allowsMultiple?: boolean | null
  validation?: {
    min?: number | null
    max?: number | null
    step?: number | null
  } | null
}

const STAFF_ROLES = new Set(['admin', 'manager', 'editor'])

const STAFF_EMAILS = new Set(
  (process.env.PAYLOAD_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasStaffRole(value: unknown): boolean {
  if (typeof value === 'string') {
    return STAFF_ROLES.has(value)
  }

  if (Array.isArray(value)) {
    return value.some(
      (role) => typeof role === 'string' && STAFF_ROLES.has(role),
    )
  }

  return false
}

function isStaff(user: unknown): boolean {
  if (!isRecord(user)) {
    return false
  }

  if (hasStaffRole(user.role) || hasStaffRole(user.roles)) {
    return true
  }

  const email =
    typeof user.email === 'string'
      ? user.email.trim().toLowerCase()
      : undefined

  return Boolean(email && STAFF_EMAILS.has(email))
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const staffOnly: Access = ({ req }) => isStaff(req.user)

const normalizeAttribute: CollectionBeforeValidateHook<
  AttributeDocument
> = ({ data, originalDoc }) => {
  const nextData: Partial<AttributeDocument> = {
    ...(data ?? {}),
  }

  const name =
    typeof nextData.name === 'string'
      ? nextData.name.trim().replace(/\s+/g, ' ')
      : typeof originalDoc?.name === 'string'
        ? originalDoc.name.trim().replace(/\s+/g, ' ')
        : ''

  if (!name) {
    throw new APIError(
      'Tên thuộc tính là bắt buộc.',
      400,
    )
  }

  const sourceSlug =
    typeof nextData.slug === 'string' &&
      nextData.slug.trim().length > 0
      ? nextData.slug
      : name

  nextData.name = name
  nextData.slug = slugify(sourceSlug)

  if (!nextData.slug) {
    throw new APIError(
      'Không thể tạo slug hợp lệ cho thuộc tính.',
      400,
    )
  }

  return nextData
}

const enforceAttributeRules: CollectionBeforeChangeHook<
  AttributeDocument
> = ({ data, originalDoc }) => {
  const nextData: Partial<AttributeDocument> = {
    ...(data ?? {}),
  }

  const valueType =
    nextData.valueType ??
    originalDoc?.valueType ??
    'select'

  const variantOption =
    nextData.variantOption ??
    originalDoc?.variantOption ??
    false

  if (valueType === 'boolean') {
    nextData.allowsMultiple = false
  }

  if (valueType === 'number' || valueType === 'range') {
    const validation = {
      ...(originalDoc?.validation ?? {}),
      ...(nextData.validation ?? {}),
    }

    const min =
      typeof validation.min === 'number'
        ? validation.min
        : undefined
    const max =
      typeof validation.max === 'number'
        ? validation.max
        : undefined
    const step =
      typeof validation.step === 'number'
        ? validation.step
        : undefined

    if (
      min !== undefined &&
      max !== undefined &&
      min > max
    ) {
      throw new APIError(
        'Giá trị min không được lớn hơn max.',
        400,
      )
    }

    if (step !== undefined && step <= 0) {
      throw new APIError(
        'Bước nhảy phải lớn hơn 0.',
        400,
      )
    }
  } else {
    nextData.validation = {
      min: null,
      max: null,
      step: null,
    }
  }

  if (variantOption) {
    if (
      valueType !== 'select' &&
      valueType !== 'multi_select'
    ) {
      throw new APIError(
        'Thuộc tính biến thể phải có kiểu select hoặc multi_select.',
        400,
      )
    }

    nextData.filterable = true
  }

  return nextData
}

export const Attributes: CollectionConfig = {
  slug: 'attributes',

  defaultSort: 'sortOrder',

  labels: {
    singular: 'Thuộc tính sản phẩm',
    plural: 'Thuộc tính sản phẩm',
  },

  admin: {
    useAsTitle: 'name',
    group: 'Kinh doanh',
    defaultColumns: [
      'name',
      'scope',
      'valueType',
      'filterable',
      'variantOption',
      'sortOrder',
    ],
    description:
      'Định nghĩa các thuộc tính có cấu trúc như nhóm hương, độ lưu hương, loại da và dung tích.',
  },

  access: {
    read: () => true,
    create: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },

  hooks: {
    beforeValidate: [normalizeAttribute],
    beforeChange: [enforceAttributeRules],
  },

  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Tên thuộc tính',
          maxLength: 100,
          admin: {
            width: '60%',
            placeholder: 'Ví dụ: Nhóm hương',
          },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Slug',
          maxLength: 120,
          admin: {
            width: '40%',
            description:
              'Khóa ổn định dùng cho API và URL bộ lọc.',
          },
        },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Mô tả',
      admin: {
        rows: 3,
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'scope',
          type: 'select',
          required: true,
          defaultValue: 'general',
          label: 'Phạm vi',
          options: [
            {
              label: 'Dùng chung',
              value: 'general',
            },
            {
              label: 'Nước hoa',
              value: 'fragrance',
            },
            {
              label: 'Mỹ phẩm',
              value: 'beauty',
            },
          ],
          admin: {
            width: '50%',
          },
        },
        {
          name: 'valueType',
          type: 'select',
          required: true,
          defaultValue: 'select',
          label: 'Kiểu giá trị',
          options: [
            {
              label: 'Chọn một giá trị',
              value: 'select',
            },
            {
              label: 'Chọn nhiều giá trị',
              value: 'multi_select',
            },
            {
              label: 'Số',
              value: 'number',
            },
            {
              label: 'Khoảng số',
              value: 'range',
            },
            {
              label: 'Đúng / Sai',
              value: 'boolean',
            },
            {
              label: 'Văn bản',
              value: 'text',
            },
          ],
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'unit',
          type: 'text',
          label: 'Đơn vị',
          maxLength: 30,
          admin: {
            width: '50%',
            placeholder: 'ml, giờ, điểm...',
          },
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
          label: 'Thứ tự hiển thị',
          admin: {
            width: '50%',
            step: 1,
          },
        },
      ],
    },
    {
      name: 'applicableCategories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Danh mục áp dụng',
      admin: {
        description:
          'Để trống nếu thuộc tính có thể áp dụng cho mọi danh mục.',
      },
    },
    {
      name: 'filterable',
      type: 'checkbox',
      defaultValue: true,
      label: 'Dùng làm bộ lọc',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'comparable',
      type: 'checkbox',
      defaultValue: true,
      label: 'Dùng để so sánh',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'variantOption',
      type: 'checkbox',
      defaultValue: false,
      label: 'Là tùy chọn biến thể',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'allowsMultiple',
      type: 'checkbox',
      defaultValue: false,
      label: 'Cho phép nhiều giá trị',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'displayStyle',
      type: 'select',
      defaultValue: 'checkbox',
      label: 'Kiểu hiển thị bộ lọc',
      options: [
        {
          label: 'Checkbox',
          value: 'checkbox',
        },
        {
          label: 'Radio',
          value: 'radio',
        },
        {
          label: 'Dropdown',
          value: 'dropdown',
        },
        {
          label: 'Chips',
          value: 'chips',
        },
        {
          label: 'Range slider',
          value: 'range',
        },
        {
          label: 'Color swatch',
          value: 'color',
        },
      ],
    },
    {
      name: 'validation',
      type: 'group',
      label: 'Ràng buộc số',
      admin: {
        condition: (_, siblingData) =>
          siblingData?.valueType === 'number' ||
          siblingData?.valueType === 'range',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'min',
              type: 'number',
              label: 'Nhỏ nhất',
              admin: {
                width: '33.33%',
              },
            },
            {
              name: 'max',
              type: 'number',
              label: 'Lớn nhất',
              admin: {
                width: '33.33%',
              },
            },
            {
              name: 'step',
              type: 'number',
              label: 'Bước nhảy',
              defaultValue: 1,
              admin: {
                width: '33.33%',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: 'Đang sử dụng',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'wooAttributeId',
      type: 'number',
      unique: true,
      index: true,
      label: 'WooCommerce attribute ID',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'wooTaxonomySlug',
      type: 'text',
      index: true,
      label: 'WooCommerce taxonomy slug',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Vi du: pa_dung-tich, pa_nhom-huong.',
      },
    }
  ],
}
