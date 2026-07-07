import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
    title: 'Chính sách đổi trả | MF Paris',
    description: 'Chính sách đổi trả, hoàn tiền và hỗ trợ sau bán hàng tại MF Paris.',
}

export default function ReturnPolicyPage() {
    const schemaGraph = buildStaticPageSchemaGraph({
        page: {
            url: '/chinh-sach-doi-tra',
            name: 'Chinh sach doi tra',
            description: 'Thong tin doi tra va hoan tien tai MF Paris.',
            type: 'WebPage',
        },
        breadcrumb: [
            {
                name: 'Trang chu',
                url: '/',
            },
            {
                name: 'Chinh sach doi tra',
                url: '/chinh-sach-doi-tra',
            },
        ],
    })

    return (
        <main className="bg-[#f7f7f7] py-12">
            <JsonLd data={schemaGraph} />
            <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                <h1 className="text-3xl font-black text-gray-950">Chính sách đổi trả</h1>

                <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
                    <p>
                        MF Paris hỗ trợ đổi trả sản phẩm trong trường hợp sản phẩm bị lỗi, giao sai mẫu,
                        sai dung tích hoặc hư hỏng trong quá trình vận chuyển.
                    </p>

                    <section>
                        <h2 className="font-bold text-gray-950">Điều kiện đổi trả</h2>
                        <p>Sản phẩm còn đầy đủ bao bì, tem nhãn, hóa đơn hoặc thông tin đơn hàng.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Thời gian xử lý</h2>
                        <p>Khách hàng vui lòng liên hệ trong vòng 7 ngày kể từ khi nhận hàng.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Hoàn tiền</h2>
                        <p>Hoàn tiền được xử lý sau khi MF Paris xác nhận tình trạng sản phẩm.</p>
                    </section>
                </div>
            </article>
        </main>
    )
}