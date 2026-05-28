import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/ProductCard'
import { SearchFilters } from '@/components/SearchFilters'
import { OptimizedImage } from '@/components/OptimizedImage'

export default async function BrandProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ min?: string; max?: string; sort?: string; category?: string }>
}) {
  const { slug } = await params
  const { min, max, sort, category } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // 1. Lấy thông tin chi tiết của Brand hiện tại
  const brandRes = await payload.find({
    collection: 'brands',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const currentBrand: any = brandRes.docs[0]
  if (!currentBrand) notFound()

  // 2. Xây dựng Query lọc: Sản phẩm thuộc Brand này + các bộ lọc từ URL
  const whereQueries: any = {
    and: [
      { status: { equals: 'published' } },
      { brand: { equals: currentBrand.id } }, // brand cố định theo slug
    ],
  }

  // category là filter cộng thêm
  if (category) whereQueries.and.push({ 'categories.slug': { equals: category } })

  if (min) whereQueries.and.push({ 'price.basePrice': { greater_than_equal: Number(min) } })
  if (max) whereQueries.and.push({ 'price.basePrice': { less_than_equal: Number(max) } })



  // 3. Lấy dữ liệu đồng thời: Sản phẩm và Danh sách hãng (cho sidebar)
  const [productsRes, allBrandsRes, categoriesRes] = await Promise.all([
    payload.find({
      collection: 'products',
      where: whereQueries,
      sort: sort || '-createdAt',
      limit: 40,
      depth: 2,
    }),
    payload.find({ collection: 'brands', limit: 100 }),
    payload.find({ collection: 'categories', limit: 100 }),
  ])

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20">
      {/* PHẦN ĐẦU TRANG: THÔNG TIN THƯƠNG HIỆU */}
      <div className="bg-white border-b border-gray-100 mb-10 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 relative rounded-[2.5rem] overflow-hidden border-4 border-[#FDFBF9] shadow-2xl bg-white p-4">
            <OptimizedImage
              media={currentBrand.logo}
              alt={currentBrand.name}
              size="card"
              className="object-contain w-full h-full"
            />
          </div>
          <div className="text-center md:text-left flex-grow">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-700 mb-2 block">
              Thương hiệu
            </span>
            <h1 className="text-5xl font-bold font-serif italic text-gray-900 leading-none">
              {currentBrand.name}
            </h1>
            <div className="mt-4 text-gray-500 text-sm max-w-2xl leading-relaxed">
              {currentBrand.description ? (
                <div dangerouslySetInnerHTML={{ __html: currentBrand.description }} />
              ) : (
                <p>
                  Khám phá thế giới làm đẹp và những sản phẩm tinh túy nhất từ {currentBrand.name}{' '}
                  tại MF Paris.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* THÂN TRANG: CẤU TRÚC SIDEBAR TRÁI */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20">
        {/* SIDEBAR FILTER (BÊN TRÁI - 3 CỘT) */}
        <aside className="lg:col-span-3">
          <div className="sticky top-28 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-gray-100">
              <SearchFilters brands={allBrandsRes.docs} categories={categoriesRes.docs} />
            </div>

            {/* Quảng cáo nhỏ hoặc Banner phụ (Tùy chọn) */}
            <div className="hidden lg:block relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-black/20 z-10" />
              <img
                src="https://images.unsplash.com/photo-1615655093950-3a131062080a?q=80&w=600"
                className="object-cover w-full h-full"
                alt="Promo"
              />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6 text-center">
                <p className="text-[8px] font-bold uppercase tracking-widest mb-2">
                  MF Paris Exclusive
                </p>
                <h4 className="font-serif italic text-lg leading-tight">
                  Miễn phí gói quà cho đơn hàng {currentBrand.name}
                </h4>
              </div>
            </div>
          </div>
        </aside>

        {/* DANH SÁCH SẢN PHẨM (BÊN PHẢI - 9 CỘT) */}
        <main className="lg:col-span-9">
          <div className="flex justify-between items-center mb-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Hiển thị {productsRes.docs.length} sản phẩm
            </p>
            <div className="h-px flex-grow mx-8 bg-gray-100 hidden md:block"></div>
          </div>

          {productsRes.docs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-16">
              {productsRes.docs.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="py-40 text-center bg-white rounded-[3.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Không tìm thấy sản phẩm nào
              </p>
              <p className="text-xs text-gray-300 mt-2 italic">
                Vui lòng thử điều chỉnh bộ lọc giá
              </p>
            </div>
          )}

          {/* Phân trang (Nếu cần sau này) */}
          {productsRes.totalPages > 1 && (
            <div className="mt-20 flex justify-center">
              <button className="px-10 py-4 rounded-full border border-black font-bold uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all">
                Tải thêm sản phẩm
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
