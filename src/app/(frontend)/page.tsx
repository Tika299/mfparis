import type { Metadata } from 'next'

export const revalidate = 300

import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  Award,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { HeroSlider } from '@/components/HeroSlider'
import { OptimizedImage } from '@/components/OptimizedImage'
import { FlashSaleSection } from '@/components/FlashSaleSection'
import { HomeProductTabs } from '@/components/HomeProductTabs'
import { BeautyJournalSection } from '@/components/home/BeautyJournalSection'
import { StoreIntro } from '@/components/home/StoreIntro'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { SITE_ORIGIN } from '@/utilities/seo'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

const homeTitle =
  'Nước hoa, mỹ phẩm chính hãng từ Pháp'
const homeDescription =
  'Khám phá nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng từ Pháp tại MF Paris. Tuyển chọn cao cấp, tư vấn tận tâm và giao hàng toàn quốc.'

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: SITE_ORIGIN,
    siteName: 'MF Paris',
    title: `${homeTitle} | MF Paris`,
    description: homeDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${homeTitle} | MF Paris`,
    description: homeDescription,
  },
}

/* =========================================================
   CHÍNH SÁCH
========================================================= */

const policies = [
  {
    title: 'Giao nhanh 2h',
    description: 'Nội thành Sài Gòn',
    icon: Truck,
    iconClass:
      'bg-blue-50 text-blue-600',
  },
  {
    title: '100% Chính hãng',
    description: 'Pháp & Châu Âu',
    icon: ShieldCheck,
    iconClass:
      'bg-green-50 text-green-600',
  },
  {
    title: 'Đổi trả 7 ngày',
    description: 'Bảo hành uy tín',
    icon: RotateCcw,
    iconClass:
      'bg-orange-50 text-orange-600',
  },
  {
    title: 'Dịch vụ Luxury',
    description: 'Tư vấn tận tâm',
    icon: Award,
    iconClass:
      'bg-red-50 text-primary',
  },
]

/* =========================================================
   HOMEPAGE
========================================================= */

export default async function HomePage() {
  const payload = await getPayload({
    config: configPromise,
  })

  const productListSelect = {
    id: true,
    title: true,
    slug: true,
    sku: true,
    brand: true,
    price: true,
    images: true,
    averageRating: true,
    reviewCount: true,
    status: true,
    productType: true,
    variants: {
      id: true,
      name: true,
      sku: true,
      basePrice: true,
      salePrice: true,
      stock: true,
      isActive: true,
      isDefault: true,
      image: true,
    },
  } as const

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
    payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    }),

    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'flash-sale' } },
        ],
      },
      depth: 1,
      select: productListSelect,
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
      depth: 1,
      select: productListSelect,
      sort: '-updatedAt',
      limit: 12,
    }),

    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'new-arrival' } },
        ],
      },
      depth: 1,
      select: productListSelect,
      sort: '-createdAt',
      limit: 12,
    }),

    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { displayLocation: { contains: 'combo' } },
        ],
      },
      depth: 1,
      select: productListSelect,
      sort: '-updatedAt',
      limit: 12,
    }),

    payload.find({
      collection: 'categories',
      depth: 2,
      sort: 'name',
      limit: 20,
    }),

    payload.find({
      collection: 'brands',
      depth: 2,
      sort: 'name',
      limit: 24,
    }),

    payload.find({
      collection: 'posts',
      depth: 2,
      sort: '-createdAt',
      limit: 12,
    }),
  ])

  return (
    <main className="min-h-screen pb-16 antialiased">
      <h1 className="sr-only">
        Nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng từ Pháp tại MF Paris
      </h1>

      {/* ==================================================
          1. HERO SLIDER
      =================================================== */}
      <section className="container-ux pt-4 md:pt-6">
        <div className="overflow-hidden rounded-[24px] border border-[#eeeeee] bg-white shadow-[0_6px_22px_rgba(0,0,0,0.035)] md:rounded-[30px]">
          <HeroSlider
            sliders={
              settings?.heroSliders ?? []
            }
          />
        </div>
      </section>

      {/* ==================================================
          2. CHÍNH SÁCH CAM KẾT
      =================================================== */}
      <PolicySection />

      {/* ==================================================
          3. FLASH SALE
      =================================================== */}
      {settings?.flashSale?.enabled !==
        false ? (
        <FlashSaleSection
          products={flashSaleRes.docs}
          endTime={
            settings.flashSale
              ?.endTime ||
            '2026-06-30T23:59:59+07:00'
          }
          vouchers={
            settings.flashSale
              ?.vouchers ?? []
          }
          viewAllHref="/products"
        />
      ) : null}

      {/* ==================================================
          4. COMBO / SẢN PHẨM MỚI / BÁN CHẠY
      =================================================== */}
      <HomeProductTabs
        bestSellers={
          bestSellersRes.docs
        }
        newArrivals={
          newArrivalsRes.docs
        }
        combos={
          comboProductsRes.docs
        }
      />

      {/* ==================================================
          5. DANH MỤC NỔI BẬT
      =================================================== */}
      <FeaturedCategoriesSection
        categories={
          categoriesRes.docs
        }
      />

      {/* ==================================================
          6. ĐỐI TÁC THƯƠNG HIỆU
      =================================================== */}
      <BrandPartnersSection
        brands={brandsRes.docs}
      />

      {/* ==================================================
          7. TẠP CHÍ LÀM ĐẸP
      =================================================== */}
      <BeautyJournalSection
        posts={postsRes.docs}
        viewAllHref="/blog"
      />

      {/* ==================================================
          8. GIỚI THIỆU CỬA HÀNG
      =================================================== */}
      <StoreIntro />

      {/* ==================================================
          9. GOOGLE REVIEWS
      =================================================== */}
      <GoogleReviews />
    </main>
  )
}

/* =========================================================
   POLICY SECTION
========================================================= */

function PolicySection() {
  return (
    <section className="container-ux mt-5 md:mt-6">
      <div className="grid grid-cols-2 gap-3 rounded-[18px] border border-[#eeeeee] bg-white p-3 shadow-[0_6px_22px_rgba(0,0,0,0.035)] sm:p-4 md:grid-cols-4 md:rounded-[20px] md:p-5">
        {policies.map(
          (item, index) => {
            const Icon = item.icon

            const isLast =
              index ===
              policies.length - 1

            const hasDesktopDivider =
              index < policies.length - 1

            return (
              <div
                key={item.title}
                className={[
                  'flex min-w-0 items-center gap-2.5 md:justify-center md:gap-3',
                  hasDesktopDivider
                    ? 'md:border-r md:border-[#eeeeee]'
                    : '',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    item.iconClass,
                  ].join(' ')}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold leading-5 text-[#303030] sm:text-[13px]">
                    {item.title}
                  </p>

                  <p className="truncate text-[11px] font-normal leading-5 text-[#999999] sm:text-[12px]">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          },
        )}
      </div>
    </section>
  )
}

/* =========================================================
   DANH MỤC NỔI BẬT
========================================================= */

type FeaturedCategoriesSectionProps =
  Readonly<{
    categories: any[]
  }>

function FeaturedCategoriesSection({
  categories,
}: FeaturedCategoriesSectionProps) {
  if (!categories?.length) {
    return null
  }

  const categoryPairs: any[][] = []

  for (let index = 0; index < categories.length; index += 2) {
    categoryPairs.push(
      categories.slice(index, index + 2),
    )
  }

  return (
    <section className="container-ux mt-8 md:mt-10">
      <div className="lc-card rounded-[2rem] p-5 sm:p-6 md:rounded-[2.5rem] md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4 px-1 md:mb-10 md:px-2">
          <div>
            <span className="sub-heading text-neutral-400">
              Browse
            </span>

            <h2 className="font-heading text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-neutral-900 md:text-[34px]">
              Danh mục nổi bật
            </h2>
          </div>

          <Link
            href="/categories"
            className="shrink-0 border-b border-primary text-[12px] font-semibold tracking-[0.02em] text-primary transition-colors hover:border-black hover:text-black"
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
            {categoryPairs.map(
              (pair, index) => (
                <CarouselItem
                  key={index}
                  className="basis-[52%] pl-4 sm:basis-[38%] md:basis-[28%] md:pl-5 lg:basis-[22%] xl:basis-[18%]"
                >
                  <div className="grid grid-rows-2 gap-4">
                    {pair.map((cat) => {
                      const categoryName =
                        typeof cat.name ===
                          'string'
                          ? cat.name
                          : 'Danh mục'

                      const categorySlug =
                        typeof cat.slug ===
                          'string'
                          ? cat.slug
                          : ''

                      return (
                        <Link
                          key={cat.id}
                          href={
                            categorySlug
                              ? `/categories/${categorySlug}`
                              : '/categories'
                          }
                          className="group flex min-w-0 flex-col items-center rounded-2xl border border-transparent p-2.5 transition-colors hover:border-primary/20"
                        >
                          <div className="mb-3 flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-black/5 md:h-[102px] md:w-[102px]">
                            <div className="relative h-[62px] w-[62px] overflow-hidden rounded-full bg-gray-50 md:h-[74px] md:w-[74px]">
                              <OptimizedImage
                                media={cat.image}
                                size="thumbnail"
                                alt={categoryName}
                                className="h-full w-full object-contain transition-transform duration-1000 ease-in-out"
                              />

                              <div className="absolute inset-0 bg-black/5 transition-colors duration-500 group-hover:bg-black/5" />
                            </div>
                          </div>

                          <span className="line-clamp-2 min-h-[36px] w-full px-1 text-center text-[12px] font-semibold leading-[1.4] tracking-[-0.01em] text-neutral-800 transition-colors group-hover:text-primary md:text-[13px]">
                            {categoryName}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </CarouselItem>
              ),
            )}
          </CarouselContent>

          <CarouselPrevious className="absolute -left-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
          <CarouselNext className="absolute -right-4 top-1/2 z-20 hidden h-10 w-10 border-none bg-white hover:bg-primary hover:text-white md:flex" />
        </Carousel>
      </div>
    </section>
  )
}

/* =========================================================
   ĐỐI TÁC THƯƠNG HIỆU
========================================================= */

type BrandPartnersSectionProps =
  Readonly<{
    brands: any[]
  }>

function BrandPartnersSection({
  brands,
}: BrandPartnersSectionProps) {
  if (!brands?.length) {
    return null
  }

  const showNavigation =
    brands.length > 8

  return (
    <section className="container-ux mt-8 md:mt-10">
      <div className="group/brands relative overflow-visible rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-7 pt-6 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 md:rounded-[28px] md:px-7 md:pb-8 md:pt-7 lg:px-8">
        {/* HEADER */}
        <div className="mb-7 md:mb-8">
          <h2 className="font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-black sm:text-[33px] md:text-[38px]">
            Đối tác thương hiệu
          </h2>
        </div>

        {/* CAROUSEL */}
        <Carousel
          opts={{
            align: 'start',
            loop: showNavigation,
            containScroll:
              'trimSnaps',
          }}
          className="relative w-full"
        >
          <CarouselContent className="-ml-3 pb-1 md:-ml-4">
            {brands.map((brand) => {
              const brandName =
                typeof brand.name ===
                  'string'
                  ? brand.name
                  : 'Thương hiệu'

              const brandSlug =
                typeof brand.slug ===
                  'string'
                  ? brand.slug
                  : ''

              const logo =
                brand.logo

              const hasLogo =
                logo &&
                typeof logo ===
                'object'

              return (
                <CarouselItem
                  key={brand.id}
                  className={[
                    'basis-1/2 pl-3',
                    'md:basis-1/3 md:pl-4',
                    'lg:basis-1/6',
                    'xl:basis-1/8',
                  ].join(' ')}
                >
                  <Link
                    href={
                      brandSlug
                        ? `/brands/${brandSlug}`
                        : '/brands'
                    }
                    aria-label={
                      brandName
                    }
                    className="group/brand flex h-[82px] w-full items-center justify-center overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#d9d9d9] hover:shadow-[0_9px_22px_rgba(0,0,0,0.055)] sm:h-[90px] sm:px-3 md:h-[100px] md:px-4 lg:h-[112px] lg:rounded-[13px]"
                  >
                    {hasLogo ? (
                      <OptimizedImage
                        media={logo}
                        size="thumbnail"
                        alt={brandName}
                        className="h-[65%] w-full transition-transform duration-300 group-hover/brand:scale-[1.035] [&_img]:h-full [&_img]:w-full [&_img]:object-contain"
                      />
                    ) : (
                      <span className="line-clamp-2 text-center text-[16px] font-semibold leading-snug text-[#202020]">
                        {brandName}
                      </span>
                    )}
                  </Link>
                </CarouselItem>
              )
            })}
          </CarouselContent>

          {showNavigation ? (
            <>
              <CarouselPrevious
                aria-label="Xem thương hiệu trước"
                className="absolute -left-[23px] top-[68%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
              />

              <CarouselNext
                aria-label="Xem thương hiệu tiếp theo"
                className="absolute -right-[23px] top-[68%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
              />
            </>
          ) : null}
        </Carousel>

        {brands.length > 2 ? (
          <p className="mt-4 text-center text-[11px] text-[#999999] md:hidden">
            Vuốt ngang để xem thêm thương hiệu
          </p>
        ) : null}
      </div>
    </section>
  )
}