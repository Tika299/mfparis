export const dynamic = 'force-dynamic'
export const revalidate = 0
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
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Link from 'next/link'
import { HomeProductTabs } from '@/components/HomeProductTabs'
import { FlashSaleSection } from '@/components/FlashSaleSection'

// ─── Dữ liệu tĩnh ────────────────────────────────────────────────────────────

const policies = [
  {
    title: 'Giao nhanh 2h',
    description: 'Nội thành Sài Gòn',
    icon: Truck,
    iconClass: 'bg-blue-50 text-blue-600',
  },
  {
    title: '100% Chính hãng',
    description: 'Pháp & Châu Âu',
    icon: ShieldCheck,
    iconClass: 'bg-green-50 text-green-600',
  },
  {
    title: 'Đổi trả 7 ngày',
    description: 'Bảo hành uy tín',
    icon: RotateCcw,
    iconClass: 'bg-orange-50 text-orange-600',
  },
  {
    title: 'Dịch vụ Luxury',
    description: 'Tư vấn tận tâm',
    icon: Award,
    iconClass: 'bg-red-50 text-primary',
  },
]

const chunkByTwo = <T,>(items: T[]) => {
  const chunks: T[][] = []

  for (let i = 0; i < items.length; i += 2) {
    chunks.push(items.slice(i, i + 2))
  }

  return chunks
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })

  const [
    settings,
    flashSaleRes,
    bestSellersRes,
    newArrivalsRes,
    comboProductsRes,
    categoriesRes,
    brandsRes,
    postsRes,
  ] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'flash-sale' } },
        ],
      },
      depth: 2,
      sort: '-updatedAt',
      limit: 12,
    }),
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'best-seller' } },
        ],
      },
      limit: 6,
    }),
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'new-arrival' } },
        ],
      },
      sort: '-createdAt',
      limit: 8,
    }),
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'combo' } },
        ],
      },
      limit: 8,
    }),
    payload.find({ collection: 'categories', limit: 14 }),
    payload.find({ collection: 'brands', limit: 12 }),
    payload.find({ collection: 'posts', limit: 6 }),
  ])

  const categoryPairs = chunkByTwo(categoriesRes.docs)
  const brandPairs = chunkByTwo(brandsRes.docs)

  return (
    <main className="min-h-screen pb-16 antialiased">

      {/* ── 1. HERO SLIDER ──────────────────────────────────────────────────── */}
      <section className="container-ux pt-4 md:pt-6">
        <div className="overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white bg-white shadow-sm p-0">
          <HeroSlider sliders={settings?.heroSliders ?? []} />
        </div>
      </section>

      {/* ── 2. CHÍNH SÁCH CAM KẾT ───────────────────────────────────────────── */}
      <section className="container-ux mt-6">
        <div className="lc-card grid grid-cols-2 gap-4 p-4 sm:p-5 lg:grid-cols-4">
          {policies.map((item, index) => {
            const Icon = item.icon
            const isLast = index === policies.length - 1
            return (
              <div
                key={item.title}
                className={`flex items-center gap-3 lg:justify-center ${!isLast ? 'lg:border-r lg:border-gray-100' : ''
                  }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-tight">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] text-gray-400">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 3. FLASH SALE ─────────────────────────────────────────────────────── */}
      {settings?.flashSale?.enabled !== false && (
        <FlashSaleSection
          products={flashSaleRes.docs}
          categories={categoriesRes.docs}
          endTime={settings?.flashSale?.endTime || '2026-06-30T23:59:59+07:00'}
          vouchers={settings?.flashSale?.vouchers || []}
        />
      )}

      {/* ── 3. SẢN PHẨM BÁN CHẠY ───────────────────────────────────────────── */}
      <HomeProductTabs
        bestSellers={bestSellersRes.docs}
        newArrivals={newArrivalsRes.docs}
        combos={comboProductsRes.docs}
      />

      {/* ── 4. DANH MỤC NỔI BẬT ────────────────────────────────────────────── */}
      <section className="container-ux mt-8 md:mt-10">
        <div className="lc-card rounded-[2rem] p-5 sm:p-6 md:rounded-[2.5rem] md:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-4 px-1 md:mb-10 md:px-2">
            <div>
              <span className="sub-heading text-neutral-400">Browse</span>
              <h2 className="font-heading text-2xl font-bold md:text-3xl text-neutral-900">
                Danh mục nổi bật
              </h2>
            </div>
            <Link
              href="/categories"
              className="shrink-0 border-b border-primary text-[11px] font-black uppercase tracking-wider text-primary transition-colors hover:border-black hover:text-black"
            >
              Khám phá
            </Link>
          </div>

          {/* Slider Danh mục */}
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="relative w-full"
          >
            <CarouselContent className="-ml-4 pb-2 md:-ml-5">
              {categoryPairs.map((pair: any[], index: number) => (
                <CarouselItem
                  key={index}
                  className="basis-[52%] pl-4 sm:basis-[38%] md:basis-[28%] md:pl-5 lg:basis-[22%] xl:basis-[18%]"
                >
                  <div className="grid grid-rows-2 gap-4">
                    {pair.map((cat: any) => (
                      <Link
                        key={cat.id}
                        href={`/categories/${cat.slug}`}
                        className="group flex min-w-0 flex-col items-center rounded-2xl border border-transparent p-2.5 transition-colors hover:border-primary/20"
                      >
                        <div className="mb-3 flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white md:h-[102px] md:w-[102px]">
                          <div className="relative h-[62px] w-[62px] overflow-hidden md:h-[74px] md:w-[74px]">
                            <OptimizedImage
                              media={cat.image}
                              size="thumbnail"
                              alt={cat.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </div>

                        <span className="line-clamp-2 min-h-[32px] w-full px-1 text-center text-[11px] font-black uppercase tracking-tight text-neutral-800 transition-colors group-hover:text-primary md:text-[12px]">
                          {cat.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
            <CarouselNext className="absolute -right-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
          </Carousel>
        </div>
      </section>

      {/* ── 5. COMBO TIẾT KIỆM ─────────────────────────────────────────────── */}
      {/* <section className="container-ux mt-10 md:mt-12">
        
        <div className="rounded-[2rem] border border-neutral-100 bg-[#faf7f5] p-5 shadow-sm md:rounded-[2.5rem] md:p-12">

          
          <div className="mb-8 flex flex-col gap-5 px-1 md:mb-10 md:flex-row md:items-end md:justify-between md:px-2">
            <div className="max-w-2xl">
              <span className="sub-heading text-primary">Expert Choice</span>
              <h2 className="heading-product">Combo tiết kiệm</h2>
              <p className="mt-3 max-w-xl text-sm  leading-relaxed text-neutral-500">
                Các bộ sản phẩm được dược sĩ MF Paris thiết kế riêng cho lộ trình của bạn.
              </p>
            </div>
            <Link
              href="/products?isCombo=true"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-7 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-100 transition-colors hover:bg-black"
            >
              Xem tất cả bộ combo
            </Link>
          </div>

          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cleansingRes.docs.map((product) => (
              <div
                key={product.id}
                className="lc-card rounded-3xl p-3"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ── 6. THƯƠNG HIỆU ĐỐI TÁC ─────────────────────────────────────────── */}
      <section className="container-ux mt-10 md:mt-12">
        <Carousel
          opts={{ align: 'start', loop: true }}
          className="lc-card relative overflow-hidden rounded-[2rem] p-5 md:rounded-[2.5rem] md:p-12"
        >
          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-4 px-1 md:mb-10 md:px-2">
            <div>
              <span className="sub-heading">Partners</span>
              <h2 className="font-heading text-2xl font-bold  md:text-3xl">
                Đối tác thương hiệu
              </h2>
              <div className="mt-3 h-0.5 w-12 bg-primary" />
            </div>
            <div className="flex gap-2 relative">
              <CarouselPrevious className="absolute h-10 w-10 top-[26px] left-[-90px] rounded-full border-neutral-200 text-neutral-700 shadow-sm transition-all hover:bg-primary hover:text-white" />
              <CarouselNext className="absolute h-10 w-10 top-[26px] left-[-42px] rounded-full border-neutral-200 text-neutral-700 shadow-sm transition-all hover:bg-primary hover:text-white" />
            </div>
          </div>

          {/* Brands */}
          <CarouselContent className="-ml-4">
            {brandPairs.map((pair: any[], index: number) => (
              <CarouselItem
                key={index}
                className="basis-1/2 pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <div className="grid grid-rows-2 gap-4">
                  {pair.map((brand: any) => {
                    const logo = brand.logo
                    const hasLogo = logo && typeof logo === 'object' && logo.url

                    return (
                      <Link
                        key={brand.id}
                        href={`/brands/${brand.slug}`}
                        className="group flex h-20 items-center justify-center rounded-2xl border border-neutral-50 bg-white px-4 opacity-50 grayscale transition duration-700 hover:border-primary/30 hover:opacity-100 hover:grayscale-0 hover:shadow-inner"
                      >
                        {hasLogo ? (
                          <OptimizedImage
                            media={logo}
                            size="thumbnail"
                            alt={brand.name}
                            className="max-h-8 w-full object-contain"
                          />
                        ) : (
                          <span className="text-center text-lg font-black tracking-tighter text-neutral-700 group-hover:text-primary">
                            {brand.name}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* ── 7. TẠP CHÍ LÀM ĐẸP ─────────────────────────────────────────────── */}
      <section className="mt-10 border-t border-gray-100 py-12 md:mt-12 md:py-20">
        <div className="container-ux">
          <Carousel opts={{ align: 'start', loop: true }} className="relative w-full">
            <div className="lc-card rounded-[2rem] px-5 py-10 md:rounded-[2.5rem] md:px-12 md:py-16">

              {/* Header */}
              <div className="mb-10 flex items-center justify-between gap-4 px-1 md:mb-12 md:px-2">
                <div>
                  <span className="sub-heading">Beauty Journal</span>
                  <h2 className="heading-section text-left text-3xl md:text-4xl">
                    Tạp chí làm đẹp
                  </h2>
                  <div className="mt-3 h-1 w-12 rounded-full bg-primary" />
                </div>
                <Link
                  href="/blog"
                  className="shrink-0 rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-primary md:px-8 md:text-[11px]"
                >
                  Xem thêm
                </Link>
              </div>

              {/* Posts */}
              <CarouselContent className="-ml-6 md:-ml-8">
                {postsRes.docs.map((post: any) => {
                  const date = post.publishedAt
                    ? new Date(post.publishedAt)
                    : new Date(post.createdAt)

                  return (
                    <CarouselItem
                      key={post.id}
                      className="basis-full pl-6 sm:basis-1/2 md:pl-8 lg:basis-1/3"
                    >
                      <article className="group h-full">
                        <Link href={`/blog/${post.slug}`} className="block h-full">

                          {/* Thumbnail */}
                          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-neutral-100 shadow-md md:rounded-[2rem]">
                            <OptimizedImage
                              media={post.thumbnail}
                              size="card"
                              alt={post.title}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                            />
                            {/* Badge ngày */}
                            <div className="absolute left-4 top-4 flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/50 bg-white/90 shadow-xl backdrop-blur md:left-6 md:top-6">
                              <span className="text-xl font-black leading-none text-primary">
                                {String(date.getDate()).padStart(2, '0')}
                              </span>
                              <span className="mt-1 text-[9px] font-black uppercase leading-none text-neutral-500">
                                TH {date.getMonth() + 1}
                              </span>
                            </div>
                          </div>

                          {/* Nội dung */}
                          <div className="space-y-3 px-3 pt-7 text-center md:px-4 md:pt-8">
                            <h3 className="line-clamp-2 min-h-[56px] text-xl font-bold leading-snug tracking-tight text-gray-900 transition-colors group-hover:text-primary">
                              {post.title}
                            </h3>
                            <p className="mx-auto line-clamp-3 max-w-[300px] text-sm leading-relaxed text-gray-400">
                              {post.excerpt}
                            </p>
                          </div>
                        </Link>
                      </article>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
            </div>

            <CarouselPrevious className="absolute -left-2 top-1/2 z-30 h-12 w-12 border-none bg-white text-gray-400 shadow-xl transition-all hover:bg-primary hover:text-white md:-left-6" />
            <CarouselNext className="absolute -right-2 top-1/2 z-30 h-12 w-12 border-none bg-white text-gray-400 shadow-xl transition-all hover:bg-primary hover:text-white md:-right-6" />
          </Carousel>
        </div>
      </section>

    </main>
  )
}