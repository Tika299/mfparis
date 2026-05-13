export const formatPrice = (price: number | undefined | null) => {
  if (typeof price !== 'number') return '0'
  return new Intl.NumberFormat('vi-VN').format(price)
}
