export type DeliveryMethod = 'home_delivery' | 'store_pickup'

export const FLAT_SHIPPING_FEE = 19000
export const HCM_FREE_SHIPPING_THRESHOLD = 299000
export const OTHER_PROVINCE_FREE_SHIPPING_THRESHOLD = 499000

export const VIETNAM_PROVINCES = [
    'Thành phố Hà Nội',
    'Thành phố Hồ Chí Minh',
    'Thành phố Hải Phòng',
    'Thành phố Đà Nẵng',
    'Thành phố Cần Thơ',
    'Tỉnh An Giang',
    'Tỉnh Bà Rịa - Vũng Tàu',
    'Tỉnh Bắc Giang',
    'Tỉnh Bắc Kạn',
    'Tỉnh Bạc Liêu',
    'Tỉnh Bắc Ninh',
    'Tỉnh Bến Tre',
    'Tỉnh Bình Định',
    'Tỉnh Bình Dương',
    'Tỉnh Bình Phước',
    'Tỉnh Bình Thuận',
    'Tỉnh Cà Mau',
    'Tỉnh Cao Bằng',
    'Tỉnh Đắk Lắk',
    'Tỉnh Đắk Nông',
    'Tỉnh Điện Biên',
    'Tỉnh Đồng Nai',
    'Tỉnh Đồng Tháp',
    'Tỉnh Gia Lai',
    'Tỉnh Hà Giang',
    'Tỉnh Hà Nam',
    'Tỉnh Hà Tĩnh',
    'Tỉnh Hải Dương',
    'Tỉnh Hậu Giang',
    'Tỉnh Hòa Bình',
    'Tỉnh Hưng Yên',
    'Tỉnh Khánh Hòa',
    'Tỉnh Kiên Giang',
    'Tỉnh Kon Tum',
    'Tỉnh Lai Châu',
    'Tỉnh Lâm Đồng',
    'Tỉnh Lạng Sơn',
    'Tỉnh Lào Cai',
    'Tỉnh Long An',
    'Tỉnh Nam Định',
    'Tỉnh Nghệ An',
    'Tỉnh Ninh Bình',
    'Tỉnh Ninh Thuận',
    'Tỉnh Phú Thọ',
    'Tỉnh Phú Yên',
    'Tỉnh Quảng Bình',
    'Tỉnh Quảng Nam',
    'Tỉnh Quảng Ngãi',
    'Tỉnh Quảng Ninh',
    'Tỉnh Quảng Trị',
    'Tỉnh Sóc Trăng',
    'Tỉnh Sơn La',
    'Tỉnh Tây Ninh',
    'Tỉnh Thái Bình',
    'Tỉnh Thái Nguyên',
    'Tỉnh Thanh Hóa',
    'Tỉnh Thừa Thiên Huế',
    'Tỉnh Tiền Giang',
    'Tỉnh Trà Vinh',
    'Tỉnh Tuyên Quang',
    'Tỉnh Vĩnh Long',
    'Tỉnh Vĩnh Phúc',
    'Tỉnh Yên Bái',
] as const

const normalizeProvince = (value: string) =>
    value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.\s]+/g, ' ')

export const isHoChiMinhCity = (province: string) => {
    const value = normalizeProvince(province)
    return ['thanh pho ho chi minh', 'tp ho chi minh', 'ho chi minh', 'hcm', 'tphcm'].includes(value)
}

export const isKnownProvince = (province: string) =>
    VIETNAM_PROVINCES.some((item) => normalizeProvince(item) === normalizeProvince(province))

export const normalizeDeliveryMethod = (value: unknown): DeliveryMethod =>
    value === 'store_pickup' ? 'store_pickup' : 'home_delivery'

export function calculateShippingFee(params: {
    subtotalAmount: number
    province: string
    deliveryMethod: DeliveryMethod
}) {
    if (params.deliveryMethod === 'store_pickup') return 0

    if (isHoChiMinhCity(params.province)) {
        return params.subtotalAmount >= HCM_FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE
    }

    return params.subtotalAmount >= OTHER_PROVINCE_FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE
}

export const getFreeShippingThreshold = ({
    province,
    deliveryMethod,
}: {
    province: string
    deliveryMethod: DeliveryMethod
}): number | null => {
    if (deliveryMethod === 'store_pickup') {
        return null
    }

    return isHoChiMinhCity(province)
        ? HCM_FREE_SHIPPING_THRESHOLD
        : OTHER_PROVINCE_FREE_SHIPPING_THRESHOLD
}