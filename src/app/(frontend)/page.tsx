export const dynamic = 'force-dynamic'
export const revalidate = 0

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

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

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
    /*
     * Site Settings cần depth 2 để:
     * - Hero Slider lấy được ảnh
     * - Flash Sale lấy được relationship voucher
     */
    payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    }),

    /* Flash Sale */
    payload.find({
      collection: 'products',
      where: {
        and: [
          {
            status: {
              equals: 'published',
            },
          },
          {
            displayLocation: {
              contains: 'flash-sale',
            },
          },
        ],
      },
      depth: 2,
      sort: '-updatedAt',
      limit: 12,
    }),

    /* Sản phẩm bán chạy */
    payload.find({
      collection: 'products',
      where: {
        and: [
          {
            status: {
              equals: 'published',
            },
          },
          {
            displayLocation: {
              contains: 'best-seller',
            },
          },
        ],
      },
      depth: 2,
      sort: '-updatedAt',
      limit: 12,
    }),

    /* Sản phẩm mới */
    payload.find({
      collection: 'products',
      where: {
        and: [
          {
            status: {
              equals: 'published',
            },
          },
          {
            displayLocation: {
              contains: 'new-arrival',
            },
          },
        ],
      },
      depth: 2,
      sort: '-createdAt',
      limit: 12,
    }),

    /* Combo */
    payload.find({
      collection: 'products',
      where: {
        and: [
          {
            status: {
              equals: 'published',
            },
          },
          {
            displayLocation: {
              contains: 'combo',
            },
          },
        ],
      },
      depth: 2,
      sort: '-updatedAt',
      limit: 12,
    }),

    /* Danh mục */
    payload.find({
      collection: 'categories',
      depth: 2,
      sort: 'name',
      limit: 20,
    }),

    /* Thương hiệu */
    payload.find({
      collection: 'brands',
      depth: 2,
      sort: 'name',
      limit: 24,
    }),

    /* Tạp chí */
    payload.find({
      collection: 'posts',
      depth: 2,
      sort: '-createdAt',
      limit: 12,
    }),
  ])

  return (
    <main className="min-h-screen pb-16 antialiased">
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
      <div className="grid grid-cols-2 gap-3 rounded-[20px] border border-[#eeeeee] bg-white p-4 shadow-[0_6px_22px_rgba(0,0,0,0.035)] sm:p-5 lg:grid-cols-4">
        {policies.map(
          (item, index) => {
            const Icon = item.icon

            const isLast =
              index ===
              policies.length - 1

            return (
              <div
                key={item.title}
                className={[
                  'flex min-w-0 items-center gap-3 lg:justify-center',
                  !isLast
                    ? 'lg:border-r lg:border-[#eeeeee]'
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

  const showNavigation =
    categories.length > 8

  return (
    <section className="container-ux mt-8 md:mt-10">
      <div className="group/categories relative overflow-visible rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-7 pt-6 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 md:rounded-[28px] md:px-7 md:pb-8 md:pt-7 lg:px-8">
        {/* HEADER */}
        <div className="mb-7 flex items-center justify-between gap-4 md:mb-9">
          <h2 className="min-w-0 font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-black sm:text-[33px] md:text-[38px]">
            Danh mục nổi bật
          </h2>

          <Link
            href="/categories"
            className="group/button inline-flex h-[48px] shrink-0 items-center justify-center gap-1 rounded-[15px] border border-[#efd8cf] bg-white px-4 text-[13px] font-semibold text-[#202020] shadow-[0_3px_10px_rgba(0,0,0,0.025)] transition-colors hover:border-[#b40008] hover:text-[#b40008] sm:h-[52px] sm:px-5 sm:text-[14px]"
          >
            <span>Xem tất cả</span>

            <ChevronRight
              aria-hidden="true"
              size={16}
              strokeWidth={2}
              className="text-[#d4a093] transition-transform duration-200 group-hover/button:translate-x-0.5 group-hover/button:text-[#b40008]"
            />
          </Link>
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
          <CarouselContent className="-ml-4 pb-1">
            {categories.map(
              (category) => {
                const categoryName =
                  typeof category.name ===
                    'string'
                    ? category.name
                    : 'Danh mục'

                const categorySlug =
                  typeof category.slug ===
                    'string'
                    ? category.slug
                    : ''

                return (
                  <CarouselItem
                    key={category.id}
                    className={[
                      'pl-4',
                      'basis-[44%]',
                      'min-[520px]:basis-[31%]',
                      'md:basis-[24%]',
                      'lg:basis-[16.666%]',
                      'xl:basis-[12.5%]',
                    ].join(' ')}
                  >
                    <Link
                      href={
                        categorySlug
                          ? `/categories/${categorySlug}`
                          : '/categories'
                      }
                      className="group/category flex h-full min-w-0 flex-col items-center"
                    >
                      {/* OVAL IMAGE */}
                      <div className="relative mx-auto aspect-[0.78/1] w-full max-w-[168px] overflow-hidden rounded-[999px] border border-[#eadfd9] bg-white p-4 transition-[border-color,box-shadow,transform] duration-300 group-hover/category:-translate-y-1 group-hover/category:border-[#d8b5aa] group-hover/category:shadow-[0_12px_26px_rgba(0,0,0,0.06)] sm:p-5">
                        <OptimizedImage
                          media={
                            category.image
                          }
                          size="card"
                          alt={
                            categoryName
                          }
                          className="h-full w-full transition-transform duration-500 group-hover/category:scale-[1.04] [&_img]:h-full [&_img]:w-full [&_img]:object-contain"
                        />
                      </div>

                      {/* CATEGORY NAME */}
                      <h3 className="mt-4 line-clamp-2 min-h-[44px] w-full text-center text-[13px] font-normal leading-[1.55] text-[#303030] transition-colors group-hover/category:text-[#b40008] sm:text-[14px]">
                        {categoryName}
                      </h3>
                    </Link>
                  </CarouselItem>
                )
              },
            )}
          </CarouselContent>

          {showNavigation ? (
            <>
              <CarouselPrevious
                aria-label="Xem danh mục trước"
                className="absolute -left-[23px] top-[43%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
              />

              <CarouselNext
                aria-label="Xem danh mục tiếp theo"
                className="absolute -right-[23px] top-[43%] z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
              />
            </>
          ) : null}
        </Carousel>

        {categories.length > 2 ? (
          <p className="mt-4 text-center text-[11px] text-[#999999] md:hidden">
            Vuốt ngang để xem thêm
          </p>
        ) : null}
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
                    'pl-3 md:pl-4',
                    'basis-[46%]',
                    'min-[520px]:basis-[31%]',
                    'md:basis-[24%]',
                    'lg:basis-[16.666%]',
                    'xl:basis-[12.5%]',
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
                    className="group/brand flex h-[104px] w-full items-center justify-center overflow-hidden rounded-[13px] border border-[#e5e5e5] bg-white px-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[#d9d9d9] hover:shadow-[0_9px_22px_rgba(0,0,0,0.055)] sm:h-[112px]"
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
                className="absolute -left-[23px] top-1/2 z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
              />

              <CarouselNext
                aria-label="Xem thương hiệu tiếp theo"
                className="absolute -right-[23px] top-1/2 z-30 hidden h-[48px] w-[48px] -translate-y-1/2 border border-[#eeeeee] bg-white text-[#202020] shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all hover:border-[#b40008] hover:bg-white hover:text-[#b40008] md:flex"
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