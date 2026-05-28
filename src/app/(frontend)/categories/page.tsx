import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { OptimizedImage } from '@/components/OptimizedImage'

// 1. Cấu hình SEO cho trang danh sách danh mục
export const metadata = {
    title: 'Danh mục sản phẩm | MF Paris Chính Hãng',
    description: 'Khám phá các dòng sản phẩm nước hoa, mỹ phẩm và thực phẩm chức năng cao cấp từ Pháp tại MF Paris.',
}

export default async function AllCategoriesPage() {
    const payload = await getPayload({ config: configPromise })

    // 2. Lấy toàn bộ danh mục từ Database
    const categoriesRes = await payload.find({
        collection: 'categories',
        limit: 100,
        sort: 'name',
        depth: 1,
    })

    return (
        <div className="bg-[#F4F6F8] min-h-screen pb-20 antialiased font-sans">

            {/* SECTION 1: BREADCRUMB */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <nav className="container-ux h-12 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <Link href="/" className="hover:text-black transition-colors">TRANG CHỦ</Link>
                    <ChevronRight size={12} />
                    <span className="text-black">DANH MỤC SẢN PHẨM</span>
                </nav>
            </div>

            <div className="container-ux">
                {/* HEADER TRANG */}
                <header className="text-center mb-16 space-y-4">
                    <div className="flex items-center justify-center gap-3 text-[#b72828] mb-2">
                        <LayoutGrid size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Collections</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-serif italic text-black tracking-tight">
                        Khám phá danh mục
                    </h1>
                    <div className="w-16 h-1 bg-[#b72828] mx-auto rounded-full"></div>
                    <p className="text-gray-500 text-sm max-w-lg mx-auto pt-2 italic">
                        Tuyển chọn những tinh hoa làm đẹp và chăm sóc sức khỏe tốt nhất từ các phòng thí nghiệm hàng đầu tại Pháp.
                    </p>
                </header>

                {/* GRID DANH MỤC 1:1 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                    {categoriesRes.docs.map((cat: any) => {
                        // Kiểm tra an toàn cho ảnh
                        const hasImage = cat.image && typeof cat.image === 'object'

                        return (
                            <Link
                                href={`/categories/${cat.slug}`}
                                key={cat.id}
                                className="group relative flex flex-col bg-white rounded-[2rem] overflow-hidden shadow-sm border border-white hover:shadow-xl transition-all duration-500"
                            >
                                {/* Khung ảnh 1:1 */}
                                <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                    <OptimizedImage
                                        media={cat.image}
                                        size="card"
                                        alt={cat.name}
                                        className="group-hover:scale-110 transition-transform duration-1000 ease-in-out"
                                    />
                                    {/* Lớp phủ mờ khi chưa hover */}
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors duration-500" />
                                </div>

                                {/* Phần text bên dưới ảnh (Hoặc đè lên ảnh tùy bạn chọn, ở đây tôi để dưới cho rõ nét chữ đen) */}
                                <div className="p-6 text-center space-y-2">
                                    <h3 className="text-lg font-bold text-black group-hover:text-[#b72828] transition-colors duration-300 font-sans uppercase tracking-tight">
                                        {cat.name}
                                    </h3>

                                    {/* Hiển thị số lượng sản phẩm (Nếu có dữ liệu count) */}
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                            View Collection
                                        </span>
                                        <ChevronRight size={10} className="text-[#b72828] group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* Hiệu ứng đường kẻ đỏ nhỏ khi hover */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-[#b72828] group-hover:w-full transition-all duration-500"></div>
                            </Link>
                        )
                    })}
                </div>

                {/* FOOTER TRANG DANH MỤC (Nút liên hệ nhanh) */}
                <div className="mt-20 p-10 bg-white rounded-[3rem] border border-white shadow-sm text-center space-y-6">
                    <h4 className="text-xl font-bold font-heading text-black">Bạn cần tìm sản phẩm chuyên biệt?</h4>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">Đội ngũ chuyên gia của MF Paris luôn sẵn sàng tư vấn lộ trình chăm sóc da và mùi hương phù hợp nhất với bạn.</p>
                    <Link
                        href="/contact"
                        className="inline-block px-10 py-4 bg-black text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#b72828] transition-all shadow-lg active:scale-95"
                    >
                        Liên hệ tư vấn ngay
                    </Link>
                </div>
            </div>
        </div>
    )
}