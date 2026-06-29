import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Chính sách bảo mật | MF Paris',
    description: 'Chính sách thu thập, sử dụng và bảo vệ thông tin khách hàng của MF Paris.',
}

export default function PrivacyPolicyPage() {
    return (
        <main className="bg-[#f7f7f7] py-12">
            <article className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                <h1 className="text-3xl font-black text-gray-950">Chính sách bảo mật</h1>

                <div className="mt-8 space-y-6 text-sm leading-7 text-gray-700">
                    <p>
                        MF Paris cam kết bảo vệ thông tin cá nhân của khách hàng và chỉ sử dụng thông tin
                        cho mục đích xử lý đơn hàng, chăm sóc khách hàng và hỗ trợ sau bán hàng.
                    </p>

                    <section>
                        <h2 className="font-bold text-gray-950">Thông tin thu thập</h2>
                        <p>Họ tên, số điện thoại, email, địa chỉ giao hàng và thông tin đơn hàng.</p>
                    </section>

                    <section>
                        <h2 className="font-bold text-gray-950">Bảo vệ dữ liệu</h2>
                        <p>Thông tin khách hàng không được bán, trao đổi hoặc chia sẻ cho bên thứ ba ngoài mục đích giao hàng và thanh toán.</p>
                    </section>
                </div>
            </article>
        </main>
    )
}