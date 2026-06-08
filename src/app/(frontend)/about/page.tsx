export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import RichText from '@/components/RichText'
import Link from 'next/link'
import { CheckCircle2, Heart, Award, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Giới thiệu về MF Paris | Tinh hoa làm đẹp Pháp',
  description:
    'Khám phá hành trình mang những giá trị làm đẹp tinh túy nhất từ Pháp về Việt Nam của MF Paris.',
}

export default async function AboutPage() {
  const payload = await getPayload({ config: configPromise })
  const settings = await payload.findGlobal({ slug: 'about-page' })

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-32">
      {/* 1. HERO SECTION */}
      <section className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
        <OptimizedImage
          media={settings.hero?.image}
          size="large"
          priority
          className="absolute inset-0 w-full h-full brightness-[0.8]"
        />
        <div className="relative z-10 text-center px-4">
          <p className="text-white text-[10px] md:text-xs font-black uppercase tracking-[0.5em] mb-6 animate-in fade-in slide-in-from-bottom duration-700">
            Since 2024 • MF PARIS
          </p>
          <h1 className="text-white text-5xl md:text-8xl font-bold font-serif italic tracking-tighter leading-none animate-in fade-in slide-in-from-bottom duration-1000">
            {settings.hero?.title || 'Câu Chuyện Thương Hiệu'}
          </h1>
        </div>
      </section>

      {/* 2. BRAND STORY SECTION */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-10 py-24 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 space-y-8">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-700">
              Hành trình của chúng tôi
            </span>
            <h2 className="text-4xl md:text-6xl font-bold font-serif italic text-[#16423C] leading-tight">
              {settings.story?.heading || 'Đánh thức vẻ đẹp tiềm ẩn từ nước Pháp'}
            </h2>
            <div className="w-16 h-1 px-1 bg-amber-200"></div>
            <div className="text-gray-600 leading-[2] text-lg">
              <RichText content={settings.story?.content} />
            </div>
          </div>

          <div className="lg:col-span-7 relative aspect-[4/5] md:aspect-video rounded-[3rem] overflow-hidden shadow-2xl">
            <OptimizedImage media={settings.story?.image} size="large" className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES GRID */}
      <section className="bg-white py-24 border-y border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-bold font-serif italic text-gray-900">
              Cam kết của MF Paris
            </h2>
            <p className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">
              Lấy sự hài lòng của khách hàng làm trọng tâm
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Award size={32} />,
                title: '100% Authentic',
                desc: 'Mọi sản phẩm đều được nhập khẩu chính ngạch, có nguồn gốc xuất xứ rõ ràng từ Pháp.',
              },
              {
                icon: <Heart size={32} />,
                title: 'Tận tâm phục vụ',
                desc: 'Đội ngũ tư vấn viên am hiểu sâu sắc về mùi hương và dược mỹ phẩm.',
              },
              {
                icon: <Sparkles size={32} />,
                title: 'Trải nghiệm cao cấp',
                desc: 'Từ quy cách đóng gói đến dịch vụ sau bán hàng đều đạt chuẩn Luxury.',
              },
            ].map((val, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center space-y-6 group p-8 rounded-[2.5rem] hover:bg-[#FDFBF9] transition-all duration-500 border border-transparent hover:border-gray-100"
              >
                <div className="text-amber-700 group-hover:scale-110 transition-transform duration-500">
                  {val.icon}
                </div>
                <h4 className="font-bold text-xl font-serif italic">{val.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="max-w-[1440px] mx-auto px-6 py-32 text-center">
        <div className="bg-[#16423C] rounded-[4rem] p-12 md:p-24 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10 space-y-8">
            <h2 className="text-white text-3xl md:text-5xl font-serif italic leading-tight">
              Hãy để MF Paris đồng hành cùng <br className="hidden md:block" /> phong cách của bạn.
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/products"
                className="px-12 py-5 bg-white text-[#16423C] font-black uppercase text-[11px] tracking-[0.2em] rounded-full hover:bg-amber-50 transition-all shadow-xl"
              >
                Bắt đầu mua sắm
              </Link>
              <Link
                href="/blog"
                className="px-12 py-5 border border-white/30 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-full hover:bg-white/10 transition-all"
              >
                Đọc tin tức
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
