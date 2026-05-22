import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { HeroSlider } from '@/components/HeroSlider'
import { OptimizedImage } from '@/components/OptimizedImage'
import {
  ChevronRight,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from 'next/link'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  // 1. Fetch dữ liệu đồng bộ từ Database
  const [
    settings,
    bestSellersRes,
    cleansingRes,
    categoriesRes,
    brandsRes,
    postsRes
  ] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    // Lấy sản phẩm Bán chạy
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'best-seller' } }
        ]
      },
      limit: 6,
    }),
    // Lấy Combo (Làm sạch da)
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { isCombo: { equals: true } }
        ]
      },
      limit: 4,
    }),
    payload.find({ collection: 'categories', limit: 8 }),
    payload.find({ collection: 'brands', limit: 10 }),
    payload.find({ collection: 'posts', limit: 4 }),
  ])

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-16 antialiased">

      {/* 1. HERO SLIDER - Bọc trong container để quy định kích thước */}
      <section className="container mx-auto px-4 md:px-6 pt-4">
        <div className="rounded-[2rem] overflow-hidden shadow-sm">
          <HeroSlider sliders={settings?.heroSliders} />
        </div>
      </section>

      {/* 2. CHÍNH SÁCH CAM KẾT (Quick Info) */}
      <section className="container mx-auto px-4 md:px-6 mt-6">
        <div className="bg-white rounded-2xl p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm border border-white">
          <div className="flex items-center gap-3 border-r border-gray-100 last:border-0">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight">Giao nhanh 2h</p>
              <p className="text-[10px] text-gray-400">Nội thành Sài Gòn</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-gray-100 last:border-0">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight">100% Chính hãng</p>
              <p className="text-[10px] text-gray-400">Phát hiện giả đền x10</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-gray-100 last:border-0">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight">Đổi trả 7 ngày</p>
              <p className="text-[10px] text-gray-400">Bảo hành uy tín</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-gray-100 last:border-0">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight">Dịch vụ Luxury</p>
              <p className="text-[10px] text-gray-400">Tư vấn tận tâm</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SẢN PHẨM BÁN CHẠY (Grid 6 cột Desktop) */}
      <section className="container mx-auto px-4 md:px-6 mt-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                <Zap size={22} fill="currentColor" />
              </div>
              <h2 className="text-2xl font-bold font-serif">Sản phẩm bán chạy</h2>
            </div>
            <Link href="/products" className="text-blue-600 text-sm font-bold flex items-center hover:gap-2 transition-all">
              Xem tất cả <ChevronRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {bestSellersRes.docs.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. DANH MỤC NỔI BẬT (Circle Icons) */}
      <section className="container mx-auto px-4 md:px-6 mt-8">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-800 text-center md:text-left">Danh mục nổi bật</h2>
            <Link href="/categories" className="text-blue-600 text-sm font-bold flex items-center hover:gap-2 transition-all">
              Xem tất cả <ChevronRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
            {categoriesRes.docs.map((cat: any) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="flex flex-col items-center group">
                <div className="w-20 h-20 rounded-full bg-[#FDFBF9] flex items-center justify-center mb-3 group-hover:bg-amber-50 transition-all duration-500 border border-gray-50 shadow-inner">
                  <div className="w-12 h-12 relative overflow-hidden rounded-lg">
                    <OptimizedImage media={cat.image} size="thumbnail" alt={cat.name} />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-center text-gray-600 group-hover:text-amber-800 transition-colors uppercase tracking-tighter">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: COMBO TIẾT KIỆM - SIMPLE CLEAN */}
      <section className="container mx-auto px-4 md:px-6 mt-16 mb-16">
        <div className="rounded-3xl bg-[#faf7f5] border border-neutral-100 p-5 md:p-8">

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b72828]">
                Combo chăm sóc
              </p>

              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-neutral-900">
                Combo tiết kiệm
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                Các bộ sản phẩm được MF Paris chọn sẵn theo từng nhu cầu chăm sóc da,
                giúp bạn dễ chọn hơn và tiết kiệm hơn.
              </p>
            </div>

            <Link
              href="/products?isCombo=true"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#b72828] px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-neutral-900"
            >
              Xem combo
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cleansingRes?.docs?.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white p-2 shadow-sm transition hover:shadow-md"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* SECTION 6: THƯƠNG HIỆU ĐỐI TÁC - SIMPLE LOGO SLIDER */}
      <section className="container mx-auto px-4 md:px-6 mt-16 mb-16">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="rounded-3xl bg-white border border-neutral-100 p-5 md:p-8"
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b72828]">
                Thương hiệu
              </p>

              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">
                Đối tác thương hiệu
              </h2>
            </div>

            <div className="flex gap-2">
              <CarouselPrevious className="static h-10 w-10 translate-y-0 rounded-full border-neutral-200 text-neutral-700 hover:bg-[#b72828] hover:text-white" />
              <CarouselNext className="static h-10 w-10 translate-y-0 rounded-full border-neutral-200 text-neutral-700 hover:bg-[#b72828] hover:text-white" />
            </div>
          </div>

          <CarouselContent className="-ml-4 items-center">
            {brandsRes.docs.map((brand: any) => {
              const logo = brand.logo;
              const hasLogo = logo && typeof logo === "object" && logo.url;

              return (
                <CarouselItem
                  key={brand.id}
                  className="pl-4 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                >
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="group flex h-20 items-center justify-center rounded-2xl border border-neutral-100 bg-white px-4 transition hover:border-[#b72828]/30 hover:shadow-sm"
                  >
                    {hasLogo ? (
                      <OptimizedImage
                        media={logo}
                        size="thumbnail"
                        alt={brand.name}
                        className="max-h-10 w-full object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                      />
                    ) : (
                      <span className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-700 group-hover:text-[#b72828]">
                        {brand.name}
                      </span>
                    )}
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </section>


      {/* SECTION 7: TẠP CHÍ LÀM ĐẸP */}
      <section className="bg-[#f4f5f6] py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">

          {/* Thẻ Carousel chính - Xóa overflow-hidden ở đây để nút không bị biến mất */}
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="relative w-full"
          >
            {/* Khung nội dung trắng - Đưa bo tròn và padding vào đây thay vì thẻ Carousel */}
            <div className="rounded-[20px] bg-white px-6 py-8 md:px-10 md:py-12 shadow-sm">

              {/* Header: Tiêu đề và Nút Xem thêm */}
              <div className="mb-10 flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-black font-serif italic">
                    Tạp chí làm đẹp
                  </h2>
                  <div className="h-1 w-12 bg-[#b72828] rounded-full"></div>
                </div>

                <Link
                  href="/blog"
                  className="rounded-full bg-black px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#b72828] shadow-lg active:scale-95"
                >
                  Xem Thêm
                </Link>
              </div>

              {/* Blog Content Slider */}
              <CarouselContent className="-ml-6">
                {postsRes.docs.map((post: any) => {
                  const date = post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt);
                  const day = String(date.getDate()).padStart(2, "0");
                  const month = `TH${date.getMonth() + 1}`;

                  return (
                    <CarouselItem
                      key={post.id}
                      className="pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
                    >
                      <article className="group h-full">
                        <Link href={`/blog/${post.slug}`} className="block h-full">
                          {/* Image Wrapper */}
                          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100 shadow-md">
                            <OptimizedImage
                              media={post.thumbnail}
                              size="card"
                              alt={post.title}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            {/* Date Badge - Thiết kế lại cho chuyên nghiệp */}
                            <div className="absolute left-5 top-5 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50">
                              <span className="text-xl font-black leading-none text-[#b72828]">
                                {day}
                              </span>
                              <span className="mt-1 text-[9px] font-black uppercase leading-none text-neutral-500 tracking-tighter">
                                {month}
                              </span>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div className="pt-6 text-center space-y-3">
                            <h3 className="line-clamp-2 min-h-[56px] text-xl font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#b72828] px-2 font-sans">
                              {post.title}
                            </h3>

                            {post.excerpt && (
                              <p className="mx-auto line-clamp-3 max-w-[300px] text-sm leading-relaxed text-gray-500">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </Link>
                      </article>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </div>

            {/* 
          NÚT ĐIỀU HƯỚNG: 
          - Đặt z-30 để luôn nằm trên cùng.
          - Thay đổi vị trí: Đưa vào trong lề của container để tránh bị vỡ layout trên màn hình nhỏ.
      */}
            <CarouselPrevious className="absolute -left-2 md:-left-6 top-1/2 z-30 h-12 w-12 -translate-y-1/2 border-none bg-white shadow-xl text-gray-400 hover:bg-[#b72828] hover:text-white transition-all duration-300" />

            <CarouselNext className="absolute -right-2 md:-right-6 top-1/2 z-30 h-12 w-12 -translate-y-1/2 border-none bg-white shadow-xl text-gray-400 hover:bg-[#b72828] hover:text-white transition-all duration-300" />

            {/* Pagination Dots giả lập (Có thể bỏ qua nếu nút đã hoạt động tốt) */}
            <div className="mt-10 flex items-center justify-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-[#b72828]"></div>
              <div className="h-1.5 w-2 rounded-full bg-gray-300"></div>
              <div className="h-1.5 w-2 rounded-full bg-gray-300"></div>
            </div>
          </Carousel>
        </div>
      </section>

    </div>
  )
}