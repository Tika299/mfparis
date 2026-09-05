import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { JsonLd } from '@/components/JsonLd'
import { buildCollectionPageSchemaGraph } from '@/lib/structured-data'
import {
    getCategoryChildren,
    getRelationshipID,
    type CategoryTreeItem,
} from '@/lib/categoryTree'

export const metadata = {
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_BASE_URL || 'https://mfparis.vn',
    ),
    title: 'Danh mục sản phẩm | MF Paris Chính Hãng',
    description:
        'Khám phá các dòng sản phẩm nước hoa, mỹ phẩm và thực phẩm chức năng cao cấp từ Pháp tại MF Paris.',
}

type PageProps = {
    searchParams?: Promise<{
        page?: string
    }>
}

function getAncestorCategoryIDs(
    categoryID: string,
    parentIDByCategoryID: Map<string, string>,
) {
    const result: string[] = []
    const seen = new Set<string>([categoryID])
    let currentID = categoryID

    while (true) {
        const parentID = parentIDByCategoryID.get(currentID)

        if (!parentID || seen.has(parentID)) {
            break
        }

        result.push(parentID)
        seen.add(parentID)
        currentID = parentID
    }

    return result
}

const getCachedCategoriesPageData = unstable_cache(
    async (page: number, limit: number) => {
        const payload = await getPayload({
            config: configPromise,
        })

        const [categoriesRes, productsRes, allCategoriesRes] =
            await Promise.all([
                payload.find({
                    collection: 'categories',
                    limit,
                    page,
                    sort: 'name',
                    depth: 1,
                }),
                payload.find({
                    collection: 'products',
                    depth: 0,
                    pagination: false,
                    overrideAccess: true,
                    where: {
                        status: {
                            equals: 'published',
                        },
                    },
                    select: {
                        categories: true,
                    },
                }),
                payload.find({
                    collection: 'categories',
                    depth: 1,
                    pagination: false,
                    overrideAccess: true,
                    sort: 'name',
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        parent: true,
                        image: true,
                    },
                }),
            ])

        const parentIDByCategoryID = new Map<string, string>()

        for (const category of allCategoriesRes.docs) {
            const categoryID = getRelationshipID(category.id)
            const parentID = getRelationshipID(category.parent)

            if (categoryID !== null && parentID !== null) {
                parentIDByCategoryID.set(String(categoryID), String(parentID))
            }
        }

        const productCountByCategory = new Map<string, number>()

        for (const product of productsRes.docs) {
            if (!Array.isArray(product.categories)) {
                continue
            }

            const uniqueCategoryIDs = new Set<string>()

            for (const category of product.categories) {
                const categoryID = getRelationshipID(category)

                if (categoryID === null) {
                    continue
                }

                const normalizedCategoryID = String(categoryID)
                uniqueCategoryIDs.add(normalizedCategoryID)

                for (const ancestorID of getAncestorCategoryIDs(
                    normalizedCategoryID,
                    parentIDByCategoryID,
                )) {
                    uniqueCategoryIDs.add(ancestorID)
                }
            }

            for (const categoryID of uniqueCategoryIDs) {
                productCountByCategory.set(
                    categoryID,
                    (productCountByCategory.get(categoryID) ?? 0) + 1,
                )
            }
        }

        const allCategoriesWithProductCount = allCategoriesRes.docs.map((category: any) => ({
            ...category,
            productCount:
                productCountByCategory.get(String(category.id)) ?? 0,
        }))

        return {
            ...categoriesRes,
            docs: categoriesRes.docs.map((category: any) => ({
                ...category,
                productCount:
                    productCountByCategory.get(String(category.id)) ?? 0,
            })),
            allCategories: allCategoriesWithProductCount,
        }
    },
    ['all-categories-page-data-v1'],
    {
        tags: ['categories', 'products'],
        revalidate: 300,
    },
)

export default async function AllCategoriesPage({
    searchParams,
}: PageProps) {
    const resolvedSearchParams = await searchParams
    const currentPage = Math.max(
        Number(resolvedSearchParams?.page) || 1,
        1,
    )
    const limit = 12

    const categoriesRes =
        await getCachedCategoriesPageData(
            currentPage,
            limit,
        )

    const allCategories = (categoriesRes as any).allCategories as CategoryTreeItem[]

    const rootCategories = allCategories
        .filter((category) => !getRelationshipID(category.parent))
        .sort((left, right) =>
            String(left.name || '').localeCompare(String(right.name || ''), 'vi'),
        )

    const schemaGraph = buildCollectionPageSchemaGraph({
        page: {
            url: currentPage > 1 ? `/categories?page=${currentPage}` : '/categories',
            name: 'Danh muc san pham',
            description:
                'Khám phá các dòng sản phẩm nước hoa, mỹ phẩm và thực phẩm chức năng cao cấp từ Pháp tại MF Paris.',
            breadcrumb: [
                {
                    name: 'Trang chủ',
                    url: '/',
                },
                {
                    name: 'Danh muc san pham',
                    url: currentPage > 1 ? `/categories?page=${currentPage}` : '/categories',
                },
            ],
            items: categoriesRes.docs.map((category: any) => ({
                name: category.name,
                url: `/categories/${category.slug}`,
            })),
        },
    })

    return (
        <div className="bg-[#F4F6F8] min-h-screen pb-20 antialiased font-sans">
            <JsonLd data={schemaGraph} />
            {/* SECTION 1: BREADCRUMB */}
            <div className="bg-white border-b border-gray-100 mb-10">
                <nav className="container-ux h-12 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    <Link
                        href="/"
                        className="hover:text-black transition-colors"
                    >
                        TRANG CHỦ
                    </Link>
                    <ChevronRight size={12} />
                    <span className="text-black">
                        DANH MỤC SẢN PHẨM
                    </span>
                </nav>
            </div>

            <div className="container-ux">
                {/* HEADER TRANG */}
                <header className="text-center mb-16 space-y-4">
                    <div className="flex items-center justify-center gap-3 text-[#b72828] mb-2">
                        <LayoutGrid size={20} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">
                            Collections
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold font-serif italic text-black tracking-tight">
                        Khám phá danh mục
                    </h1>

                    <div className="w-16 h-1 bg-[#b72828] mx-auto rounded-full"></div>

                    <p className="text-gray-500 text-sm max-w-lg mx-auto pt-2 italic">
                        Tuyển chọn những tinh hoa làm đẹp
                        và chăm sóc sức khỏe tốt nhất
                        từ các phòng thí nghiệm hàng
                        đầu tại Pháp.
                    </p>
                </header>

                {/* CÂY DANH MỤC */}
                {rootCategories.length > 0 ? (
                    <div className="space-y-6">
                        {rootCategories.map((rootCategory) => {
                            const children = getCategoryChildren(rootCategory.id, allCategories)

                            return (
                                <section
                                    key={rootCategory.id}
                                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
                                >
                                    <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b72828]">
                                                Nhóm danh mục
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-gray-950 md:text-2xl">
                                                <Link
                                                    href={`/categories/${rootCategory.slug}`}
                                                    className="transition hover:text-[#b72828]"
                                                >
                                                    {rootCategory.name}
                                                </Link>
                                            </h2>

                                            {'productCount' in rootCategory ? (
                                                <p className="mt-1 text-xs font-semibold text-gray-500">
                                                    {Number((rootCategory as any).productCount || 0).toLocaleString('vi-VN')}{' '}
                                                    sản phẩm
                                                </p>
                                            ) : null}
                                        </div>

                                        <Link
                                            href={`/categories/${rootCategory.slug}`}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 transition hover:text-[#b72828]"
                                        >
                                            Xem nhóm này
                                            <ChevronRight size={14} />
                                        </Link>
                                    </div>

                                    {children.length > 0 ? (
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {children.map((child) => {
                                                const grandchildren = getCategoryChildren(
                                                    child.id,
                                                    allCategories,
                                                ).slice(0, 5)

                                                return (
                                                    <Link
                                                        key={child.id}
                                                        href={`/categories/${child.slug}`}
                                                        className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-[#f0b3ad] hover:bg-[#fff8f7]"
                                                    >
                                                        <h3 className="text-sm font-black text-gray-900">
                                                            {child.name}
                                                        </h3>

                                                        {'productCount' in child ? (
                                                            <p className="mt-1 text-[11px] font-semibold text-gray-500">
                                                                {Number((child as any).productCount || 0).toLocaleString('vi-VN')}{' '}
                                                                sản phẩm
                                                            </p>
                                                        ) : null}

                                                        {grandchildren.length > 0 ? (
                                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                                {grandchildren.map((grandchild) => (
                                                                    <span
                                                                        key={grandchild.id}
                                                                        className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                                                                    >
                                                                        {grandchild.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm text-gray-500">
                                            Chưa có danh mục con.
                                        </p>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
                        Chưa có danh mục nào.
                    </div>
                )}

                {/* PHÂN TRANG */}

                {/* FOOTER TRANG DANH MỤC */}
                <div className="mt-20 p-10 bg-white rounded-[3rem] border border-white shadow-sm text-center space-y-6">
                    <h4 className="text-xl font-bold font-heading text-black">
                        Bạn cần tìm sản phẩm chuyên biệt?
                    </h4>

                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Đội ngũ chuyên gia của MF Paris
                        luôn sẵn sàng tư vấn lộ trình
                        chăm sóc da và mùi hương
                        phù hợp nhất với bạn.
                    </p>

                    <Link
                        href="/contact"
                        className="inline-block px-10 py-4 bg-black text-white rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#b72828] transition-all shadow-lg active:scale-95"
                    >
                        Liên hệ tư vấn ngay
                    </Link>
                </div>
            </div>
        </div>
    )
}
