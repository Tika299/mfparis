import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildStaticPageSchemaGraph } from '@/lib/structured-data'

export const metadata: Metadata = {
    title: 'Phương thức thanh toán | MF Paris',
    description:
        'Thông tin các phương thức thanh toán được hỗ trợ khi mua hàng tại MF Paris.',
}

const paymentMethods = [
    {
        title: 'Thanh toán khi nhận hàng',
        label: 'COD',
        description:
            'Khách hàng thanh toán trực tiếp cho đơn vị vận chuyển sau khi nhận và kiểm tra tình trạng kiện hàng.',
    },
    {
        title: 'Chuyển khoản ngân hàng',
        label: 'Bank Transfer',
        description:
            'MF Paris hỗ trợ thanh toán bằng chuyển khoản. Thông tin chuyển khoản sẽ được xác nhận khi đơn hàng được xử lý.',
    },
    {
        title: 'Thanh toán qua cổng hỗ trợ',
        label: 'Online Payment',
        description:
            'Một số đơn hàng có thể hỗ trợ thanh toán qua cổng thanh toán hoặc đối tác tài chính được tích hợp trên website.',
    },
]

export default function PaymentMethodsPage() {
    const schemaGraph = buildStaticPageSchemaGraph({
        page: {
            url: '/phuong-thuc-thanh-toan',
            name: 'Phuong thuc thanh toan',
            description: 'Cac phuong thuc thanh toan duoc ho tro tai MF Paris.',
            type: 'WebPage',
        },
        breadcrumb: [
            {
                name: 'Trang chủ',
                url: '/',
            },
            {
                name: 'Phuong thuc thanh toan',
                url: '/phuong-thuc-thanh-toan',
            },
        ],
    })

    return (
        <main className="bg-[#f7f7f7] py-12">
            <JsonLd data={schemaGraph} />
            <section className="mx-auto max-w-5xl px-5">
                <div className="rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-[#b72828]">
                        MF Paris
                    </p>

                    <h1 className="mt-3 text-3xl font-black text-gray-950">
                        Phương thức thanh toán
                    </h1>

                    <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
                        MF Paris cung cấp các phương thức thanh toán rõ ràng và minh bạch
                        để khách hàng dễ dàng lựa chọn khi đặt hàng trên website.
                    </p>

                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                        {paymentMethods.map((method) => (
                            <article
                                key={method.label}
                                className="rounded-2xl border border-gray-100 bg-[#fafafa] p-5"
                            >
                                <span className="inline-flex rounded-full bg-[#b72828]/10 px-3 py-1 text-xs font-black uppercase text-[#b72828]">
                                    {method.label}
                                </span>

                                <h2 className="mt-4 text-lg font-black text-gray-950">
                                    {method.title}
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-gray-600">
                                    {method.description}
                                </p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
                        Thông tin thanh toán cụ thể, nếu có, sẽ được MF Paris xác nhận lại
                        trong quá trình xử lý đơn hàng. Khách hàng không nên chuyển khoản
                        vào tài khoản không được MF Paris xác nhận chính thức.
                    </div>
                </div>
            </section>
        </main>
    )
}