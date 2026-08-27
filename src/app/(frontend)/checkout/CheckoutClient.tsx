'use client'
import React, { useState, useEffect } from 'react'
import { useCartStore, type CartItem } from '@/lib/store'
import { formatPrice } from '@/utilities/formatPrice'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    ChevronLeft,
    Loader2,
    ShieldCheck,
    Truck,
    CreditCard,
    Store,
    Landmark,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { FundiinCheckoutElement } from '@/components/FundiinCheckoutElement'
import {
    calculateShippingFee,
    getFreeShippingThreshold,
    normalizeDeliveryMethod,
    VIETNAM_PROVINCES,
    type DeliveryMethod,
} from '@/lib/shipping'

type PaymentMethod = 'bank_transfer' | 'cod' | 'fundiin'

type ValidatedCheckoutItem = Readonly<{
    id: string | number
    productId?: string | number | null
    variantId?: string | null
    variantName?: string | null
    baseTitle?: string | null
    title?: string | null
    sku?: string | null
    image?: string | null
    quantity: number
    price?: number | null
    latestPrice?: number | null
    stock?: number | null
    latestStock?: number | null
    isAvailable?: boolean
    isOutOfStock?: boolean
    isContactPrice?: boolean
}>

type CartValidationResponse = Readonly<{
    items?: ValidatedCheckoutItem[]
    invalidItems?: ValidatedCheckoutItem[]
    error?: string
}>

export type BankTransferSettings = Readonly<{
    bankName?: string | null
    bankAccountName?: string | null
    bankAccountNumber?: string | null
    bankBranch?: string | null
    bankQrImageUrl?: string | null
}>

export default function CheckoutPage({
    bankTransfer,
    initialPaymentMethod = 'bank_transfer',
}: Readonly<{
    bankTransfer: BankTransferSettings
    initialPaymentMethod?: PaymentMethod
}>) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const checkoutMode = searchParams.get('mode')
    const isSelectedCheckout =
        checkoutMode === 'single' || checkoutMode === 'selection'
    const isSingleFundiinCheckout =
        initialPaymentMethod === 'fundiin' && checkoutMode === 'single'
    const [isClient, setIsClient] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedCheckoutItems, setSelectedCheckoutItems] =
        useState<CartItem[]>([])
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>(initialPaymentMethod)
    const isCodPayment = paymentMethod === 'cod'

    const handlePaymentMethodChange = (value: string) => {
        const nextPaymentMethod = value as PaymentMethod

        setPaymentMethod(nextPaymentMethod)

        if (nextPaymentMethod === 'cod') {
            setVoucherData(null)
            setVoucherCode('')
            toast.info(
                'Voucher không áp dụng cho thanh toán khi nhận hàng (COD).',
            )
        }
    }
    const [deliveryMethod, setDeliveryMethod] =
        useState<DeliveryMethod>('home_delivery')

    const [selectedProvince, setSelectedProvince] =
        useState('Thành phố Hồ Chí Minh')
    const [voucherCode, setVoucherCode] = useState('')
    const [voucherData, setVoucherData] = useState<any>(null)
    const [applyingVoucher, setApplyingVoucher] = useState(false)
    const syncItems = useCartStore((state: any) => state.syncItems)

    // Lấy dữ liệu từ Zustand Store
    const cartItems = useCartStore((state) => state.items)
    const clearCart = useCartStore((state) => state.clearCart)
    const removeItem = useCartStore((state) => state.removeItem)
    const items = isSelectedCheckout ? selectedCheckoutItems : cartItems
    const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

    const subtotalAmount = items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
    )

    const discountAmount = isCodPayment
        ? 0
        : Number(voucherData?.discountAmount || 0)

    const normalizedDeliveryMethod =
        normalizeDeliveryMethod(deliveryMethod)

    const shippingFee = calculateShippingFee({
        subtotalAmount,
        province: selectedProvince,
        deliveryMethod: normalizedDeliveryMethod,
    })

    const freeShippingThreshold = getFreeShippingThreshold({
        province: selectedProvince,
        deliveryMethod: normalizedDeliveryMethod,
    })

    const shippingDiscount =
        normalizedDeliveryMethod === 'store_pickup' || shippingFee === 0
            ? 19000
            : 0

    const finalTotalPrice = Math.max(
        0,
        subtotalAmount - discountAmount + shippingFee,
    )

    const invalidItems = items.filter((item: any) => {
        const stock = Number(item.stock || 0)
        const quantity = Number(item.quantity || 0)
        const price = Number(item.price || 0)

        return (
            item.isAvailable === false ||
            item.isOutOfStock === true ||
            item.isContactPrice === true ||
            stock <= 0 ||
            quantity > stock ||
            price <= 0
        )
    })

    const hasInvalidItems = invalidItems.length > 0
    const checkoutRecoveryUrl =
        isSelectedCheckout && items[0]?.slug
            ? `/products/${items[0].slug}`
            : '/cart'

    const clearSelectedCheckoutItems = (purchasedItems = items) => {
        window.localStorage.removeItem('mf-paris-checkout-items')
        window.localStorage.removeItem('mf-paris-fundiin-checkout-item')

        if (checkoutMode === 'selection') {
            purchasedItems.forEach((item) => {
                removeItem(item.id as string)
            })
        }

        setSelectedCheckoutItems([])
    }

    // Xử lý lỗi Hydration khi sử dụng LocalStorage
    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        if (!isSelectedCheckout) {
            setSelectedCheckoutItems([])
            return
        }

        try {
            const storedItems = window.localStorage.getItem(
                'mf-paris-checkout-items',
            )

            if (storedItems) {
                const parsedItems = JSON.parse(storedItems)
                const normalizedItems = Array.isArray(parsedItems)
                    ? parsedItems
                    : [parsedItems]

                setSelectedCheckoutItems(
                    normalizedItems
                        .filter((item) => item?.id && item?.title)
                        .map((item) => ({
                            ...item,
                            quantity: Math.max(1, Number(item.quantity || 1)),
                        })),
                )
                return
            }

            if (isSingleFundiinCheckout) {
                const legacyItem = window.localStorage.getItem(
                    'mf-paris-fundiin-checkout-item',
                )

                if (legacyItem) {
                    const parsedItem = JSON.parse(legacyItem) as CartItem

                    setSelectedCheckoutItems(
                        parsedItem?.id && parsedItem?.title
                            ? [{
                                ...parsedItem,
                                quantity: Math.max(1, Number(parsedItem.quantity || 1)),
                            }]
                            : [],
                    )
                    return
                }
            }

            setSelectedCheckoutItems([])
        } catch {
            setSelectedCheckoutItems([])
        }
    }, [isSelectedCheckout, isSingleFundiinCheckout])

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()

        if (items.length === 0) {
            return
        }

        /**
         * Phải đọc form ngay, trước câu lệnh await đầu tiên.
         * Không sử dụng event.currentTarget sau khi đã await.
         */
        const formElement = event.currentTarget
        const formData = new FormData(formElement)

        const fullName = String(
            formData.get('fullName') ?? '',
        ).trim()

        const phone = String(
            formData.get('phone') ?? '',
        ).trim()

        const email = String(
            formData.get('email') ?? '',
        ).trim()

        const isStorePickup =
            normalizedDeliveryMethod === 'store_pickup'

        const address = isStorePickup
            ? 'Nhận tại cửa hàng'
            : String(
                formData.get('address') ?? '',
            ).trim()

        const province = isStorePickup
            ? 'Nhận tại cửa hàng'
            : selectedProvince

        const district = String(
            formData.get('district') ?? '',
        ).trim()

        const ward = String(
            formData.get('ward') ?? '',
        ).trim()

        setLoading(true)

        try {
            const validateRes = await fetch(
                '/api/cart/validate',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    cache: 'no-store',
                    body: JSON.stringify({
                        items,
                    }),
                },
            )

            const validateData =
                (await validateRes.json()) as CartValidationResponse

            if (!validateRes.ok) {
                toast.error(
                    validateData.error ||
                    'Không thể kiểm tra tồn kho',
                )
                return
            }

            const validatedItems:
                ValidatedCheckoutItem[] =
                Array.isArray(
                    validateData.items,
                )
                    ? validateData.items
                    : []

            if (
                validatedItems.length === 0
            ) {
                toast.error(
                    'Giỏ hàng không hợp lệ',
                )
                router.push(checkoutRecoveryUrl)
                return
            }

            if (
                Array.isArray(
                    validateData.items,
                )
            ) {
                if (isSelectedCheckout) {
                    const nextItems = validateData.items as unknown as CartItem[]
                    setSelectedCheckoutItems(nextItems)
                    window.localStorage.setItem(
                        'mf-paris-checkout-items',
                        JSON.stringify(nextItems),
                    )
                } else {
                    syncItems(
                        validateData.items,
                    )
                }
            }

            if (
                Array.isArray(
                    validateData.invalidItems,
                ) &&
                validateData.invalidItems
                    .length > 0
            ) {
                toast.error(
                    'Một số sản phẩm đã hết hàng, vượt tồn kho hoặc cần liên hệ báo giá',
                )
                router.push(checkoutRecoveryUrl)
                return
            }

            const purchasableItems =
                validatedItems.filter(
                    (item) => {
                        const price = Number(
                            item.latestPrice ??
                            item.price ??
                            0,
                        )

                        const stock = Number(
                            item.latestStock ??
                            item.stock ??
                            0,
                        )

                        const quantity = Number(
                            item.quantity ?? 0,
                        )

                        return (
                            item.isAvailable !==
                            false &&
                            item.isOutOfStock !==
                            true &&
                            item.isContactPrice !==
                            true &&
                            price > 0 &&
                            stock > 0 &&
                            quantity > 0 &&
                            quantity <= stock
                        )
                    },
                )

            if (
                purchasableItems.length === 0
            ) {
                toast.error(
                    'Không có sản phẩm hợp lệ để thanh toán',
                )
                router.push(checkoutRecoveryUrl)
                return
            }

            const orderData = {
                fullName,
                phone,
                email: email || null,
                address,
                province,
                district:
                    district || null,
                ward: ward || null,

                items: purchasableItems.map(
                    (item) => ({
                        product:
                            item.productId ??
                            item.id,

                        variantId:
                            item.variantId ??
                            null,

                        quantity: Number(
                            item.quantity,
                        ),
                    }),
                ),

                deliveryMethod: normalizedDeliveryMethod,

                paymentMethod,

                voucherCode:
                    !isCodPayment && voucherData?.voucher?.code
                        ? voucherData.voucher.code
                        : null,

                shippingFee,
                totalAmount: finalTotalPrice,
            }

            const response = await fetch(
                '/api/create-order',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify(
                        orderData,
                    ),
                },
            )

            const responseData =
                (await response.json()) as {
                    id?: string | number
                    error?: string
                    message?: string
                }

            if (
                !response.ok ||
                responseData.id ===
                undefined
            ) {
                throw new Error(
                    responseData.error ||
                    responseData.message ||
                    'Không thể tạo đơn hàng',
                )
            }

            if (
                paymentMethod === 'fundiin'
            ) {
                const fundiinResponse =
                    await fetch(
                        '/api/payments/fundiin',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json',
                            },
                            body: JSON.stringify({
                                orderId:
                                    responseData.id,
                            }),
                        },
                    )

                const fundiinData =
                    (await fundiinResponse.json()) as {
                        paymentUrl?: string
                        message?: string
                        error?: string
                    }

                if (
                    fundiinResponse.ok &&
                    fundiinData.paymentUrl
                ) {
                    toast.success(
                        'Đang chuyển sang cổng thanh toán Fundiin...',
                    )

                    if (isSelectedCheckout) {
                        clearSelectedCheckoutItems(items)
                    } else {
                        clearCart()
                    }
                    window.location.href =
                        fundiinData.paymentUrl

                    return
                }

                throw new Error(
                    fundiinData.message ||
                    fundiinData.error ||
                    'Không thể khởi tạo thanh toán Fundiin',
                )
            }

            if (isSelectedCheckout) {
                clearSelectedCheckoutItems(items)
            } else {
                clearCart()
            }
            toast.success(
                'Đặt hàng thành công!',
            )
            router.push(
                '/checkout/success',
            )
        } catch (error: unknown) {
            console.error(
                '[Checkout] Create order failed:',
                error,
            )

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Có lỗi xảy ra, vui lòng thử lại!',
            )
        } finally {
            setLoading(false)
        }
    }

    // Áp dụng voucher code
    const handleApplyVoucher = async () => {
        try {
            if (isCodPayment) {
                setVoucherData(null)
                setVoucherCode('')
                toast.error(
                    'Voucher không áp dụng cho thanh toán khi nhận hàng (COD).',
                )
                return
            }
            if (!voucherCode.trim()) {
                toast.error('Vui lòng nhập mã voucher')
                return
            }

            setApplyingVoucher(true)

            const res = await fetch('/api/vouchers/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: voucherCode,
                    subtotalAmount,
                    paymentMethod,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setVoucherData(null)
                toast.error(data?.error || 'Không thể áp dụng voucher')
                return
            }

            setVoucherData(data)
            setVoucherCode(data?.voucher?.code || voucherCode.toUpperCase())
            toast.success('Đã áp dụng voucher')
        } catch (error) {
            console.error(error)
            toast.error('Không thể áp dụng voucher')
        } finally {
            setApplyingVoucher(false)
        }
    }

    if (!isClient) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]"><Loader2 className="animate-spin text-[#b72828]" /></div>
    if (items.length === 0) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF9] space-y-4">
            <h2 className="text-2xl font-serif italic text-gray-800">Giỏ hàng đang trống</h2>
            <Link href="/products" className="text-[#b72828] font-bold border-b border-[#b72828] pb-1 uppercase text-xs tracking-widest">Tiếp tục mua sắm</Link>
        </div>
    )

    return (
        <div className="bg-[#FDFBF9] min-h-screen pb-20 font-sans antialiased">
            <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-10">

                {/* Nút quay lại */}
                <Link href="/cart" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-10">
                    <ChevronLeft size={14} /> Quay lại giỏ hàng
                </Link>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* CỘT TRÁI: THÔNG TIN KHÁCH HÀNG */}
                    <div className="lg:col-span-7 space-y-10">
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-50">
                            <h2 className="text-2xl font-bold font-serif italic text-gray-900 mb-8">Thông tin giao hàng</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Họ và tên</Label>
                                    <Input id="fullName" name="fullName" placeholder="Nguyễn Văn A" required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Số điện thoại</Label>
                                    <Input id="phone" name="phone" type="tel" placeholder="0901234567" required className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email nhận thông tin đơn hàng</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="email"
                                        placeholder="email@example.com"
                                        className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="province" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tỉnh / Thành phố</Label>
                                    <select
                                        id="province"
                                        name="province"
                                        value={selectedProvince}
                                        onChange={(event) => setSelectedProvince(event.target.value)}
                                        disabled={deliveryMethod === 'store_pickup'}
                                        required={deliveryMethod !== 'store_pickup'}
                                        className="h-12 w-full rounded-xl border-none bg-gray-50 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#b72828]/20 disabled:cursor-not-allowed disabled:text-gray-400"
                                    >
                                        {VIETNAM_PROVINCES.map((province) => (
                                            <option key={province} value={province}>
                                                {province}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Địa chỉ cụ thể</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        placeholder="Số nhà, tên đường, phường..."
                                        required={deliveryMethod !== 'store_pickup'}
                                        disabled={deliveryMethod === 'store_pickup'}
                                        className="h-12 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#b72828]/20 disabled:cursor-not-allowed disabled:text-gray-400"
                                    />
                                    <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-50">
                                        <h2 className="text-2xl font-bold font-serif italic text-gray-900 mb-6">
                                            Hình thức nhận hàng
                                        </h2>

                                        <RadioGroup
                                            value={deliveryMethod}
                                            onValueChange={(value) =>
                                                setDeliveryMethod(normalizeDeliveryMethod(value))
                                            }
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            <Label
                                                htmlFor="home_delivery"
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer ${deliveryMethod === 'home_delivery'
                                                    ? 'border-[#b72828] bg-red-50/30'
                                                    : 'border-gray-50 bg-gray-50'
                                                    }`}
                                            >
                                                <RadioGroupItem value="home_delivery" id="home_delivery" />
                                                <Truck size={20} />
                                                <span className="text-sm font-bold">Giao hàng tận nơi</span>
                                            </Label>

                                            <Label
                                                htmlFor="store_pickup"
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer ${deliveryMethod === 'store_pickup'
                                                    ? 'border-[#b72828] bg-red-50/30'
                                                    : 'border-gray-50 bg-gray-50'
                                                    }`}
                                            >
                                                <RadioGroupItem value="store_pickup" id="store_pickup" />
                                                <Store size={20} />
                                                <span className="text-sm font-bold">Nhận tại cửa hàng</span>
                                            </Label>
                                        </RadioGroup>
                                    </section>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-gray-50">
                            <h2 className="text-xl font-bold text-gray-900 mb-8">Phương thức thanh toán</h2>
                            <RadioGroup
                                value={paymentMethod}
                                onValueChange={handlePaymentMethodChange}
                                className="space-y-4"
                            >
                                <div
                                    className={`rounded-2xl border-2 transition-all ${paymentMethod === 'bank_transfer'
                                        ? 'border-[#b72828] bg-red-50/30'
                                        : 'border-gray-50 bg-gray-50'
                                        }`}
                                >
                                    <Label
                                        htmlFor="bank_transfer"
                                        className="flex cursor-pointer items-center justify-between p-5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <RadioGroupItem
                                                value="bank_transfer"
                                                id="bank_transfer"
                                                className="text-[#b72828]"
                                            />

                                            <div>
                                                <p className="text-sm font-bold">
                                                    Chuyển khoản ngân hàng
                                                </p>
                                                <p className="text-[10px] uppercase tracking-tighter text-gray-400">
                                                    Quét QR hoặc chuyển khoản theo thông tin bên dưới
                                                </p>
                                            </div>
                                        </div>

                                        <Landmark size={20} className="text-gray-400" />
                                    </Label>

                                    {paymentMethod === 'bank_transfer' ? (
                                        <div className="grid gap-4 px-5 pb-5 md:grid-cols-[140px_1fr]">
                                            {bankTransfer.bankQrImageUrl ? (
                                                <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
                                                    <Image
                                                        src={bankTransfer.bankQrImageUrl}
                                                        alt="QR chuyển khoản MF Paris"
                                                        fill
                                                        sizes="140px"
                                                        className="object-contain p-2"
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-gray-700">
                                                <p>
                                                    <strong>Ngân hàng:</strong>{' '}
                                                    {bankTransfer.bankName || 'Admin cập nhật trong Site Settings'}
                                                </p>
                                                <p>
                                                    <strong>Chủ tài khoản:</strong>{' '}
                                                    {bankTransfer.bankAccountName || 'Admin cập nhật trong Site Settings'}
                                                </p>
                                                <p>
                                                    <strong>Số tài khoản:</strong>{' '}
                                                    {bankTransfer.bankAccountNumber || 'Admin cập nhật trong Site Settings'}
                                                </p>
                                                {bankTransfer.bankBranch ? (
                                                    <p>
                                                        <strong>Chi nhánh:</strong> {bankTransfer.bankBranch}
                                                    </p>
                                                ) : null}
                                                <p>
                                                    <strong>Nội dung:</strong> MF PARIS + số điện thoại đặt hàng
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                {/* Lựa chọn COD */}
                                <Label
                                    htmlFor="cod"
                                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-[#b72828] bg-red-50/30' : 'border-gray-50 bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <RadioGroupItem value="cod" id="cod" className="text-[#b72828]" />
                                        <div>
                                            <p className="font-bold text-sm">Thanh toán khi nhận hàng (COD)</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Bạn chỉ trả tiền khi đã nhận và kiểm tra hàng</p>
                                        </div>
                                    </div>
                                    <Truck size={20} className="text-gray-400" />
                                </Label>

                                {/* Lựa chọn FUNDIIN */}
                                <div
                                    className={`rounded-2xl border-2 transition-all ${paymentMethod === 'fundiin'
                                        ? 'border-[#b72828] bg-red-50/30'
                                        : 'border-gray-50 bg-gray-50'
                                        }`}
                                >
                                    <Label
                                        htmlFor="fundiin"
                                        className="flex cursor-pointer items-center justify-between p-5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <RadioGroupItem value="fundiin" id="fundiin" className="text-[#b72828]" />

                                            <div>
                                                <p
                                                    id="fundiin-payment-title"
                                                    className="flex items-center gap-2 text-sm font-bold"
                                                >
                                                    Mua trước trả sau với Fundiin
                                                    <span className="rounded-md bg-[#00AEEF]/10 px-2 py-0.5 text-[10px] font-black text-[#00AEEF]">
                                                        FUNDIIN
                                                    </span>
                                                </p>

                                                <p className="text-[10px] uppercase tracking-tighter text-gray-400">
                                                    Trả góp linh hoạt qua Fundiin
                                                </p>
                                            </div>
                                        </div>

                                        <CreditCard size={20} className="text-gray-400" />
                                    </Label>

                                    {paymentMethod === 'fundiin' && (
                                        <div className="px-5 pb-5">
                                            <FundiinCheckoutElement amount={finalTotalPrice} />
                                        </div>
                                    )}
                                </div>

                            </RadioGroup>
                        </section>
                    </div>

                    {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG (STICKY) */}
                    <div className="lg:col-span-5 sticky top-28">
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-gray-50 space-y-8">
                            <h2 className="text-xl font-bold font-serif italic border-b pb-6">Đơn hàng của bạn</h2>

                            {/* Danh sách sản phẩm rút gọn */}
                            <div className="space-y-6 max-h-[300px] overflow-y-auto no-scrollbar">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-center">
                                        <div className="w-16 h-16 relative bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                                            <img src={item.image} alt={item.title} className="object-contain p-2 w-full h-full" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h4 className="text-[13px] font-bold text-gray-800 truncate">{item.title}</h4>
                                            <p className="text-[11px] text-gray-400 uppercase font-medium">SL: {item.quantity}</p>
                                        </div>
                                        <div className="text-sm font-black text-[#16423C]">{formatPrice(item.price * item.quantity)}₫</div>
                                    </div>
                                ))}
                            </div>

                            {/* Tính toán tiền */}
                            <div className="space-y-4 pt-6 border-t border-dashed">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Tạm tính</span>
                                    <span className="font-bold text-gray-800">{formatPrice(totalPrice)}₫</span>
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-3">
                                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Mã voucher
                                    </p>

                                    <div className="flex gap-2">
                                        <Input
                                            value={voucherCode}
                                            disabled={isCodPayment}
                                            onChange={(event) => {
                                                setVoucherCode(event.target.value.toUpperCase())
                                                setVoucherData(null)
                                            }}
                                            placeholder={
                                                isCodPayment
                                                    ? 'COD không áp dụng voucher'
                                                    : 'Nhập mã giảm giá'
                                            }
                                            className="h-11 rounded-xl bg-white text-sm font-bold uppercase"
                                        />

                                        <Button
                                            type="button"
                                            onClick={handleApplyVoucher}
                                            disabled={isCodPayment || applyingVoucher || loading}
                                            className="h-11 shrink-0 rounded-xl bg-black px-4 text-[11px] font-black uppercase"
                                        >
                                            {applyingVoucher ? 'Đang áp dụng' : 'Áp dụng'}
                                        </Button>
                                    </div>

                                    {voucherData?.discountAmount > 0 && (
                                        <p className="mt-2 text-xs font-bold text-emerald-600">
                                            Đã giảm {formatPrice(voucherData.discountAmount)}₫
                                        </p>
                                    )}
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Voucher</span>
                                        <span className="font-bold text-emerald-600">
                                            -{formatPrice(discountAmount)}₫
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">
                                        Phí vận chuyển
                                    </span>

                                    <span
                                        className={
                                            shippingFee === 0
                                                ? 'font-bold text-green-600'
                                                : 'font-bold text-gray-800'
                                        }
                                    >
                                        {shippingFee === 0
                                            ? deliveryMethod === 'store_pickup'
                                                ? 'Nhận tại cửa hàng'
                                                : 'Freeship'
                                            : `${formatPrice(shippingFee)}₫`}
                                    </span>
                                </div>

                                {shippingFee > 0 && freeShippingThreshold ? (
                                    <div className="flex justify-end text-sm">
                                        <p className="text-xs font-bold text-red-500">
                                            Mua thêm{' '}
                                            {formatPrice(
                                                Math.max(
                                                    0,
                                                    freeShippingThreshold - subtotalAmount,
                                                ),
                                            )}
                                            ₫ để được miễn phí ship.
                                        </p>
                                    </div>
                                ) : null}

                                <div className="flex justify-between items-center pt-4">
                                    <span className="text-lg font-black uppercase tracking-widest text-[#b72828]">
                                        Tổng cộng
                                    </span>
                                    <span className="text-2xl font-black text-[#b72828] tracking-tighter">
                                        {formatPrice(finalTotalPrice)}₫
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || hasInvalidItems}
                                className="w-full h-16 bg-[#b72828] hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-red-100 transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                        Đang xử lý...
                                    </>
                                ) : paymentMethod === 'fundiin' ? (
                                    'Thanh toán qua Fundiin'
                                ) : (
                                    'Xác nhận đặt hàng'
                                )}
                            </Button>

                            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-tighter pt-4">
                                <ShieldCheck size={14} className="text-emerald-500" /> Bảo mật thanh toán 100%
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    )
}
