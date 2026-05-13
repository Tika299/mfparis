'use client'
import { useState } from 'react'
import { ProductCard } from '@/components/ProductCard'

export const HomeTabs = ({
  initialProducts,
  categories,
}: {
  initialProducts: any[]
  categories: any[]
}) => {
  const [activeTab, setActiveTab] = useState('all')

  // Lọc sản phẩm theo danh mục khi khách bấm nút
  const filteredProducts =
    activeTab === 'all'
      ? initialProducts
      : initialProducts.filter((p) => p.categories?.some((c: any) => c.slug === activeTab))

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold font-serif mb-6">Sản phẩm bán chạy</h2>
        <div className="flex justify-center space-x-8 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <button
            onClick={() => setActiveTab('all')}
            className={`${activeTab === 'all' ? 'text-black border-b-2 border-black' : ''} pb-1 transition-all`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.slug)}
              className={`${activeTab === cat.slug ? 'text-black border-b-2 border-black' : ''} pb-1 transition-all`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12 lg:gap-x-10">
        {filteredProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
