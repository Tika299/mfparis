import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import {
    ExternalLink,
    MapPin,
    MessageCircleMore,
    Star,
} from 'lucide-react'

export async function GoogleReviews() {
    const payload = await getPayload({
        config: configPromise,
    })

    const settings = await payload.findGlobal({
        slug: 'site-settings',
        depth: 0,
    })

    const address =
        settings.contact?.address?.trim() ?? ''

    const googleMapsUrl =
        settings.contact?.googleMapUrl?.trim() ?? ''

    return (
        <section
            className="container-ux mt-8 pb-8 md:mt-10 md:pb-10"
            aria-labelledby="google-reviews-heading"
        >
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#8f1717] via-primary to-[#cf3939] px-5 py-8 text-white shadow-sm sm:px-8 md:rounded-[2.5rem] md:px-10 md:py-10 lg:px-12">
                {/* Trang trí nền */}
                <div
                    aria-hidden="true"
                    className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
                />

                <div
                    aria-hidden="true"
                    className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-black/10 blur-3xl"
                />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    {/* Nội dung */}
                    <div className="max-w-2xl">
                        <div className="mb-4 flex items-center gap-2">
                            <MessageCircleMore
                                aria-hidden="true"
                                size={18}
                                className="text-yellow-300"
                            />

                            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100 sm:text-[11px]">
                                Đánh giá từ khách hàng
                            </span>
                        </div>

                        <h2
                            id="google-reviews-heading"
                            className="font-heading text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl"
                            style={{ color: '#ffffff !important' }}
                        >
                            Trải nghiệm thực tế từ khách hàng của
                            Marais de France
                        </h2>

                        {/* Sao đánh giá */}
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                                {Array.from(
                                    { length: 5 },
                                    (_, index) => (
                                        <Star
                                            key={index}
                                            aria-hidden="true"
                                            size={20}
                                            strokeWidth={1.8}
                                            fill="currentColor"
                                            className="text-yellow-300"
                                        />
                                    ),
                                )}
                            </div>

                            <span className="text-sm font-semibold text-red-50">
                                Đánh giá trên Google
                            </span>
                        </div>

                        <p className="mt-5 max-w-xl text-sm font-normal leading-7 text-red-50 sm:text-[15px]">
                            Xem cảm nhận của khách hàng về chất lượng sản
                            phẩm, tư vấn, đóng gói và dịch vụ chăm sóc tại
                            Marais de France.
                        </p>

                        {/* Địa chỉ lấy từ Site Settings */}
                        {address ? (
                            <div className="mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <MapPin
                                    aria-hidden="true"
                                    size={18}
                                    className="mt-0.5 shrink-0 text-yellow-300"
                                />

                                <p className="text-xs leading-5 text-red-50 sm:text-sm">
                                    {address}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* Nút Google Maps */}
                    {googleMapsUrl ? (
                        <Link
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Xem Marais de France trên Google Maps tại ${address}`}
                            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:w-auto"
                        >
                            Xem trên Google Maps

                            <ExternalLink
                                aria-hidden="true"
                                size={17}
                            />
                        </Link>
                    ) : (
                        <div className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-center text-xs font-medium text-red-50">
                            Địa chỉ cửa hàng đang được cập nhật
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}