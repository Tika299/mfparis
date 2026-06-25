'use client'

import {
    useMemo,
    useState,
    type FormEvent,
} from 'react'
import {
    LoaderCircle,
    MessageSquareText,
    Send,
    Star,
    UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import {
    submitReview,
    type SubmitReviewResult,
} from '@/actions/submitReview'
import { cn } from '@/utilities'

type EntityID = string | number

type ReviewUser =
    | EntityID
    | {
        id: EntityID
        name?: string | null
        displayName?: string | null
        firstName?: string | null
        lastName?: string | null
    }
    | null

export type ProductReviewItem = {
    id: EntityID
    rating: number
    comment?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    user?: ReviewUser
}

type ProductReviewsProps = Readonly<{
    productId: EntityID
    userId?: EntityID | null
    reviews: ProductReviewItem[]
    className?: string
}>

type StarRatingInputProps = Readonly<{
    value: number
    disabled?: boolean
    onChange: (rating: number) => void
}>

type ReadOnlyStarsProps = Readonly<{
    rating: number
    size?: 'sm' | 'md'
}>

const MAX_COMMENT_LENGTH = 2_000

function clampRating(value: number): number {
    if (!Number.isFinite(value)) {
        return 0
    }

    return Math.min(5, Math.max(0, value))
}

function getReviewerName(
    user: ReviewUser | undefined,
): string {
    if (!user || typeof user !== 'object') {
        return 'Khách hàng ẩn danh'
    }

    const displayName = user.displayName?.trim()

    if (displayName) {
        return displayName
    }

    const name = user.name?.trim()

    if (name) {
        return name
    }

    const fullName = [
        user.firstName?.trim(),
        user.lastName?.trim(),
    ]
        .filter(
            (value): value is string =>
                typeof value === 'string' &&
                value.length > 0,
        )
        .join(' ')

    return fullName || 'Khách hàng ẩn danh'
}

function formatReviewDate(
    value: string | null | undefined,
): string {
    if (!value) {
        return 'Không rõ ngày'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Không rõ ngày'
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date)
}

function StarRatingInput({
    value,
    disabled = false,
    onChange,
}: StarRatingInputProps) {
    const [hoveredRating, setHoveredRating] =
        useState(0)

    const activeRating =
        hoveredRating > 0 ? hoveredRating : value

    return (
        <div
            role="radiogroup"
            aria-label="Chọn điểm đánh giá"
            className="flex items-center gap-1.5"
            onMouseLeave={() => {
                setHoveredRating(0)
            }}
        >
            {Array.from(
                { length: 5 },
                (_, index) => {
                    const starValue = index + 1
                    const isActive =
                        starValue <= activeRating

                    return (
                        <button
                            key={starValue}
                            type="button"
                            role="radio"
                            aria-checked={value === starValue}
                            aria-label={`${starValue} sao`}
                            disabled={disabled}
                            onClick={() => {
                                onChange(starValue)
                            }}
                            onMouseEnter={() => {
                                setHoveredRating(starValue)
                            }}
                            onFocus={() => {
                                setHoveredRating(starValue)
                            }}
                            onBlur={() => {
                                setHoveredRating(0)
                            }}
                            className={cn(
                                'group/star flex h-11 w-11 items-center justify-center rounded-full transition',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                                isActive
                                    ? 'bg-amber-50 text-amber-400'
                                    : 'bg-gray-50 text-gray-300 hover:bg-amber-50 hover:text-amber-400',
                            )}
                        >
                            <Star
                                aria-hidden="true"
                                className={cn(
                                    'h-6 w-6 transition-transform duration-200 group-hover/star:scale-110',
                                    isActive && 'fill-current',
                                )}
                            />
                        </button>
                    )
                },
            )}
        </div>
    )
}

function ReadOnlyStars({
    rating,
    size = 'sm',
}: ReadOnlyStarsProps) {
    const normalizedRating = Math.round(
        clampRating(rating),
    )

    const iconClassName =
        size === 'md'
            ? 'h-5 w-5'
            : 'h-4 w-4'

    return (
        <div className="flex items-center gap-0.5">
            {Array.from(
                { length: 5 },
                (_, index) => {
                    const isActive =
                        index < normalizedRating

                    return (
                        <Star
                            key={index}
                            aria-hidden="true"
                            className={cn(
                                iconClassName,
                                isActive
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-gray-100 text-gray-200',
                            )}
                        />
                    )
                },
            )}
        </div>
    )
}

export function ProductReviews({
    productId,
    userId,
    reviews,
    className,
}: ProductReviewsProps) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] =
        useState(false)
    const [formError, setFormError] = useState<
        string | null
    >(null)

    const reviewSummary = useMemo(() => {
        const validRatings = reviews
            .map((review) =>
                clampRating(Number(review.rating)),
            )
            .filter((value) => value > 0)

        if (validRatings.length === 0) {
            return {
                averageRating: 0,
                reviewCount: 0,
            }
        }

        const total = validRatings.reduce(
            (sum, value) => sum + value,
            0,
        )

        return {
            averageRating:
                total / validRatings.length,
            reviewCount: validRatings.length,
        }
    }, [reviews])

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        if (isSubmitting) {
            return
        }

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            const message =
                'Vui lòng chọn số sao đánh giá.'

            setFormError(message)
            toast.error(message)

            return
        }

        const normalizedComment = comment.trim()

        if (
            normalizedComment.length >
            MAX_COMMENT_LENGTH
        ) {
            const message =
                `Nội dung đánh giá không được vượt quá ${MAX_COMMENT_LENGTH.toLocaleString(
                    'vi-VN',
                )} ký tự.`

            setFormError(message)
            toast.error(message)

            return
        }

        setIsSubmitting(true)
        setFormError(null)

        try {
            const result: SubmitReviewResult =
                await submitReview({
                    productId,
                    rating,
                    comment: normalizedComment,
                    userId,
                })

            if (!result.success) {
                setFormError(result.message)
                toast.error(result.message)

                return
            }

            toast.success(
                'Đánh giá của bạn đã được gửi và đang chờ duyệt',
            )

            setRating(0)
            setComment('')
        } catch (error: unknown) {
            console.error(
                '[ProductReviews] Submit failed:',
                error,
            )

            const message =
                'Không thể gửi đánh giá vào lúc này. Vui lòng thử lại.'

            setFormError(message)
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section
            aria-labelledby="product-reviews-heading"
            className={cn(
                'overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm',
                className,
            )}
        >
            <header className="border-b border-gray-100 px-5 py-7 sm:px-7 md:px-10 md:py-9">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B72828]">
                    Trải nghiệm thực tế
                </p>

                <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2
                            id="product-reviews-heading"
                            className="text-2xl font-black tracking-tight text-gray-950 md:text-3xl"
                        >
                            Đánh giá từ khách hàng
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                            Chia sẻ trải nghiệm chân thật của
                            bạn để giúp những khách hàng khác
                            lựa chọn sản phẩm phù hợp hơn.
                        </p>
                    </div>

                    {reviewSummary.reviewCount > 0 ? (
                        <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4">
                            <div>
                                <p className="text-3xl font-black leading-none text-gray-950">
                                    {reviewSummary.averageRating.toLocaleString(
                                        'vi-VN',
                                        {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                        },
                                    )}
                                </p>

                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Trên 5 điểm
                                </p>
                            </div>

                            <div>
                                <ReadOnlyStars
                                    rating={
                                        reviewSummary.averageRating
                                    }
                                    size="md"
                                />

                                <p className="mt-1.5 text-xs font-medium text-gray-500">
                                    {reviewSummary.reviewCount.toLocaleString(
                                        'vi-VN',
                                    )}{' '}
                                    đánh giá đã duyệt
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Form gửi đánh giá */}
                <div className="border-b border-gray-100 p-5 sm:p-7 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-9">
                    <div className="lg:sticky lg:top-24">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-[#B72828]">
                            <MessageSquareText
                                aria-hidden="true"
                                className="h-5 w-5"
                            />
                        </div>

                        <h3 className="mt-4 text-xl font-black text-gray-950">
                            Viết đánh giá của bạn
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Đánh giá sẽ được kiểm duyệt trước
                            khi hiển thị công khai.
                        </p>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-7 space-y-6"
                            noValidate
                        >
                            <fieldset disabled={isSubmitting}>
                                <legend className="mb-3 text-sm font-bold text-gray-900">
                                    Bạn đánh giá sản phẩm này thế
                                    nào?
                                </legend>

                                <StarRatingInput
                                    value={rating}
                                    disabled={isSubmitting}
                                    onChange={(nextRating) => {
                                        setRating(nextRating)
                                        setFormError(null)
                                    }}
                                />

                                <p className="mt-3 min-h-5 text-xs font-medium text-gray-500">
                                    {rating > 0
                                        ? `Bạn đã chọn ${rating} sao`
                                        : 'Chạm vào ngôi sao để chọn điểm'}
                                </p>
                            </fieldset>

                            <div>
                                <div className="mb-2 flex items-center justify-between gap-4">
                                    <label
                                        htmlFor="review-comment"
                                        className="text-sm font-bold text-gray-900"
                                    >
                                        Nội dung đánh giá
                                    </label>

                                    <span
                                        className={cn(
                                            'text-xs tabular-nums',
                                            comment.length >
                                                MAX_COMMENT_LENGTH
                                                ? 'font-bold text-red-600'
                                                : 'text-gray-400',
                                        )}
                                    >
                                        {comment.length.toLocaleString(
                                            'vi-VN',
                                        )}
                                        /
                                        {MAX_COMMENT_LENGTH.toLocaleString(
                                            'vi-VN',
                                        )}
                                    </span>
                                </div>

                                <textarea
                                    id="review-comment"
                                    value={comment}
                                    rows={6}
                                    maxLength={
                                        MAX_COMMENT_LENGTH
                                    }
                                    disabled={isSubmitting}
                                    placeholder="Chia sẻ cảm nhận về chất lượng, kết cấu, mùi hương hoặc hiệu quả thực tế..."
                                    onChange={(event) => {
                                        setComment(event.target.value)
                                        setFormError(null)
                                    }}
                                    className={cn(
                                        'w-full resize-none rounded-2xl border bg-white px-4 py-3.5 text-sm leading-6 text-gray-950 outline-none transition',
                                        'placeholder:text-gray-400',
                                        'focus:border-[#B72828] focus:ring-4 focus:ring-[#B72828]/10',
                                        'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                                        formError
                                            ? 'border-red-300'
                                            : 'border-gray-200',
                                    )}
                                />
                            </div>

                            {formError ? (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                >
                                    {formError}
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    rating < 1
                                }
                                className={cn(
                                    'flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition',
                                    'bg-[#B72828] shadow-lg shadow-red-100 hover:bg-[#951F1F]',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B72828] focus-visible:ring-offset-2',
                                    'disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none',
                                )}
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoaderCircle
                                            aria-hidden="true"
                                            className="h-5 w-5 animate-spin"
                                        />
                                        Đang gửi đánh giá...
                                    </>
                                ) : (
                                    <>
                                        <Send
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Gửi đánh giá
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Danh sách đánh giá */}
                <div className="p-5 sm:p-7 lg:col-span-7 lg:p-9">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-950">
                                Đánh giá đã duyệt
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                                Chỉ hiển thị những đánh giá đã
                                được MF PARIS kiểm duyệt.
                            </p>
                        </div>

                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                            {reviews.length.toLocaleString(
                                'vi-VN',
                            )}{' '}
                            đánh giá
                        </span>
                    </div>

                    {reviews.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {reviews.map((review) => {
                                const reviewerName =
                                    getReviewerName(review.user)

                                const reviewDate =
                                    formatReviewDate(
                                        review.createdAt ??
                                        review.updatedAt,
                                    )

                                const normalizedRating =
                                    Math.round(
                                        clampRating(
                                            Number(review.rating),
                                        ),
                                    )

                                return (
                                    <article
                                        key={String(review.id)}
                                        className="py-6 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-start gap-3.5">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F1ED] text-[#8C5A3C]">
                                                <UserRound
                                                    aria-hidden="true"
                                                    className="h-5 w-5"
                                                />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <p className="truncate text-sm font-black text-gray-950">
                                                            {reviewerName}
                                                        </p>

                                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                            <ReadOnlyStars
                                                                rating={
                                                                    normalizedRating
                                                                }
                                                            />

                                                            <span className="text-xs font-bold text-gray-700">
                                                                {normalizedRating}/5
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <time
                                                        dateTime={
                                                            review.createdAt ??
                                                            review.updatedAt ??
                                                            undefined
                                                        }
                                                        className="shrink-0 text-xs font-medium text-gray-400"
                                                    >
                                                        {reviewDate}
                                                    </time>
                                                </div>

                                                {review.comment?.trim() ? (
                                                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">
                                                        {review.comment.trim()}
                                                    </p>
                                                ) : (
                                                    <p className="mt-4 text-sm italic leading-6 text-gray-400">
                                                        Khách hàng đã chấm{' '}
                                                        {normalizedRating} sao và
                                                        không để lại nội dung.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 px-6 py-12 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                                <MessageSquareText
                                    aria-hidden="true"
                                    className="h-6 w-6"
                                />
                            </div>

                            <h4 className="mt-5 text-base font-black text-gray-900">
                                Chưa có đánh giá nào
                            </h4>

                            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                                Hãy trở thành người đầu tiên chia
                                sẻ trải nghiệm thực tế về sản phẩm
                                này.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}