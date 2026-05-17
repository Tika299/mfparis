import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { OptimizedImage } from '@/components/OptimizedImage'
import Link from 'next/link'

export default async function AllBrandsPage() {
  const payload = await getPayload({ config: configPromise })
  const brandsRes = await payload.find({
    collection: 'brands',
    limit: 100,
    sort: 'name', // Sắp xếp theo tên A-Z
  })

  return (
    <div className="bg-[#FDFBF9] min-h-screen pb-20">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-bold font-sans">Thương hiệu</h1>
          <div className="w-20 h-0.5 bg-amber-200 mx-auto"></div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {brandsRes.docs.map((brand: any) => (
            <Link
              href={`/brands/${brand.slug}`}
              key={brand.id}
              className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col items-center justify-center aspect-square"
            >
              <div className="relative w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500">
                {brand.logo ? (
                  <OptimizedImage
                    media={brand.logo}
                    size="card"
                    alt={brand.name}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xl tracking-tighter text-gray-300">
                    {brand.name}
                  </div>
                )}
              </div>
              <h3 className="mt-4 text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-amber-700 transition-colors">
                {brand.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
