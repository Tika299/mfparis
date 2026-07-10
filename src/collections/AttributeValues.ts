import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

type EntityID = string | number

type RelationshipValue =
  | EntityID
  | {
    id: EntityID
  }

type AttributeValueType =
  | 'select'
  | 'multi_select'
  | 'number'
  | 'range'
  | 'boolean'
  | 'text'

type AttributeValueDocument = {
  id: EntityID
  attribute?: RelationshipValue | null
  label?: string | null
  slug?: string | null
  numericValue?: number | null
  booleanValue?: boolean | null
  aliases?: Array<{
    alias?: string | null
  }> | null
}

type AttributeSnapshot = {
  id: EntityID
  name?: string
  valueType: AttributeValueType
  validation?: {
    min?: number
    max?: number
    step?: number
  }
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

function relationshipID(value: unknown): EntityID | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (!isRecord(value)) {
    return undefined
  }

  const id = value.id

  return typeof id === 'string' || typeof id === 'number'
    ? id
    : undefined
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined
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

function toAttributeSnapshot(value: unknown): AttributeSnapshot {
  if (!isRecord(value)) {
    throw new APIError(
      'Dữ liệu Attribute không hợp lệ.',
      500,
    )
  }

  const id = relationshipID(value)

  if (id === undefined) {
    throw new APIError(
      'Không xác định được ID Attribute.',
      500,
    )
  }

  const acceptedTypes = new Set<AttributeValueType>([
    'select',
    'multi_select',
    'number',
    'range',
    'boolean',
    'text',
  ])

  const valueType =
    typeof value.valueType === 'string' &&
      acceptedTypes.has(value.valueType as AttributeValueType)
      ? (value.valueType as AttributeValueType)
      : 'select'

  const validation = isRecord(value.validation)
    ? {
      min: finiteNumber(value.validation.min),
      max: finiteNumber(value.validation.max),
      step: finiteNumber(value.validation.step),
    }
    : undefined

  return {
    id,
    name:
      typeof value.name === 'string'
        ? value.name
        : undefined,
    valueType,
    validation,
  }
}

const staffOnly: Access = ({ req }) => isStaff(req.user)

const normalizeValue: CollectionBeforeValidateHook<
  AttributeValueDocument
> = ({ data, originalDoc }) => {
  const nextData: Partial<AttributeValueDocument> = {
    ...(data ?? {}),
  }

  const label =
    typeof nextData.label === 'string'
      ? nextData.label.trim().replace(/\s+/g, ' ')
      : typeof originalDoc?.label === 'string'
        ? originalDoc.label.trim().replace(/\s+/g, ' ')
        : ''

  if (!label) {
    throw new APIError(
      'Tên giá trị thuộc tính là bắt buộc.',
      400,
    )
  }

  const sourceSlug =
    typeof nextData.slug === 'string' &&
      nextData.slug.trim().length > 0
      ? nextData.slug
      : label

  nextData.label = label
  nextData.slug = slugify(sourceSlug)

  if (!nextData.slug) {
    throw new APIError(
      'Không thể tạo slug hợp lệ cho giá trị thuộc tính.',
      400,
    )
  }

  if (Array.isArray(nextData.aliases)) {
    const aliases = Array.from(
      new Set(
        nextData.aliases
          .map((item) =>
            typeof item?.alias === 'string'
              ? item.alias.trim().replace(/\s+/g, ' ')
              : '',
          )
          .filter(Boolean),
      ),
    )

    nextData.aliases = aliases.map((alias) => ({
      alias,
    }))
  }

  return nextData
}

const validateValue: CollectionBeforeChangeHook<
  AttributeValueDocument
> = async ({
  data,
  originalDoc,
  req,
}) => {
    const nextData: Partial<AttributeValueDocument> = {
      ...(data ?? {}),
    }

    const attributeId = relationshipID(
      nextData.attribute ?? originalDoc?.attribute,
    )

    if (attributeId === undefined) {
      throw new APIError(
        'Giá trị phải thuộc về một Attribute.',
        400,
      )
    }

    const attributeDocument = await req.payload.findByID({
      collection: 'attributes',
      id: attributeId,
      depth: 0,
      overrideAccess: true,
    })

    const attribute = toAttributeSnapshot(
      attributeDocument,
    )

    const slug =
      typeof nextData.slug === 'string'
        ? nextData.slug
        : originalDoc?.slug

    if (!slug) {
      throw new APIError(
        'Slug giá trị thuộc tính là bắt buộc.',
        400,
      )
    }

    /*
     * Payload không khai báo unique composite (attribute + slug)
     * trực tiếp qua CollectionConfig, nên kiểm tra bằng hook.
     */
    const duplicateResult = await req.payload.find({
      collection: 'attribute-values',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: {
        and: [
          {
            attribute: {
              equals: attributeId,
            },
          },
          {
            slug: {
              equals: slug,
            },
          },
        ],
      },
    })

    const currentId = relationshipID(originalDoc)
    const duplicateExists = duplicateResult.docs.some(
      (document) => {
        const documentId = relationshipID(document)

        return (
          documentId !== undefined &&
          (currentId === undefined ||
            String(documentId) !== String(currentId))
        )
      },
    )

    if (duplicateExists) {
      throw new APIError(
        `Giá trị "${nextData.label ?? originalDoc?.label ?? slug}" đã tồn tại trong thuộc tính "${attribute.name ?? attributeId}".`,
        409,
      )
    }

    const numericValue = finiteNumber(
      nextData.numericValue ??
      originalDoc?.numericValue,
    )

    if (
      attribute.valueType === 'number' ||
      attribute.valueType === 'range'
    ) {
      if (numericValue === undefined) {
        throw new APIError(
          `Thuộc tính "${attribute.name ?? attributeId}" yêu cầu numericValue.`,
          400,
        )
      }

      const min = attribute.validation?.min
      const max = attribute.validation?.max
      const step = attribute.validation?.step

      if (min !== undefined && numericValue < min) {
        throw new APIError(
          `numericValue không được nhỏ hơn ${min}.`,
          400,
        )
      }

      if (max !== undefined && numericValue > max) {
        throw new APIError(
          `numericValue không được lớn hơn ${max}.`,
          400,
        )
      }

      if (
        min !== undefined &&
        step !== undefined &&
        step > 0
      ) {
        const quotient = (numericValue - min) / step
        const aligned =
          Math.abs(quotient - Math.round(quotient)) <
          Number.EPSILON * 100

        if (!aligned) {
          throw new APIError(
            `numericValue phải theo bước nhảy ${step} tính từ ${min}.`,
            400,
          )
        }
      }

      nextData.numericValue = numericValue
      nextData.booleanValue = null
    } else if (attribute.valueType === 'boolean') {
      nextData.numericValue = null
      nextData.booleanValue =
        typeof nextData.booleanValue === 'boolean'
          ? nextData.booleanValue
          : typeof originalDoc?.booleanValue === 'boolean'
            ? originalDoc.booleanValue
            : false
    } else {
      nextData.numericValue = null
      nextData.booleanValue = null
    }

    return nextData
  }

export const AttributeValues: CollectionConfig = {
  slug: 'attribute-values',

  defaultSort: 'sortOrder',

  labels: {
    singular: 'Giá trị thuộc tính',
    plural: 'Giá trị thuộc tính',
  },

  admin: {
    useAsTitle: 'label',
    group: 'Kinh doanh',
    defaultColumns: [
      'label',
      'attribute',
      'numericValue',
      'sortOrder',
      'isActive',
    ],
    description:
      'Các giá trị chuẩn hóa phục vụ bộ lọc: Floral, Woody, 6 giờ, Da dầu...',
  },

  access: {
    read: () => true,
    create: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },

  hooks: {
    beforeValidate: [normalizeValue],
    beforeChange: [validateValue],
  },

  fields: [
    {
      name: 'attribute',
      type: 'relationship',
      relationTo: 'attributes',
      required: true,
      index: true,
      label: 'Thuộc tính',
      filterOptions: {
        isActive: {
          equals: true,
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Tên hiển thị',
          admin: {
            width: '60%',
            placeholder: 'Ví dụ: Hương gỗ',
          },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          index: true,
          maxLength: 140,
          label: 'Slug',
          admin: {
            width: '40%',
            description:
              'Hook bảo đảm slug không trùng trong cùng một Attribute.',
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
          name: 'numericValue',
          type: 'number',
          label: 'Giá trị số',
          admin: {
            width: '50%',
            description:
              'Dùng cho độ lưu hương, dung tích, chỉ số hoặc range.',
          },
        },
        {
          name: 'booleanValue',
          type: 'checkbox',
          defaultValue: false,
          label: 'Giá trị đúng/sai',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'aliases',
      type: 'array',
      label: 'Từ đồng nghĩa',
      admin: {
        description:
          'Hỗ trợ tìm kiếm/import: woody, gỗ, hương gỗ.',
      },
      fields: [
        {
          name: 'alias',
          type: 'text',
          required: true,
          maxLength: 120,
          label: 'Từ đồng nghĩa',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'colorHex',
          type: 'text',
          maxLength: 7,
          label: 'Mã màu',
          admin: {
            width: '33.33%',
            placeholder: '#B72828',
          },
          validate: (value: unknown) => {
            if (
              value === null ||
              value === undefined ||
              value === ''
            ) {
              return true
            }

            return typeof value === 'string' &&
              /^#[0-9A-Fa-f]{6}$/.test(value)
              ? true
              : 'Mã màu phải có định dạng #RRGGBB.'
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Ảnh minh họa',
          admin: {
            width: '33.33%',
          },
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
          label: 'Thứ tự',
          admin: {
            width: '33.33%',
            step: 1,
          },
        },
      ],
    },
    {
      name: 'metadata',
      type: 'array',
      label: 'Metadata mở rộng',
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          label: 'Khóa',
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Giá trị',
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
      name: 'wooTermId',
      type: 'number',
      index: true,
      label: 'WooCommerce term ID',
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
      },
    }
  ],
}
