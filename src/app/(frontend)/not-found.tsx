import Link from 'next/link'
import { ArrowLeft, Home, Search, ShoppingBag, Sparkles } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FDFBF9] font-sans">
      <section className="container-ux flex min-h-[calc(100vh-96px)] items-center py-12 md:py-20">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="relative overflow-hidden rounded-[2rem] border border-red-100/70 bg-white px-6 py-12 shadow-sm md:rounded-[2.5rem] md:px-12 md:py-16">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-red-100/70 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/3 translate-y-1/3 rounded-full bg-[#fff0df] blur-3xl" />

            <div className="relative z-10 max-w-2xl">
              <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                <Sparkles size={13} />
                Lost in Paris
              </div>

              <p className="text-[6rem] font-black leading-none tracking-tight text-primary/10 md:text-[8rem]">
                404
              </p>

              <h1 className="-mt-4 font-sans text-3xl font-black leading-tight text-gray-950 md:text-5xl">
                Trang bạn tìm đã không còn ở đây
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-gray-500 md:text-base">
                Có thể đường dẫn đã được đổi trong quá trình chuyển dữ liệu, hoặc sản phẩm/bài viết đã được cập nhật sang URL mới. Bạn có thể tìm lại bằng thanh tìm kiếm hoặc quay về các khu vực chính của MF Paris.
              </p>

              <form
                action="/search"
                className="mt-8 flex max-w-xl items-center overflow-hidden rounded-full border border-gray-200 bg-white p-1.5 shadow-sm"
              >
                <input
                  name="q"
                  placeholder="Tìm sản phẩm, thương hiệu, danh mục..."
                  className="min-w-0 flex-1 bg-transparent px-5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-black"
                >
                  <Search size={15} />
                  Tìm
                </button>
              </form>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-primary"
                >
                  <Home size={15} />
                  Về trang chủ
                </Link>

                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 transition hover:border-black hover:bg-black hover:text-white"
                >
                  <ShoppingBag size={15} />
                  Xem sản phẩm
                </Link>

                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-700 transition hover:border-black hover:bg-black hover:text-white"
                >
                  Blog MF Paris
                </Link>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Gợi ý nhanh
            </p>
            <h2 className="mt-2 text-2xl font-black text-gray-950">
              Có thể bạn đang cần
            </h2>

            <div className="mt-6 grid gap-3">
              {[
                ['Nước hoa', '/categories/nuoc-hoa'],
                ['Nước hoa nam', '/categories/nuoc-hoa-nam'],
                ['Nước hoa nữ', '/categories/nuoc-hoa-nu'],
                ['Thương hiệu', '/brands'],
                ['Chính sách đổi trả', '/chinh-sach-doi-tra'],
              ].map(([label, href]) => (
                <Link
                  href={href}
                  key={href}
                  className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-[#fffaf7] px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-primary/30 hover:bg-red-50 hover:text-primary"
                >
                  <span>{label}</span>
                  <ArrowLeft size={15} className="rotate-180 transition group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
