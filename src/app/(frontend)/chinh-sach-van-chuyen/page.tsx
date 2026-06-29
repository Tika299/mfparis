import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Chính sách vận chuyển | MF Paris',
    description: 'Thông tin vận chuyển, thời gian giao hàng và phí giao hàng của MF Paris.',
}

export default function ShippingPolicyPage() {
    return (
        <main className="bg-[#f7f7f7] py-12">
            <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                <h1 className="text-3xl font-black text-gray-950">Chính sách vận chuyển</h1>

                <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
                    <p>
                        MF Paris giao hàng toàn quốc thông qua các đơn vị vận chuyển uy tín.
                    </p>

                    <section>
                        <h2 className="font-bold text-gray-950">Thời gian giao hàng</h2>
                        <p>Nội thành TP.HCM: 1-2 ngày làm việc. Tỉnh thành khác: 2-5 ngày làm việc.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Phí vận chuyển</h2>
                        <p>Miễn phí vận chuyển cho đơn hàng từ 500.000đ. Các đơn hàng khác sẽ được thông báo phí trước khi xác nhận.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Kiểm tra hàng</h2>
                        <p>Khách hàng được kiểm tra tình trạng bên ngoài của kiện hàng trước khi nhận.</p>
                    </section>
                </div>
            </article>
        </main>
    )
}