import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { OptimizedImage } from '@/components/OptimizedImage'

export const metadata = {
    title: 'Danh mục sản phẩm | MF Paris Chính Hãng',
    description: 'Khám phá các dòng sản phẩm nước hoa, mỹ phẩm và thực phẩm chức năng cao cấp từ Pháp tại MF Paris.',
}

type PageProps = {
    searchParams?: Promise<{
        page?: string
    }>
}

export default async function AllCategoriesPage({ searchParams }: PageProps) {
    const payload = await getPayload({ config: configPromise })

    const resolvedSearchParams = await searchParams
    const currentPage = Math.max(Number(resolvedSearchParams?.page) || 1, 1)
    const limit = 12

    const categoriesRes = await payload.find({
        collection: 'categories',
        limit,
        page: currentPage,
        sort: 'name',
        depth: 1,
    })

    const totalPages = categoriesRes.totalPages || 1

    const getPageHref = (page: number) => {
        return page <= 1 ? '/categories' : `/categories?page=${page}`
    }

    const getPageNumbers = () => {
        const pages: number[] = []
        const start = Math.max(1, currentPage - 2)
        const end = Math.min(totalPages, currentPage + 2)

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        return pages
    }

    return (
        <div className="bg-[#F4F6F8] min-h-screen pb-20 antialiased font-sans">

            {/* SECTION 1: BREADCRUMB */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <nav className="container-ux h-12 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <Link href="/" className="hover:text-black transition-colors">
                        TRANG CHỦ
                    </Link>
                    <ChevronRight size={12} />
                    <span className="text-black">DANH MỤC SẢN PHẨM</span>
                </nav>
            </div>

            <div className="container-ux">
                {/* HEADER TRANG */}
                <header className="text-center mb-16 space-y-4">
                    <div className="flex items-center justify-center gap-3 text-[#b72828] mb-2">
                        <LayoutGrid size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                            Collections
                        </span>
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
                {categoriesRes.docs.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {categoriesRes.docs.map((cat: any) => {
                            return (
                                <Link
                                    href={`/categories/${cat.slug}`}
                                    key={cat.id}
                                    className="group relative flex flex-col bg-white rounded-[2rem] overflow-hidden shadow-sm border border-white hover:shadow-xl transition-all duration-500"
                                >
                                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                        <OptimizedImage
                                            media={cat.image}
                                            size="card"
                                            alt={cat.name}
                                            className="group-hover:scale-110 transition-transform duration-1000 ease-in-out"
                                        />

                                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors duration-500" />
                                    </div>

                                    <div className="p-6 text-center space-y-2">
                                        <h3 className="text-lg font-bold text-black group-hover:text-[#b72828] transition-colors duration-300 font-sans uppercase tracking-tight">
                                            {cat.name}
                                        </h3>

                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                View Collection
                                            </span>
                                            <ChevronRight
                                                size={10}
                                                className="text-[#b72828] group-hover:translate-x-1 transition-transform"
                                            />
                                        </div>
                                    </div>

                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-[#b72828] group-hover:w-full transition-all duration-500"></div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] p-10 text-center text-gray-500">
                        Chưa có danh mục nào.
                    </div>
                )}

                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                    <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
                        {currentPage > 1 && (
                            <Link
                                href={getPageHref(currentPage - 1)}
                                className="h-11 px-4 rounded-full bg-white border border-gray-200 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-black hover:text-white transition-all"
                            >
                                <ChevronLeft size={14} />
                                Trước
                            </Link>
                        )}

                        {currentPage > 3 && (
                            <>
                                <Link
                                    href={getPageHref(1)}
                                    className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all"
                                >
                                    1
                                </Link>
                                <span className="px-2 text-gray-400">...</span>
                            </>
                        )}

                        {getPageNumbers().map((page) => (
                            <Link
                                key={page}
                                href={getPageHref(page)}
                                className={
                                    page === currentPage
                                        ? 'w-11 h-11 rounded-full bg-[#b72828] text-white flex items-center justify-center text-sm font-black shadow-lg'
                                        : 'w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all'
                                }
                            >
                                {page}
                            </Link>
                        ))}

                        {currentPage < totalPages - 2 && (
                            <>
                                <span className="px-2 text-gray-400">...</span>
                                <Link
                                    href={getPageHref(totalPages)}
                                    className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-black hover:text-white transition-all"
                                >
                                    {totalPages}
                                </Link>
                            </>
                        )}

                        {currentPage < totalPages && (
                            <Link
                                href={getPageHref(currentPage + 1)}
                                className="h-11 px-4 rounded-full bg-white border border-gray-200 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-black hover:text-white transition-all"
                            >
                                Sau
                                <ChevronRight size={14} />
                            </Link>
                        )}
                    </div>
                )}

                {/* FOOTER TRANG DANH MỤC */}
                <div className="mt-20 p-10 bg-white rounded-[3rem] border border-white shadow-sm text-center space-y-6">
                    <h4 className="text-xl font-bold font-heading text-black">
                        Bạn cần tìm sản phẩm chuyên biệt?
                    </h4>

                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Đội ngũ chuyên gia của MF Paris luôn sẵn sàng tư vấn lộ trình chăm sóc da và mùi hương phù hợp nhất với bạn.
                    </p>

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