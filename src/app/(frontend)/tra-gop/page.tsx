import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react'
import { OptimizedImage } from '@/components/OptimizedImage'
import { formatPrice } from '@/utilities/formatPrice'

export const metadata: Metadata = {
  title: 'Tính trả góp Fundiin | Marais de France',
  description:
    'Bảng tính trả góp 0% qua Fundiin cho sản phẩm tại Marais de France.',
  robots: {
    index: false,
    follow: false,
  },
}

type SearchParams = {
  product_id?: string
  productId?: string
  variant_id?: string
  variation_id?: string
  quantity?: string
  slug?: string
}

type PageProps = {
  searchParams?: Promise<SearchParams>
}

const toPositiveNumber = (value: unknown, fallback = 0) => {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : fallback
}

const getUpload = (media: any) => {
  if (!media || typeof media !== 'object') return null

  return media
}

const getProductImage = (product: any, variant: any) => {
  const productImage = getUpload(product?.images?.[0]?.image)

  if (productImage) return productImage

  return getUpload(variant?.image)
}

const getBrandName = (product: any) => {
  const brand = product?.brand

  if (brand && typeof brand === 'object') return brand.name || brand.title || ''

  return ''
}

const getFinalPrice = (product: any, variant: any) => {
  const isVariable = product?.productType === 'variable' && variant

  const basePrice = isVariable
    ? toPositiveNumber(variant?.basePrice)
    : toPositiveNumber(product?.price?.basePrice)

  const salePrice = isVariable
    ? toPositiveNumber(variant?.salePrice)
    : toPositiveNumber(product?.price?.salePrice)

  return salePrice > 0 ? salePrice : basePrice
}

async function findProduct(params: SearchParams) {
  const payload = await getPayload({ config: configPromise })
  const productId = params.product_id || params.productId
  const variationId = params.variation_id || params.variant_id

  if (productId && /^\d+$/.test(productId)) {
    try {
      return await payload.findByID({
        collection: 'products',
        id: Number(productId),
        depth: 2,
        overrideAccess: true,
      })
    } catch {
      return null
    }
  }

  if (params.slug) {
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 1,
      overrideAccess: true,
      where: {
        slug: {
          equals: params.slug,
        },
      },
    })

    if (result.docs[0]) return result.docs[0]
  }

  if (variationId && /^\d+$/.test(variationId)) {
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 1,
      overrideAccess: true,
      where: {
        'variants.wpVariationId': {
          equals: Number(variationId),
        },
      },
    })

    if (result.docs[0]) return result.docs[0]
  }

  return null
}

const findVariant = (product: any, params: SearchParams) => {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const variantId = params.variant_id
  const variationId = params.variation_id

  if (!variants.length) return null

  return (
    variants.find((variant: any) => String(variant?.id) === String(variantId)) ||
    variants.find((variant: any) => String(variant?.wpVariationId) === String(variationId)) ||
    variants.find((variant: any) => variant?.isDefault) ||
    variants[0]
  )
}

export default async function FundiinInstallmentPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}
  const product = await findProduct(params)

  if (!product) notFound()

  const variant = findVariant(product, params)
  const quantity = Math.max(1, Math.floor(toPositiveNumber(params.quantity, 1)))
  const unitPrice = getFinalPrice(product, variant)

  if (unitPrice <= 0) notFound()

  const productTotal = unitPrice * quantity
  const months = 3
  const monthlyPayment = Math.ceil(productTotal / months)
  const downPayment = monthlyPayment
  const difference = 0
  const brandName = getBrandName(product)
  const productImage = getProductImage(product, variant)
  const productTitle = variant?.name
    ? `${product.title} - ${variant.name}`
    : product.title
  const productUrl = product?.slug ? `/products/${product.slug}` : '/products'

  const rows = [
    ['Công ty', 'Fundiin'],
    ['Giá sản phẩm', `${formatPrice(productTotal)} đ`],
    ['Giá mua trả góp', `${formatPrice(productTotal)} đ`],
    ['Trả trước', `${formatPrice(downPayment)} đ (33%)`],
    ['Lãi suất thực / tháng', '0%'],
    ['Giấy tờ cần có', 'CMND/CCCD + số điện thoại chính chủ'],
    ['Góp mỗi tháng', `${formatPrice(monthlyPayment)} đ`],
    ['Tổng tiền phải trả', `${formatPrice(productTotal)} đ`],
    ['Chênh lệch với mua trả thẳng', `${formatPrice(difference)} đ`],
  ]

  return (
    <main className="bg-[#f3f5f7] py-8 md:py-12">
      <div className="mx-auto w-full max-w-5xl px-4">
        <Link
          href={productUrl}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-[#b72828]"
        >
          <ArrowLeft size={16} />
          Quay lại sản phẩm
        </Link>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-6 border-b border-gray-200 p-5 md:grid-cols-[120px_1fr] md:p-8">
            <div className="relative h-32 w-32 overflow-hidden rounded-md border border-gray-100 bg-white md:h-36 md:w-28">
              {productImage ? (
                <OptimizedImage
                  media={productImage}
                  size="thumbnail"
                  alt={productTitle}
                  className="h-full w-full"
                  imageClassName="object-contain"
                  sizes="140px"
                />
              ) : (
                <div className="h-full w-full bg-gray-100" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm text-gray-500">Mua trả góp</p>
              <h1 className="mt-1 text-xl font-bold leading-snug text-[#1f4f91]">
                {productTitle}
              </h1>

              <div className="mt-2 text-lg font-black text-[#d4111e]">
                {formatPrice(productTotal)} đ
              </div>

              {brandName && (
                <p className="mt-2 text-sm text-gray-600">
                  Thương hiệu: <span className="font-semibold text-gray-900">{brandName}</span>
                </p>
              )}

              {quantity > 1 && (
                <p className="mt-1 text-sm text-gray-600">
                  Số lượng: <span className="font-semibold text-gray-900">{quantity}</span>
                </p>
              )}

              <p className="mt-2 text-sm text-gray-600">
                (*) Mã giảm giá không sử dụng cho gói trả sau 0%.
              </p>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
              <CreditCard size={18} className="text-[#00AEEF]" />
              Chọn hình thức trả:
            </div>

            <div className="inline-flex rounded-t-md border border-b-0 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900">
              3 tháng
            </div>

            <div className="overflow-hidden border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {rows.map(([label, value]) => (
                    <tr key={label} className="odd:bg-[#f1f1f1] even:bg-white">
                      <th className="w-[48%] border-b border-r border-gray-200 px-4 py-4 text-left font-medium text-gray-600">
                        {label}
                      </th>
                      <td className="border-b border-gray-200 px-4 py-4 font-semibold text-gray-700">
                        {label === 'Lãi suất thực / tháng' ? (
                          <span className="inline-flex rounded-sm bg-yellow-300 px-3 py-1 font-black text-red-600">
                            {value}
                          </span>
                        ) : ['Giá sản phẩm', 'Giá mua trả góp', 'Trả trước', 'Góp mỗi tháng', 'Tổng tiền phải trả'].includes(label) ? (
                          <span className="font-black text-[#d4111e]">{value}</span>
                        ) : (
                          value
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_260px] md:items-center">
              <div className="flex items-start gap-2 rounded-md bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <span>
                  Bảng tính chỉ dùng để tham khảo trước khi đặt hàng. Fundiin sẽ kiểm tra điều kiện thanh toán ở bước xác nhận.
                </span>
              </div>

              <Link
                href="/checkout?payment=fundiin&mode=single"
                className="inline-flex min-h-14 flex-col items-center justify-center rounded-sm bg-[#d4111e] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-black"
              >
                Đặt mua
                <span className="mt-1 text-xs font-semibold normal-case tracking-normal">
                  Kiểm tra Fundiin trước khi đặt hàng
                </span>
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Lãi suất 0%
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Trả trước khoảng 1/3 giá trị đơn hàng
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Thanh toán phần còn lại trong 3 tháng
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
