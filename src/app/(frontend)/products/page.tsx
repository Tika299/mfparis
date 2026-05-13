import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'
import Link from 'next/link'

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; min?: string; max?: string }>
}) {
  const { brand, min, max } = await searchParams
  const payload = await getPayload({ config: configPromise })

  // Xây dựng bộ lọc động
  const whereQueries: any = [{ status: { equals: 'published' } }]

  if (brand) {
    whereQueries.push({ 'brand.slug': { equals: brand } })
  }
  if (min) {
    whereQueries.push({ 'price.salePrice': { greater_than_or_equal: Number(min) } })
  }
  if (max) {
    whereQueries.push({ 'price.salePrice': { less_than_equal: Number(max) } })
  }

  const products = await payload.find({
    collection: 'products',
    depth: 2,
    where: { and: whereQueries },
  })

  const brands = await payload.find({ collection: 'brands' })

  return (
    <div className="container mx-auto py-10 px-6 flex flex-col md:flex-row gap-10">
      {/* SIDEBAR FILTERS */}
      <aside className="w-full md:w-64 space-y-8">
        <div>
          <h3 className="font-bold uppercase text-xs tracking-widest border-b pb-2 mb-4">
            Thương hiệu
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/products" className={!brand ? 'font-bold' : ''}>
                Tất cả
              </Link>
            </li>
            {brands.docs.map((b: any) => (
              <li key={b.id}>
                <Link
                  href={`/products?brand=${b.slug}`}
                  className={brand === b.slug ? 'font-bold text-red-600' : 'hover:text-red-600'}
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold uppercase text-xs tracking-widest border-b pb-2 mb-4">
            Khoảng giá
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/products?min=0&max=1000000">Dưới 1.000.000₫</Link>
            </li>
            <li>
              <Link href="/products?min=1000000&max=3000000">1.000.000₫ - 3.000.000₫</Link>
            </li>
            <li>
              <Link href="/products?min=3000000">Trên 3.000.000₫</Link>
            </li>
          </ul>
        </div>
      </aside>

      {/* PRODUCT GRID */}
      <main className="flex-grow">
        <h1 className="text-3xl font-serif italic mb-8">Tất cả sản phẩm</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
          {products.docs.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
    </div>
  )
}
