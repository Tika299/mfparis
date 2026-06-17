import type {
  Access,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload'

type EntityID = string | number

type RelationshipValue =
  | EntityID
  | {
      id: EntityID
    }

type ReviewStatus = 'pending' | 'approved' | 'rejected'

type ReviewDocument = {
  id: EntityID
  product: RelationshipValue
  user?: RelationshipValue | null
  rating: number
  comment?: string | null
  status: ReviewStatus
  createdAt?: string
  updatedAt?: string
}

/**
 * Trong cấu hình mẫu này:
 *
 * - Khách chưa đăng nhập vẫn có thể gửi review.
 * - Chỉ người đã đăng nhập Payload mới được sửa/xóa review.
 * - Khách công khai chỉ đọc được review đã approved.
 *
 * Nếu collection "users" của bạn chứa cả khách hàng và nhân viên,
 * hãy thay isStaff bằng kiểm tra roles.includes('admin').
 */
const isStaff: Access = ({ req }) => {
  return Boolean(req.user)
}

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

/**
 * Lấy ID từ relationship của Payload.
 *
 * Relationship có thể được trả về dưới dạng:
 * - number
 * - string
 * - object đã populate: { id: number | string }
 */
function getRelationshipID(value: unknown): EntityID | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (!value || typeof value !== 'object' || !('id' in value)) {
    return null
  }

  const id = value.id

  if (typeof id === 'string' || typeof id === 'number') {
    return id
  }

  return null
}

/**
 * Làm tròn điểm trung bình tới 2 chữ số thập phân.
 *
 * Ví dụ:
 * 4.333333 → 4.33
 * 4.5      → 4.5
 */
function roundAverageRating(value: number): number {
  return Number(value.toFixed(2))
}

/**
 * Query toàn bộ review approved của một sản phẩm,
 * tính lại averageRating và reviewCount,
 * sau đó cập nhật ngược về Products.
 */
async function recalculateProductRating(
  req: PayloadRequest,
  productID: EntityID,
): Promise<void> {
  const approvedReviews = await req.payload.find({
    collection: 'reviews',
    where: {
      and: [
        {
          product: {
            equals: productID,
          },
        },
        {
          status: {
            equals: 'approved',
          },
        },
      ],
    },

    /**
     * Không cần populate product hoặc user.
     */
    depth: 0,

    /**
     * Phải lấy tất cả review để tính trung bình chính xác.
     */
    pagination: false,

    /**
     * Chỉ lấy field cần dùng để giảm dữ liệu query.
     */
    select: {
      rating: true,
    },

    /**
     * Truyền req để giữ cùng transaction với thao tác hiện tại.
     */
    req,

    /**
     * Đây là tác vụ hệ thống, không phụ thuộc access của người gọi.
     */
    overrideAccess: true,
  })

  const ratings: number[] = []

  for (const review of approvedReviews.docs) {
    const rating = Number(review.rating)

    if (
      Number.isFinite(rating) &&
      rating >= 1 &&
      rating <= 5
    ) {
      ratings.push(rating)
    }
  }

  const reviewCount = ratings.length

  const totalRating = ratings.reduce(
    (total, rating) => total + rating,
    0,
  )

  const averageRating =
    reviewCount > 0
      ? roundAverageRating(totalRating / reviewCount)
      : 0

  await req.payload.update({
    collection: 'products',
    id: productID,
    data: {
      averageRating,
      reviewCount,
    },
    depth: 0,
    req,
    overrideAccess: true,
  })
}

/**
 * Luôn buộc review mới về pending.
 *
 * Điều này ngăn client gửi trực tiếp:
 *
 * status: 'approved'
 *
 * để tự duyệt review của chính mình.
 *
 * Nếu request đã đăng nhập, user được tự động lấy từ req.user.
 * Nếu chưa đăng nhập, field user được để null.
 */
const prepareReviewBeforeValidate: CollectionBeforeValidateHook<
  ReviewDocument
> = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    return data
  }

  const authenticatedUserID = getRelationshipID(req.user)

  return {
    ...data,
    status: 'pending',
    user: authenticatedUserID ?? null,
  }
}

/**
 * Chạy sau khi review được tạo hoặc cập nhật.
 *
 * Không chỉ kiểm tra trạng thái hiện tại, mà còn phải kiểm tra
 * trạng thái trước đó.
 *
 * Ví dụ:
 * approved -> rejected
 *
 * Review hiện tại không còn approved, nhưng vẫn phải tính lại
 * sản phẩm để loại review đó khỏi averageRating.
 */
const updateProductRatingAfterChange: CollectionAfterChangeHook<
  ReviewDocument
> = async ({ doc, previousDoc, req }) => {
  const currentIsApproved = doc.status === 'approved'
  const previousWasApproved =
    previousDoc?.status === 'approved'

  /**
   * Nếu cả trước và sau đều không approved,
   * review này không ảnh hưởng tới aggregate của sản phẩm.
   */
  if (!currentIsApproved && !previousWasApproved) {
    return doc
  }

  const affectedProductIDs = new Set<EntityID>()

  const currentProductID = getRelationshipID(doc.product)
  const previousProductID = getRelationshipID(
    previousDoc?.product,
  )

  if (currentProductID !== null) {
    affectedProductIDs.add(currentProductID)
  }

  /**
   * Trường hợp review được chuyển từ sản phẩm A sang B,
   * phải cập nhật lại cả hai sản phẩm.
   */
  if (previousProductID !== null) {
    affectedProductIDs.add(previousProductID)
  }

  /**
   * Chạy tuần tự để tránh nhiều update cùng sử dụng một request
   * và transaction tại cùng thời điểm.
   */
  for (const productID of affectedProductIDs) {
    await recalculateProductRating(req, productID)
  }

  return doc
}

/**
 * afterChange không chạy khi document bị xóa,
 * vì vậy bắt buộc phải có afterDelete.
 */
const updateProductRatingAfterDelete: CollectionAfterDeleteHook<
  ReviewDocument
> = async ({ doc, req }) => {
  /**
   * Review pending/rejected không nằm trong aggregate,
   * nên khi xóa không cần tính lại.
   */
  if (doc.status !== 'approved') {
    return
  }

  const productID = getRelationshipID(doc.product)

  if (productID === null) {
    return
  }

  await recalculateProductRating(req, productID)
}

export const Reviews: CollectionConfig = {
  slug: 'reviews',

  labels: {
    singular: 'Đánh giá',
    plural: 'Đánh giá',
  },

  admin: {
    useAsTitle: 'comment',
    defaultColumns: [
      'product',
      'user',
      'rating',
      'status',
      'createdAt',
    ],
    group: 'Thương mại điện tử',
  },

  defaultSort: '-createdAt',

  access: {
    /**
     * Người chưa đăng nhập chỉ đọc review đã duyệt.
     * Người đăng nhập Payload được xem toàn bộ để kiểm duyệt.
     */
    read: readApprovedOrStaff,

    /**
     * Cho phép khách gửi review.
     * Review vẫn luôn bị ép về pending trong beforeValidate.
     */
    create: () => true,

    /**
     * Cấu hình này giả định tài khoản đăng nhập Payload là staff.
     * Nếu customer cũng nằm trong users, hãy kiểm tra role admin.
     */
    update: isStaff,
    delete: isStaff,
  },

  hooks: {
    beforeValidate: [prepareReviewBeforeValidate],
    afterChange: [updateProductRatingAfterChange],
    afterDelete: [updateProductRatingAfterDelete],
  },

  fields: [
    {
      name: 'product',
      label: 'Sản phẩm',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      admin: {
        allowCreate: false,
        description:
          'Sản phẩm được khách hàng đánh giá.',
      },
    },
    {
      name: 'user',
      label: 'Người đánh giá',
      type: 'relationship',
      relationTo: 'users',

      /**
       * false cho phép khách chưa đăng nhập gửi đánh giá.
       *
       * Nếu bắt buộc đăng nhập:
       * - đổi thành required: true
       * - đổi access.create thành isStaff hoặc một access
       *   kiểm tra customer đã đăng nhập.
       */
      required: false,

      index: true,
      admin: {
        allowCreate: false,
        description:
          'Tự động lấy từ người đang đăng nhập. Để trống nếu khách gửi ẩn danh.',
      },
    },
    {
      name: 'rating',
      label: 'Điểm đánh giá',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      admin: {
        step: 1,
        description: 'Điểm đánh giá từ 1 đến 5 sao.',
      },
    },
    {
      name: 'comment',
      label: 'Nội dung đánh giá',
      type: 'textarea',
      required: false,
      admin: {
        placeholder:
          'Nhập trải nghiệm thực tế về sản phẩm...',
      },
    },
    {
      name: 'status',
      label: 'Trạng thái kiểm duyệt',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        {
          label: 'Chờ duyệt',
          value: 'pending',
        },
        {
          label: 'Đã duyệt',
          value: 'approved',
        },
        {
          label: 'Từ chối',
          value: 'rejected',
        },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Chỉ review đã duyệt mới được tính vào điểm trung bình của sản phẩm.',
      },
    },
  ],
}