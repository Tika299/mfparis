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
import { FlashSaleSection } from '@/components/FlashSaleSection'
import { StoreIntro } from '@/components/home/StoreIntro'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { JsonLd } from '@/components/JsonLd'
import { SITE_ORIGIN } from '@/utilities/seo'
import { buildHomeSchemaGraph } from '@/lib/structured-data'
import { FeaturedCategoriesSectionClient } from '@/components/FeaturedCategoriesSectionClient'
import { BrandPartnersSectionClient } from '@/components/BrandPartnersSectionClient'
import { HomeProductTabsSectionClient } from '@/components/HomeProductTabsSectionClient'
import { BeautyJournalSectionClient } from '@/components/BeautyJournalSectionClient'
import '@/styles/carousel-overrides.css'

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

  const schemaGraph = buildHomeSchemaGraph({
    title: homeTitle,
    description: homeDescription,
  })

  return (
    <main className="min-h-screen pb-16 antialiased">
      <JsonLd data={schemaGraph} />
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
      <HomeProductTabsSectionClient
        bestSellers={bestSellersRes.docs}
        newArrivals={newArrivalsRes.docs}
        combos={comboProductsRes.docs}
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
      <BeautyJournalSectionClient
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

  return (
    <section className="container-ux mt-8 md:mt-10">
      <div className="lc-card rounded-[2rem] p-5 sm:p-6 md:rounded-[2.5rem] md:p-8">
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

        <FeaturedCategoriesSectionClient
          categories={categories}
        />
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

  return (
    <section className="container-ux mt-8 md:mt-10">
      <div className="group/brands relative overflow-visible rounded-[24px] border border-[#eeeeee] bg-white px-4 pb-7 pt-6 shadow-[0_8px_30px_rgba(0,0,0,0.045)] sm:px-5 md:rounded-[28px] md:px-7 md:pb-8 md:pt-7 lg:px-8">
        <div className="mb-7 md:mb-8">
          <h2 className="font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-black sm:text-[33px] md:text-[38px]">
            Đối tác thương hiệu
          </h2>
        </div>

        <BrandPartnersSectionClient
          brands={brands}
        />

        {brands.length > 2 ? (
          <p className="mt-4 text-center text-[11px] text-[#999999] md:hidden">
            Vuốt ngang để xem thêm thương hiệu
          </p>
        ) : null}
      </div>
    </section>
  )
}



