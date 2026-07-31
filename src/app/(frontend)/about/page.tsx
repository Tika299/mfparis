export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
  Award,
  ChevronRight,
  Crown,
  Gem,
  Heart,
  HeartHandshake,
  MapPin,
  Medal,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Truck,
} from 'lucide-react'

import { JsonLd } from '@/components/JsonLd'
import { OptimizedImage } from '@/components/OptimizedImage'
import { SafeHtmlContent } from '@/components/SafeHtmlContent'
import {
  buildStaticPageSchemaGraph,
  getMfParisLocalBusinessInput,
} from '@/lib/structured-data'
import '@/styles/prose.css'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn'),
  title: 'Giới thiệu về Marais de France | MF Paris',
  description:
    'Câu chuyện Marais de France, thương hiệu cung ứng nước hoa, mỹ phẩm và sản phẩm làm đẹp chính hãng tại Việt Nam.',
  alternates: {
    canonical: '/about',
  },
}

type AboutItem = {
  value?: string
  label?: string
  title?: string
  description?: string
  image?: any
}

const fallbackStoryHtml = [
  '<p>Từ lâu, với sự yêu thích cái đẹp và mong muốn nhân rộng giá trị làm đẹp đến với mọi người, chúng tôi đã không ngừng suy tư nên chọn cách nào để có thể tiếp cận cộng đồng hiệu quả nhất.</p>',
  '<p>Trước thực trạng hàng nhái, hàng kém chất lượng tràn lan trên thị trường, với sứ mệnh của người trẻ trong thời đại mới, điều này đã thôi thúc các CEO của chúng tôi mạnh dạn mang đến với mọi người một thương hiệu đẳng cấp, một đơn vị chuyên cung ứng sỉ lẻ các sản phẩm làm đẹp, nước hoa chất lượng, chính hãng.</p>',
  '<p>Được mệnh danh là thiên đường của mỹ phẩm, Pháp quả thật là nơi dành cho những ai yêu thích làm đẹp. Mỹ phẩm Pháp luôn làm bạn yên tâm về chất lượng, độ an toàn, không lo hàng giả kém chất lượng và giá thành cũng rất hợp lý.</p>',
  '<p>Cùng phương châm “Sự thu hút đến từ bạn”, Marais de France xây dựng thương hiệu từ những giá trị chân thật nhất, góp phần nâng cao chất lượng cuộc sống và vẻ đẹp của con người Việt Nam.</p>',
].join('')

const fallbackStats: AboutItem[] = [
  { value: '2018', label: 'Khởi nguồn' },
  { value: '100%', label: 'Chính hãng' },
  { value: 'VN', label: 'Toàn quốc' },
]

const fallbackCards: AboutItem[] = [
  {
    title: 'Tầm nhìn thương hiệu',
    description:
      'Mang đến phong cách Pháp, tinh tế và rõ ràng trong từng trải nghiệm làm đẹp.',
  },
  {
    title: 'Sứ mệnh',
    description:
      'Cung cấp sản phẩm chính hãng 100%, chất lượng cao và tư vấn tận tâm cho khách hàng Việt.',
  },
  {
    title: 'Cam kết',
    description:
      'Hàng chính hãng, nguồn gốc rõ ràng, giá hợp lý và chính sách hậu mãi chuyên nghiệp.',
  },
]

const fallbackServices: AboutItem[] = [
  { title: '100% Chính hãng', description: 'Cam kết hàng nhập khẩu chính hãng' },
  { title: 'Đổi trả dễ dàng', description: 'Hỗ trợ đổi trả trong 7 ngày' },
  { title: 'Tư vấn tận tâm', description: 'Đội ngũ am hiểu sản phẩm' },
  { title: 'Giao hàng toàn quốc', description: 'Nhanh chóng và an toàn' },
]

const fallbackValues: AboutItem[] = [
  {
    title: 'Tận tâm',
    description:
      'Không chỉ trong từng sản phẩm, Marais de France luôn hướng đến sự hài lòng và trải nghiệm mua sắm tuyệt vời nhất.',
  },
  {
    title: 'Chất lượng',
    description:
      'Cam kết chỉ phân phối những sản phẩm chính hãng, đạt chuẩn quốc tế và có kiểm định rõ ràng.',
  },
  {
    title: 'Chuyên nghiệp',
    description:
      'Từ phong cách làm việc đến trải nghiệm khách hàng, mọi quy trình đều được tối ưu từng chi tiết.',
  },
  {
    title: 'Trách nhiệm',
    description:
      'Với khách hàng, đối tác và cộng đồng, chúng tôi luôn hành động với tinh thần trách nhiệm cao nhất.',
  },
  {
    title: 'Truyền cảm hứng',
    description: 'Vẻ đẹp thật sự tạo ra năng lượng tự tin mới mỗi ngày.',
  },
]

const valueIcons = [Heart, ShieldCheck, Medal, Target, HeartHandshake]
const serviceIcons = [ShieldCheck, HeartHandshake, Sparkles, Truck]
const cardIcons = [Crown, Gem, Award]

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function getArray(value: unknown, fallback: AboutItem[]) {
  return Array.isArray(value) && value.length > 0 ? (value as AboutItem[]) : fallback
}

export default async function AboutPage() {
  const payload = await getPayload({ config: configPromise })
  const settings = (await payload.findGlobal({ slug: 'about-page' })) as any

  const hero = settings?.hero || {}
  const story = settings?.story || {}
  const difference = settings?.difference || {}
  const showroom = settings?.showroom || {}
  const stats = getArray(hero.stats, fallbackStats)
  const cards = getArray(difference.cards, fallbackCards)
  const services = getArray(settings?.serviceHighlights, fallbackServices)
  const values = getArray(settings?.values, fallbackValues)
  const storyHtml = story.content || fallbackStoryHtml

  const schemaGraph = buildStaticPageSchemaGraph({
    page: {
      url: '/about',
      name: 'Giới thiệu về Marais de France',
      description: 'Câu chuyện thương hiệu, tầm nhìn và cam kết của Marais de France.',
      type: 'AboutPage',
    },
    breadcrumb: [
      { name: 'Trang chủ', url: '/' },
      { name: 'Giới thiệu', url: '/about' },
    ],
    localBusiness: getMfParisLocalBusinessInput(),
  })

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf5ee] text-[#171717]">
      <JsonLd data={schemaGraph} />

      <section className="relative min-h-[620px] overflow-hidden bg-[#eee4da] lg:min-h-[720px]">
        <OptimizedImage
          media={hero.image}
          size="heroDesktop"
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full"
          imageClassName="object-cover opacity-80"
          alt="Câu chuyện thương hiệu Marais de France"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f7eee6]/95 via-[#f7eee6]/72 to-[#f7eee6]/20" />
        <div className="container-ux relative z-10 grid min-h-[620px] items-center gap-10 py-16 lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.55em] text-[#25504a]/70">
              {text(hero.eyebrow, 'Since 2018 · MF Paris')}
            </p>
            <h1 className="mt-7 font-heading text-6xl font-semibold leading-[0.96] text-[#174640] md:text-8xl">
              {text(hero.title, 'Câu Chuyện Thương Hiệu')}
            </h1>
            <div className="mt-8 h-px w-72 max-w-full bg-gradient-to-r from-[#d8a75f] via-[#d8a75f]/50 to-transparent" />
            <p className="mt-8 max-w-md text-base leading-8 text-[#2b3936] md:text-lg">
              {text(
                hero.subtitle,
                'Marais de France đồng hành cùng vẻ đẹp chính hãng, an toàn và giàu cảm hứng từ nước Pháp đến người Việt.',
              )}
            </p>
            <div className="mt-10 grid max-w-lg grid-cols-3 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/58 shadow-[0_20px_70px_rgba(83,56,34,0.12)] backdrop-blur">
              {stats.slice(0, 3).map((item, index) => {
                const Icon = [Crown, Medal, Store][index] || Sparkles
                return (
                  <div key={String(item.value || '') + '-' + String(item.label || '') + '-' + index} className="border-r border-[#e7dbd0] px-4 py-5 text-center last:border-r-0">
                    <Icon aria-hidden="true" className="mx-auto text-[#c58b42]" size={30} />
                    <div className="mt-3 font-heading text-2xl font-semibold text-[#174640]">
                      {text(item.value, fallbackStats[index]?.value || '')}
                    </div>
                    <div className="mt-1 text-xs text-[#5f6865]">
                      {text(item.label, fallbackStats[index]?.label || '')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container-ux py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_0.95fr_1fr] lg:items-center">
          <aside>
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b72828]">
              {text(story.eyebrow, 'Hành trình của chúng tôi')}
            </p>
            <h2 className="mt-5 font-heading text-5xl font-semibold leading-tight text-[#174640] md:text-6xl">
              {text(story.heading, 'Marais de France')}
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-neutral-600">
              {text(
                story.summary,
                'Một thương hiệu được xây dựng từ niềm tin vào cái đẹp chân thật, nguồn gốc minh bạch và trải nghiệm mua sắm tử tế.',
              )}
            </p>
            <p className="mt-8 font-heading text-4xl italic text-[#b72828]">
              {text(story.signature, 'Marais de France')}
            </p>
          </aside>

          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] border-[10px] border-white bg-[#eadfd6] shadow-[0_24px_70px_rgba(56,39,25,0.16)]">
            <OptimizedImage
              media={story.image || hero.image || hero.productImage}
              size="large"
              sizes="(max-width: 1024px) 100vw, 34vw"
              className="h-full w-full"
              imageClassName="object-cover"
              alt="Hành trình Marais de France"
            />
          </div>

          <article className="prose max-w-none prose-p:text-[15px] prose-p:leading-8 prose-p:text-neutral-600 prose-strong:text-[#174640] prose-a:text-[#b72828]">
            <SafeHtmlContent html={storyHtml} />
          </article>
        </div>
      </section>

      <section className="relative bg-[#fffaf5] py-16 md:py-24">
        <div className="container-ux">
          <div className="grid gap-10 lg:grid-cols-[0.56fr_1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b72828]">
                {text(difference.eyebrow, 'Vì sao chọn chúng tôi?')}
              </p>
              <h2 className="mt-5 font-heading text-5xl font-semibold leading-tight text-[#174640] md:text-6xl">
                {text(difference.heading, 'Giá trị làm nên sự khác biệt')}
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-neutral-600">
                {text(
                  difference.intro,
                  'Chúng tôi không ngừng tìm hiểu và phát triển để bạn luôn cảm nhận được sự khác biệt từ sản phẩm chính hãng.',
                )}
              </p>
              <Link
                href={text(difference.ctaHref, '/about')}
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border border-[#d9a767] bg-white px-6 text-[11px] font-black uppercase text-[#9b6a2e] transition hover:bg-[#174640] hover:text-white"
              >
                {text(difference.ctaLabel, 'Khám phá ngay')}
                <ChevronRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {cards.slice(0, 3).map((item, index) => {
                const Icon = cardIcons[index] || Award
                return (
                  <article key={String(item.title || '') + '-' + index} className="overflow-hidden rounded-[1.25rem] border border-[#eadfd7] bg-white shadow-[0_18px_50px_rgba(56,39,25,0.08)]">
                    <div className="aspect-[4/3] bg-[#eee4da]">
                      <OptimizedImage
                        media={item.image || story.image || hero.image}
                        size="card"
                        sizes="(max-width: 768px) 100vw, 26vw"
                        className="h-full w-full"
                        imageClassName="object-cover"
                        alt={text(item.title, fallbackCards[index]?.title || 'Marais de France')}
                      />
                    </div>
                    <div className="p-6 text-center">
                      <Icon aria-hidden="true" className="mx-auto text-[#c58b42]" size={26} />
                      <h3 className="mt-4 font-heading text-xl font-semibold text-[#174640]">
                        {text(item.title, fallbackCards[index]?.title || 'Giá trị')}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {text(item.description, fallbackCards[index]?.description || '')}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="mt-14 grid overflow-hidden rounded-[1.35rem] border border-[#eadfd7] bg-white shadow-[0_18px_55px_rgba(56,39,25,0.08)] md:grid-cols-4">
            {services.slice(0, 4).map((item, index) => {
              const Icon = serviceIcons[index] || Sparkles
              return (
                <div key={String(item.title || '') + '-' + index} className="flex gap-4 border-b border-[#eadfd7] p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <Icon aria-hidden="true" className="mt-1 shrink-0 text-[#c58b42]" size={26} />
                  <div>
                    <h3 className="text-sm font-black text-[#174640]">
                      {text(item.title, fallbackServices[index]?.title || 'Cam kết')}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {text(item.description, fallbackServices[index]?.description || '')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24">
        <div className="container-ux text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#c58b42]">Core values</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold text-[#174640] md:text-6xl">
            Cam kết của MF Paris
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
            Những giá trị cốt lõi kim chỉ nam cho mọi hoạt động của chúng tôi, mang đến trải nghiệm mua sắm khác biệt và vượt trội.
          </p>

          <div className="mt-14 grid gap-8 md:grid-cols-5">
            {values.slice(0, 5).map((item, index) => {
              const Icon = valueIcons[index] || Heart
              return (
                <article key={String(item.title || '') + '-' + index} className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#e6bd7f] bg-white text-[#c58b42] shadow-[0_18px_45px_rgba(197,139,66,0.15)]">
                    <Icon aria-hidden="true" size={31} />
                  </div>
                  <h3 className="mt-6 font-heading text-xl font-semibold text-[#174640]">
                    {text(item.title, fallbackValues[index]?.title || 'Giá trị')}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    {text(item.description, fallbackValues[index]?.description || '')}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="container-ux pb-20 lg:pb-28">
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-[#0d332f] text-white shadow-[0_28px_80px_rgba(18,67,61,0.22)] md:min-h-[460px] lg:min-h-[520px]">
          <OptimizedImage
            media={showroom.image || hero.productImage || hero.image}
            size="heroDesktop"
            sizes="(max-width: 768px) 100vw, 1180px"
            className="absolute inset-0 h-full w-full"
            imageClassName="object-cover"
            alt="Showroom Marais de France"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#062723]/82 via-[#062723]/54 to-[#062723]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062723]/72 via-transparent to-transparent md:bg-none" />

          <div className="relative z-10 grid min-h-[360px] gap-8 p-7 md:min-h-[460px] md:p-10 lg:min-h-[520px] lg:grid-cols-[1fr_0.78fr] lg:p-14">
            <div className="flex max-w-xl flex-col justify-end lg:justify-center">
              <h2 className="font-heading text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
                {text(showroom.heading, 'Đến tận nơi, thử tận tay, chọn đúng sản phẩm dành cho bạn.')}
              </h2>
              <Link
                href={text(showroom.ctaHref, '/he-thong-cua-hang')}
                className="mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-[#f3d0a0] px-7 text-xs font-black uppercase text-[#174640] transition hover:bg-white"
              >
                {text(showroom.ctaLabel, 'Khám phá ngay')}
                <ChevronRight aria-hidden="true" size={16} />
              </Link>
            </div>

            <div className="flex flex-col justify-end gap-4 lg:items-end">
              <div className="w-full rounded-[1rem] border border-white/12 bg-white/12 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.12)] backdrop-blur-md lg:max-w-sm">
                <MapPin aria-hidden="true" className="text-[#f3d0a0]" size={24} />
                <h3 className="mt-4 font-black">{text(showroom.locationTitle, 'Marais de France')}</h3>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  {text(showroom.locationText, '220/24 Nguyễn Oanh, Phường Gò Vấp, TP.HCM')}
                </p>
              </div>
              <div className="w-full rounded-[1rem] border border-white/12 bg-white/12 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.12)] backdrop-blur-md lg:max-w-sm">
                <Store aria-hidden="true" className="text-[#f3d0a0]" size={24} />
                <h3 className="mt-4 font-black">{text(showroom.channelsTitle, 'Phục vụ toàn quốc')}</h3>
                <p className="mt-2 text-sm leading-6 text-white/82">
                  {text(showroom.channelsText, 'Website, Facebook, TikTok Shop, Shopee, Lazada và các kênh chính thức.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
