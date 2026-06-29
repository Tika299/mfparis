import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Liên hệ | MF Paris',
    description: 'Thông tin liên hệ, địa chỉ, hotline và email hỗ trợ khách hàng của MF Paris.',
}

export default function ContactPage() {
    return (
        <main className="bg-[#f7f7f7] py-12">
            <section className="mx-auto max-w-4xl rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
                <p className="text-sm font-bold uppercase tracking-widest text-[#b72828]">
                    MF Paris
                </p>

                <h1 className="mt-3 text-3xl font-black text-gray-950">
                    Liên hệ
                </h1>

                <div className="mt-8 grid gap-5 text-sm leading-7 text-gray-700">
                    <p>
                        Hotline: <strong>0792979299</strong>
                    </p>
                    <p>
                        Email: <strong>cskh@maraisdefrance.vn</strong>
                    </p>
                    <p>
                        Địa chỉ: <strong>220/24 Nguyễn Oanh, Gò Vấp, Thành phố Hồ Chí Minh</strong>
                    </p>
                    <p>
                        Thời gian hỗ trợ: <strong>8:00 - 22:00, Thứ 2 đến Chủ nhật</strong>
                    </p>
                </div>
            </section>
        </main>
    )
}