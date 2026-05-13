import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import { notFound } from 'next/navigation'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  // 1. Tìm thông tin danh mục hiện tại
  const categoryRes = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
  })

  const currentCategory = categoryRes.docs[0]
  if (!currentCategory) notFound()

  // 2. Lấy các sản phẩm thuộc danh mục này
  const products = await payload.find({
    collection: 'products',
    depth: 2,
    where: {
      and: [{ status: { equals: 'published' } }, { categories: { contains: currentCategory.id } }],
    },
  })

  // 3. Lấy danh sách thương hiệu để làm bộ lọc (Sidebar)
  const brands = await payload.find({ collection: 'brands' })

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-10">
        {/* SIDEBAR: BỘ LỌC (FILTER) */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 space-y-8">
            <div>
              <h3 className="font-bold uppercase text-sm mb-4 border-b pb-2">Thương hiệu</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {brands.docs.map((brand: any) => (
                  <li key={brand.id} className="hover:text-red-600 cursor-pointer">
                    {brand.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold uppercase text-sm mb-4 border-b pb-2">Khoảng giá</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="hover:text-red-600 cursor-pointer text-xs uppercase tracking-tighter italic">
                  Dưới 1.000.000₫
                </li>
                <li className="hover:text-red-600 cursor-pointer text-xs uppercase tracking-tighter italic">
                  1.000.000₫ - 3.000.000₫
                </li>
                <li className="hover:text-red-600 cursor-pointer text-xs uppercase tracking-tighter italic">
                  Trên 3.000.000₫
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* DANH SÁCH SẢN PHẨM */}
        <main className="flex-grow">
          <header className="mb-10">
            <h1 className="text-3xl font-bold uppercase tracking-widest">{currentCategory.name}</h1>
            <p className="text-gray-400 text-sm mt-2">{products.docs.length} Sản phẩm</p>
          </header>

          {products.docs.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-12">
              {products.docs.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border-2 border-dashed">
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
