import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { HeroSlider } from '@/components/HeroSlider'
import { HomeTabs } from '@/components/HomeTabs'
import { Truck, Smile, RotateCcw, ArrowRight } from 'lucide-react'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'
import Image from 'next/image'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  // 1. Fetch dữ liệu đồng bộ từ Database
  const [settings, bestSellersRes, cleansingRes, categoriesRes, brandsRes, postsRes] =
    await Promise.all([
      payload.findGlobal({ slug: 'site-settings' }),
      // Lấy sản phẩm Bán chạy
      payload.find({
        collection: 'products',
        where: {
          and: [
            { status: { equals: 'published' } },
            { displayLocation: { contains: 'best-seller' } },
          ],
        },
        limit: 8,
      }),
      // Lấy sản phẩm mục Làm sạch da
      payload.find({
        collection: 'products',
        where: {
          and: [
            { status: { equals: 'published' } },
            { displayLocation: { contains: 'cleansing' } },
          ],
        },
        limit: 4,
      }),
      payload.find({ collection: 'categories', limit: 10 }),
      payload.find({ collection: 'brands', limit: 8 }),
      payload.find({ collection: 'posts', limit: 4 }),
    ])

  const featuredCats = categoriesRes.docs.slice(0, 2)
  const listCats = categoriesRes.docs

  return (
    <div className="bg-[#FDFBF9] min-h-screen">
      {/* 1. HERO SLIDER */}
      {settings.heroSliders && settings.heroSliders.length > 0 ? (
        <HeroSlider sliders={settings.heroSliders} />
      ) : (
        /* Fallback nếu Admin chưa có Slider */
        <section className="bg-[#161A1E] text-white py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between min-h-[500px]">
            <div className="md:w-1/2 z-10 mb-10 md:mb-0 space-y-6">
              <span className="bg-amber-600 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                New Collection
              </span>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter italic font-serif">
                Làm dịu làn da
                <br />
                Cấp ẩm cả ngày
              </h1>
              <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                Khám phá dòng sản phẩm chuyên sâu giúp phục hồi và nuôi dưỡng làn da từ tinh hoa
                Pháp.
              </p>
              <Link
                href="/products"
                className="inline-block bg-white text-black px-10 py-4 rounded-full font-bold uppercase text-[11px] tracking-widest hover:bg-gray-100 transition shadow-lg"
              >
                Mua ngay
              </Link>
            </div>
            <div className="md:w-1/2 flex justify-end">
              <div className="relative aspect-square w-full max-w-[450px] overflow-hidden rounded-2xl shadow-2xl">
                {/* Dùng Image thường cho URL bên ngoài */}
                <Image
                  src="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=800"
                  alt="Hero"
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. BRAND MARQUEE */}
      <div className="bg-white border-b border-gray-100 py-6 overflow-hidden">
        <div className="container mx-auto px-6 flex justify-between items-center text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase">
          <span>DỊU NHẸ CHO DA</span>
          <span className="hidden md:inline">THÀNH PHẦN TỰ NHIÊN</span>
          <span>KHÔNG KÍCH ỨNG</span>
          <span className="hidden md:inline">CHUYÊN GIA KHUYÊN DÙNG</span>
          <span>MF PARIS AUTHENTIC</span>
        </div>
      </div>

      {/* 3. SẢN PHẨM BÁN CHẠY */}
      <section className="py-10">
        <HomeTabs initialProducts={bestSellersRes.docs} categories={listCats.slice(0, 3)} />
      </section>

      {/* 4. KHÁM PHÁ DANH MỤC */}
      <section className="bg-white py-24 border-y border-gray-50">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {featuredCats.map((cat: any) => (
            <div
              key={cat.id}
              className="md:col-span-4 relative aspect-square rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-gray-50"
            >
              {/* TRUYỀN NGUYÊN OBJECT cat.image */}
              <OptimizedImage
                media={cat.image}
                alt={cat.name}
                size="card"
                className="absolute inset-0 w-full h-full group-hover:scale-110 transition duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <div>
                  <h3 className="text-white text-2xl font-bold italic font-serif uppercase tracking-tighter">
                    {cat.name}
                  </h3>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="text-white/80 text-[10px] font-bold uppercase tracking-widest underline mt-2 block"
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <div className="md:col-span-4 md:pl-10">
            <h2 className="text-4xl font-bold mb-10 leading-tight font-serif italic">
              Khám phá
              <br />
              danh mục
            </h2>
            <ul className="space-y-6 text-xs font-bold uppercase tracking-widest text-gray-500">
              {listCats.map((cat: any) => (
                <li
                  key={cat.id}
                  className="flex justify-between items-center border-b pb-4 cursor-pointer hover:text-amber-700 transition-colors"
                >
                  <Link href={`/categories/${cat.slug}`}>{cat.name}</Link>
                  <Link href={`/categories/${cat.slug}`}>
                    <ArrowRight
                      size={14}
                      className="text-gray-400 group-hover:text-black transition-colors"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. CHÍNH SÁCH TIỆN ÍCH */}
      <section className="py-16 bg-[#FDFBF9]">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            {
              icon: <Truck size={24} />,
              title: 'Miễn phí vận chuyển',
              desc: 'Cho đơn hàng từ 500k trở lên',
            },
            {
              icon: <Smile size={24} />,
              title: 'Khách hàng hài lòng',
              desc: '99% đánh giá 5 sao từ người dùng',
            },
            {
              icon: <RotateCcw size={24} />,
              title: 'Hoàn trả nhanh chóng',
              desc: 'Đổi trả dễ dàng trong vòng 7 ngày',
            },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-50">
                {item.icon}
              </div>
              <h4 className="font-bold text-xs uppercase tracking-widest">{item.title}</h4>
              <p className="text-[11px] text-gray-500 mt-2 uppercase tracking-tighter italic">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. LÀM SẠCH LÀN DA */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-serif">Làm sạch làn da</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12 lg:gap-x-10">
          {cleansingRes.docs.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 7. THƯƠNG HIỆU NỔI BẬT */}
      <section className="bg-gray-50 py-16 border-y border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-12">Thương hiệu nổi bật</h2>
          <div className="flex flex-wrap justify-center items-center opacity-40 grayscale gap-12">
            {brandsRes.docs.map((brand: any) => (
              <span key={brand.id} className="text-xl font-black uppercase tracking-tighter">
                {brand.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 8. BLOG / CÂU CHUYỆN */}
      <section className="container mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold italic font-serif leading-tight text-[#16423C]">
              Câu chuyện & <br /> Ghi chú chăm sóc da
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-xs font-bold uppercase border-b-2 border-black pb-1 hover:text-amber-700 hover:border-amber-700 transition-all"
          >
            Xem tất cả bài viết
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {postsRes.docs.map((post: any, i: number) => (
            <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col">
              {/* KHUNG ẢNH 16:9 */}
              <div className="relative aspect-video w-full rounded-[1.5rem] overflow-hidden shadow-sm bg-gray-100 mb-5">
                <OptimizedImage
                  media={post.thumbnail}
                  alt={post.title}
                  size="card"
                  className="group-hover:scale-110 transition duration-1000"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {post.categories?.[0]?.name || 'Tin tức'}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h3 className="font-bold text-sm leading-snug group-hover:text-amber-800 transition-colors line-clamp-2 min-h-[40px]">
                  {post.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
