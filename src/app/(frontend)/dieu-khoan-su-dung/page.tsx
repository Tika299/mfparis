import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
    title: 'Điều khoản sử dụng | MF Paris',
    description: 'Điều khoản sử dụng website và mua hàng tại MF Paris.',
}

export default function TermsPage() {
    const schemaGraph = buildStaticPageSchemaGraph({
        page: {
            url: '/dieu-khoan-su-dung',
            name: 'Dieu khoan su dung',
            description: 'Dieu khoan su dung website va dich vu cua MF Paris.',
            type: 'WebPage',
        },
        breadcrumb: [
            {
                name: 'Trang chủ',
                url: '/',
            },
            {
                name: 'Dieu khoan su dung',
                url: '/dieu-khoan-su-dung',
            },
        ],
    })

    return (
        <main className="bg-[#f7f7f7] py-12">
            <JsonLd data={schemaGraph} />
            <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                <h1 className="text-3xl font-black text-gray-950">Điều khoản sử dụng</h1>

                <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
                    <p>
                        Khi truy cập và mua hàng tại MF Paris, khách hàng đồng ý với các điều khoản về
                        thông tin sản phẩm, thanh toán, giao hàng, đổi trả và bảo mật thông tin.
                    </p>

                    <section>
                        <h2 className="font-bold text-gray-950">Thông tin sản phẩm</h2>
                        <p>MF Paris nỗ lực cung cấp thông tin sản phẩm, giá bán và tồn kho chính xác tại thời điểm hiển thị.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Đặt hàng</h2>
                        <p>Đơn hàng chỉ được xác nhận khi MF Paris kiểm tra thông tin và tình trạng sản phẩm.</p>
                    </section>
                </div>
            </article>
        </main>
    )
}