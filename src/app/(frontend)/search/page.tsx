import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ProductCard } from '@/components/ProductCard'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>
}) {
  const { q } = await searchParams
  const payload = await getPayload({ config: configPromise })

  const products = await payload.find({
    collection: 'products',
    where: {
      or: [
        { title: { contains: q } },
        { 'brand.name': { contains: q } }, // Tìm theo cả tên thương hiệu
      ],
    },
  })

  return (
    <div className="container mx-auto py-20 px-4">
      <h1 className="text-2xl mb-10 uppercase tracking-widest">
        Kết quả tìm kiếm cho: <span className="font-bold">"{q}"</span>
      </h1>

      {products.docs.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {products.docs.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed">
          Không tìm thấy sản phẩm nào phù hợp.
        </div>
      )}
    </div>
  )
}
