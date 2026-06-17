'use server'

import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

type ClientEntityID = string | number

export type SubmitReviewInput = {
    productId: ClientEntityID
    rating: number
    comment: string
    userId?: ClientEntityID | null
}

type ReviewField =
    | 'productId'
    | 'rating'
    | 'comment'
    | 'userId'

type ReviewFieldErrors = Partial<
    Record<ReviewField, string>
>

export type SubmitReviewResult =
    | {
        success: true
        message: string
        reviewId: string
    }
    | {
        success: false
        code:
        | 'VALIDATION_ERROR'
        | 'UNAUTHORIZED'
        | 'PRODUCT_NOT_FOUND'
        | 'CREATE_FAILED'
        message: string
        fieldErrors?: ReviewFieldErrors
    }

const MAX_COMMENT_LENGTH = 2_000

/**
 * Payload/PostgreSQL của dự án đang sử dụng ID dạng number.
 *
 * Hàm này nhận string hoặc number từ Client,
 * sau đó chuyển thành số nguyên dương hợp lệ.
 */
function normalizeNumericID(
    value: unknown,
): number | null {
    if (typeof value === 'number') {
        if (
            Number.isSafeInteger(value) &&
            value > 0
        ) {
            return value
        }

        return null
    }

    if (typeof value === 'string') {
        const normalizedValue = value.trim()

        if (!/^\d+$/.test(normalizedValue)) {
            return null
        }

        const numericValue = Number(normalizedValue)

        if (
            Number.isSafeInteger(numericValue) &&
            numericValue > 0
        ) {
            return numericValue
        }
    }

    return null
}

function getAuthenticatedUserID(
    user: unknown,
): number | null {
    if (
        !user ||
        typeof user !== 'object' ||
        !('id' in user)
    ) {
        return null
    }

    return normalizeNumericID(user.id)
}

function validateInput(
    input: SubmitReviewInput,
): {
    productId: number | null
    rating: number | null
    comment: string
    submittedUserId: number | null
    fieldErrors: ReviewFieldErrors
} {
    const fieldErrors: ReviewFieldErrors = {}

    const productId = normalizeNumericID(
        input.productId,
    )

    if (productId === null) {
        fieldErrors.productId =
            'ID sản phẩm không hợp lệ.'
    }

    const rating =
        typeof input.rating === 'number' &&
            Number.isFinite(input.rating)
            ? input.rating
            : null

    if (
        rating === null ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        fieldErrors.rating =
            'Điểm đánh giá phải là số nguyên từ 1 đến 5.'
    }

    const comment =
        typeof input.comment === 'string'
            ? input.comment.trim()
            : ''

    if (comment.length > MAX_COMMENT_LENGTH) {
        fieldErrors.comment =
            `Nội dung đánh giá không được vượt quá ${MAX_COMMENT_LENGTH.toLocaleString(
                'vi-VN',
            )} ký tự.`
    }

    const clientSubmittedUserId =
        input.userId !== undefined &&
        input.userId !== null

    const submittedUserId =
        clientSubmittedUserId
            ? normalizeNumericID(input.userId)
            : null

    if (
        clientSubmittedUserId &&
        submittedUserId === null
    ) {
        fieldErrors.userId =
            'ID người dùng không hợp lệ.'
    }

    return {
        productId,
        rating,
        comment,
        submittedUserId,
        fieldErrors,
    }
}

export async function submitReview(
    input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
    const {
        productId,
        rating,
        comment,
        submittedUserId,
        fieldErrors,
    } = validateInput(input)

    if (
        Object.keys(fieldErrors).length > 0 ||
        productId === null ||
        rating === null
    ) {
        return {
            success: false,
            code: 'VALIDATION_ERROR',
            message:
                'Thông tin đánh giá chưa hợp lệ. Vui lòng kiểm tra lại.',
            fieldErrors,
        }
    }

    try {
        const payload = await getPayload({
            config: configPromise,
        })

        const requestHeaders = await getHeaders()

        const { user } = await payload.auth({
            headers: requestHeaders,
            canSetHeaders: false,
        })

        const authenticatedUserId =
            getAuthenticatedUserID(user)

        /**
         * Không tin tưởng userId do Client tự gửi.
         */
        if (
            submittedUserId !== null &&
            authenticatedUserId === null
        ) {
            return {
                success: false,
                code: 'UNAUTHORIZED',
                message:
                    'Bạn cần đăng nhập để gửi đánh giá bằng tài khoản này.',
                fieldErrors: {
                    userId:
                        'Không thể xác nhận tài khoản người đánh giá.',
                },
            }
        }

        if (
            submittedUserId !== null &&
            authenticatedUserId !== null &&
            submittedUserId !== authenticatedUserId
        ) {
            return {
                success: false,
                code: 'UNAUTHORIZED',
                message:
                    'Tài khoản gửi đánh giá không hợp lệ.',
                fieldErrors: {
                    userId:
                        'userId không khớp với tài khoản đang đăng nhập.',
                },
            }
        }

        /**
         * productId tại đây đã là number,
         * phù hợp với type number | Product của Payload.
         */
        const productResult = await payload.find({
            collection: 'products',
            where: {
                and: [
                    {
                        id: {
                            equals: productId,
                        },
                    },
                    {
                        status: {
                            equals: 'published',
                        },
                    },
                ],
            },
            limit: 1,
            depth: 0,
            pagination: false,
            overrideAccess: true,
            select: {
                title: true,
            },
        })

        if (productResult.docs.length === 0) {
            return {
                success: false,
                code: 'PRODUCT_NOT_FOUND',
                message:
                    'Sản phẩm không tồn tại hoặc hiện không còn được bán.',
                fieldErrors: {
                    productId:
                        'Không tìm thấy sản phẩm cần đánh giá.',
                },
            }
        }

        const createdReview = await payload.create({
            collection: 'reviews',

            data: {
                /**
                 * productId là number nên không còn lỗi:
                 * string | number không gán được cho number | Product.
                 */
                product: productId,

                rating,
                comment: comment || undefined,

                /**
                 * Client không thể tự duyệt review.
                 */
                status: 'pending',

                ...(authenticatedUserId !== null
                    ? {
                        user: authenticatedUserId,
                    }
                    : {}),
            },

            depth: 0,

            /**
             * Tôn trọng Access Control của Reviews.
             */
            overrideAccess: false,

            /**
             * Truyền user hiện tại vào Local API.
             */
            user: user ?? undefined,
        })

        return {
            success: true,
            reviewId: String(createdReview.id),
            message:
                'Đánh giá đã được gửi thành công và đang chờ quản trị viên duyệt.',
        }
    } catch (error: unknown) {
        console.error('[submitReview] Failed:', error)

        return {
            success: false,
            code: 'CREATE_FAILED',
            message:
                'Không thể gửi đánh giá vào lúc này. Vui lòng thử lại sau.',
        }
    }
}