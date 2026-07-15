import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

import { VoucherPageClient } from '@/components/vouchers/VoucherPageClient'
import {
    toFrontendVoucherDTO,
    type Voucher,
} from '@/types/voucher'

export default async function VouchersPage() {
    const payload = await getPayload({
        config: configPromise,
    })

    const result = await payload.find({
        collection: 'vouchers',

        where: {
            and: [
                {
                    isPublic: {
                        equals: true,
                    },
                },
                {
                    status: {
                        equals: 'active',
                    },
                },
            ],
        },

        sort: '-createdAt',
        limit: 100,
        depth: 0,
    })

    /**
     * Dùng một mốc thời gian duy nhất cho toàn bộ request.
     * Nhờ vậy trạng thái voucher và dữ liệu truyền xuống
     * Client Component luôn nhất quán.
     */
    const referenceNow = new Date()

    const vouchers = result.docs.map((document) => {
        const rawVoucher: Voucher = {
            id: Number(document.id),

            code: document.code,
            title: document.title ?? null,

            status: document.status,
            isPublic: document.isPublic,

            type: document.type,
            value: document.value,

            minOrderAmount:
                document.minOrderAmount ?? 0,

            maxDiscountAmount:
                document.maxDiscountAmount ?? 0,

            startsAt:
                document.startsAt ?? null,

            endsAt:
                document.endsAt ?? null,

            usageLimit:
                document.usageLimit ?? 0,

            usageLimitPerCustomer:
                document.usageLimitPerCustomer ?? 0,

            usedCount:
                document.usedCount ?? 0,

            createdAt:
                document.createdAt,

            updatedAt:
                document.updatedAt,
        }

        return toFrontendVoucherDTO(
            rawVoucher,
            referenceNow,
        )
    })
    const schemaGraph = buildStaticPageSchemaGraph({
        page: {
            url: '/vouchers',
            name: 'Voucher MF Paris',
            description: 'Ma uu dai va chuong trinh khuyen mai cong khai tai MF Paris.',
            type: 'WebPage',
        },
        breadcrumb: [
            {
                name: 'Trang chủ',
                url: '/',
            },
            {
                name: 'Voucher',
                url: '/vouchers',
            },
        ],
    })

    return (
        <>
            <JsonLd data={schemaGraph} />
            <VoucherPageClient
            vouchers={vouchers}
            referenceNow={referenceNow.toISOString()}
        />
        </>
    )
}
