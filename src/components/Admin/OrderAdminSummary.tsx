'use client'

import React, { useEffect, useState } from 'react'

type MediaLike = {
  url?: string | null
  thumbnailURL?: string | null
  sizes?: Record<string, { url?: string | null } | null> | null
}

type ProductLike = {
  id?: string | number
  title?: string | null
  images?: Array<{ image?: MediaLike | string | number | null } | null> | null
  featuredImage?: MediaLike | string | number | null
}

type OrderItem = {
  product?: ProductLike | string | number | null
  productTitleSnapshot?: string | null
  variantNameSnapshot?: string | null
  skuSnapshot?: string | null
  quantity?: number | null
  priceAtPurchase?: number | null
}

type OrderDoc = {
  id?: string | number
  status?: string | null
  paymentMethod?: string | null
  paymentStatus?: string | null
  deliveryMethod?: string | null
  customerInfo?: {
    fullName?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    ward?: string | null
    district?: string | null
    province?: string | null
  } | null
  items?: OrderItem[] | null
  subtotalAmount?: number | null
  discountAmount?: number | null
  shippingFee?: number | null
  totalAmount?: number | null
  voucherCode?: string | null
  fundiin?: {
    transactionId?: string | null
    paymentStatus?: string | null
  } | null
}

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  currency: 'VND',
  maximumFractionDigits: 0,
  style: 'currency',
})

const statusLabels: Record<string, string> = {
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  confirmed: 'Đã xác nhận',
  failed: 'Thanh toán thất bại',
  pending: 'Chờ xử lý',
  shipping: 'Đang giao',
}

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: 'Chuyển khoản',
  cod: 'COD',
  fundiin: 'Fundiin',
}

const paymentStatusLabels: Record<string, string> = {
  failed: 'Thất bại',
  paid: 'Đã thanh toán',
  pending: 'Chờ xác nhận',
  refunded: 'Đã hoàn tiền',
  unpaid: 'Chưa thanh toán',
}

const deliveryMethodLabels: Record<string, string> = {
  home_delivery: 'Giao tận nơi',
  store_pickup: 'Nhận tại cửa hàng',
}

function formatMoney(value: unknown): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0

  return moneyFormatter.format(amount)
}

function getOrderIDFromURL(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const match = window.location.pathname.match(/\/collections\/orders\/([^/?#]+)/)

  return match?.[1] ?? ''
}

function getProductTitle(item: OrderItem): string {
  if (item.productTitleSnapshot) {
    return item.productTitleSnapshot
  }

  if (item.product && typeof item.product === 'object' && item.product.title) {
    return item.product.title
  }

  return 'Sản phẩm'
}

function getImageURL(item: OrderItem): string {
  if (!item.product || typeof item.product !== 'object') {
    return ''
  }

  const image = item.product.featuredImage

  if (image && typeof image === 'object') {
    return image.url || image.thumbnailURL || image.sizes?.thumbnail?.url || ''
  }

  const galleryImage = item.product.images?.find((entry) => {
    return entry?.image && typeof entry.image === 'object'
  })?.image

  if (galleryImage && typeof galleryImage === 'object') {
    return galleryImage.url || galleryImage.thumbnailURL || galleryImage.sizes?.thumbnail?.url || ''
  }

  return ''
}

function getAddress(order: OrderDoc): string {
  const info = order.customerInfo

  return [info?.address, info?.ward, info?.district, info?.province]
    .filter(Boolean)
    .join(', ')
}

export function OrderAdminSummary() {
  const [orderID, setOrderID] = useState('')
  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setOrderID(getOrderIDFromURL())
  }, [])

  useEffect(() => {
    if (!orderID) {
      return
    }

    let isMounted = true

    async function loadOrder() {
      try {
        setIsLoading(true)
        setError('')

        const response = await fetch(`/api/orders/${orderID}?depth=2`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Không tải được dữ liệu đơn hàng.')
        }

        const data = (await response.json()) as OrderDoc

        if (isMounted) {
          setOrder(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu đơn hàng.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOrder()

    return () => {
      isMounted = false
    }
  }, [orderID])

  if (!orderID) {
    return (
      <div className="order-admin-summary">
        <div className="order-admin-summary__empty">
          Tổng kết đơn hàng sẽ hiển thị sau khi đơn được lưu.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="order-admin-summary">
        <div className="order-admin-summary__empty">Đang tải tổng kết đơn hàng...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="order-admin-summary">
        <div className="order-admin-summary__empty order-admin-summary__empty--error">
          {error || 'Không tìm thấy đơn hàng.'}
        </div>
      </div>
    )
  }

  const items = order.items || []
  const itemCount = items.reduce((total, item) => total + (item.quantity || 0), 0)
  const computedSubtotal = items.reduce((total, item) => {
    const quantity = item.quantity || 0
    const price = item.priceAtPurchase || 0

    return total + quantity * price
  }, 0)
  const subtotal = order.subtotalAmount ?? computedSubtotal
  const discount = order.discountAmount || 0
  const shippingFee = order.shippingFee || 0
  const total = order.totalAmount ?? Math.max(0, subtotal - discount + shippingFee)
  const customerInfo = order.customerInfo

  return (
    <section className="order-admin-summary" aria-label="Tổng kết đơn hàng">
      <div className="order-admin-summary__header">
        <div>
          <div className="order-admin-summary__eyebrow">Tổng kết đơn hàng</div>
          <div className="order-admin-summary__title">Đơn #{order.id}</div>
        </div>

        <div className="order-admin-summary__badges">
          <span className={`order-admin-summary__badge order-admin-summary__badge--${order.status || 'pending'}`}>
            {statusLabels[order.status || ''] || order.status || 'Chờ xử lý'}
          </span>
          <span className={`order-admin-summary__badge order-admin-summary__badge--payment-${order.paymentStatus || 'unpaid'}`}>
            {paymentStatusLabels[order.paymentStatus || ''] || order.paymentStatus || 'Chưa thanh toán'}
          </span>
        </div>
      </div>

      <div className="order-admin-summary__grid">
        <div className="order-admin-summary__panel">
          <div className="order-admin-summary__label">Khách hàng</div>
          <div className="order-admin-summary__strong">{customerInfo?.fullName || 'Chưa có tên'}</div>
          <div>{customerInfo?.phone || 'Chưa có số điện thoại'}</div>
          {customerInfo?.email ? <div>{customerInfo.email}</div> : null}
          <div className="order-admin-summary__muted">{getAddress(order) || 'Chưa có địa chỉ'}</div>
        </div>

        <div className="order-admin-summary__panel">
          <div className="order-admin-summary__label">Thanh toán và giao hàng</div>
          <div>
            <span className="order-admin-summary__muted">Phương thức: </span>
            <strong>{paymentMethodLabels[order.paymentMethod || ''] || order.paymentMethod || 'Chưa chọn'}</strong>
          </div>
          <div>
            <span className="order-admin-summary__muted">Nhận hàng: </span>
            <strong>{deliveryMethodLabels[order.deliveryMethod || ''] || order.deliveryMethod || 'Chưa chọn'}</strong>
          </div>
          {order.voucherCode ? (
            <div>
              <span className="order-admin-summary__muted">Voucher: </span>
              <strong>{order.voucherCode}</strong>
            </div>
          ) : null}
          {order.fundiin?.transactionId ? (
            <div>
              <span className="order-admin-summary__muted">Fundiin: </span>
              <strong>{order.fundiin.transactionId}</strong>
            </div>
          ) : null}
        </div>

        <div className="order-admin-summary__panel order-admin-summary__panel--total">
          <div className="order-admin-summary__label">Tổng tiền</div>
          <div className="order-admin-summary__total">{formatMoney(total)}</div>
          <div className="order-admin-summary__muted">{itemCount} sản phẩm trong đơn</div>
        </div>
      </div>

      <div className="order-admin-summary__items">
        <div className="order-admin-summary__items-head">
          <span>Sản phẩm</span>
          <span>SL</span>
          <span>Đơn giá</span>
          <span>Thành tiền</span>
        </div>

        {items.map((item, index) => {
          const quantity = item.quantity || 0
          const price = item.priceAtPurchase || 0
          const imageURL = getImageURL(item)

          return (
            <div className="order-admin-summary__item" key={`${getProductTitle(item)}-${index}`}>
              <div className="order-admin-summary__product">
                <div className="order-admin-summary__thumb">
                  {imageURL ? <img alt="" src={imageURL} /> : <span>MF</span>}
                </div>
                <div>
                  <div className="order-admin-summary__product-name">{getProductTitle(item)}</div>
                  <div className="order-admin-summary__product-meta">
                    {item.variantNameSnapshot ? <span>{item.variantNameSnapshot}</span> : null}
                    {item.skuSnapshot ? <span>SKU: {item.skuSnapshot}</span> : null}
                  </div>
                </div>
              </div>

              <div className="order-admin-summary__cell order-admin-summary__cell--quantity">x{quantity}</div>
              <div className="order-admin-summary__cell">{formatMoney(price)}</div>
              <div className="order-admin-summary__cell order-admin-summary__cell--line-total">
                {formatMoney(quantity * price)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="order-admin-summary__totals">
        <div>
          <span>Tạm tính</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
        <div>
          <span>Giảm giá</span>
          <strong>-{formatMoney(discount)}</strong>
        </div>
        <div>
          <span>Phí vận chuyển</span>
          <strong>{formatMoney(shippingFee)}</strong>
        </div>
        <div className="order-admin-summary__grand-total">
          <span>Tổng thanh toán</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
    </section>
  )
}
